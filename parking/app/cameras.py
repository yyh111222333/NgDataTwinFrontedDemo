from __future__ import annotations

import base64
import html
import json
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from .config import GateConfig, Settings
from .crypto import legacy_aes_ctr_encrypt


PLATE_COLOR_NAMES = {
    "蓝": "blue",
    "黄": "yellow",
    "绿": "green",
    "白": "white",
    "黑": "black",
}
OEM_COLOR_CODES = {1: "blue", 2: "yellow", 3: "white", 4: "black", 5: "green"}


@dataclass(frozen=True)
class CameraRecord:
    source_key: str
    plate: str
    plate_color: str
    captured_at: str
    captured_epoch: int
    image_ref: str | None
    source_payload: str


def normalize_signalway_plate(value: str) -> tuple[str, str]:
    plate = value.strip()
    if not plate or "无车牌" in plate:
        return "无牌车", "unlicensed"
    color = PLATE_COLOR_NAMES.get(plate[0], "other")
    if plate[0] in PLATE_COLOR_NAMES:
        plate = plate[1:]
    return plate.upper(), color


class CameraError(RuntimeError):
    pass


class BaseCameraClient:
    supports_open_gate = False

    def __init__(self, gate: GateConfig, settings: Settings):
        self.gate = gate
        self.settings = settings
        self.client = httpx.AsyncClient(
            base_url=f"http://{gate.ip}",
            timeout=settings.request_timeout_seconds,
            follow_redirects=True,
        )
        self.logged_in = False

    async def close(self) -> None:
        await self.client.aclose()

    async def poll_records(self, lookback_seconds: int) -> list[CameraRecord]:
        raise NotImplementedError

    async def fetch_image(self, image_ref: str) -> bytes:
        raise NotImplementedError

    async def open_gate(self) -> None:
        raise CameraError("该相机暂不支持平台远程开闸")


class OemIpncClient(BaseCameraClient):
    async def login(self) -> None:
        encrypted = legacy_aes_ctr_encrypt(
            f"{self.settings.camera_username}:{self.settings.camera_password}", "天天"
        )
        response = await self.client.post(
            "/login.php",
            content=encrypted,
            headers={"current_time": str(int(time.time())), "response_type": "json"},
        )
        if response.text.strip() not in {"OK", '{"state":200}'}:
            raise CameraError(f"OEM相机登录失败: {response.text[:120]}")
        self.logged_in = True

    async def _request(self, payload: dict[str, Any], retry: bool = True) -> dict[str, Any]:
        if not self.logged_in:
            await self.login()
        response = await self.client.post(
            "/request.php",
            content=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            headers={"Content-Type": "text/plain;charset=UTF-8"},
        )
        try:
            data = response.json()
        except ValueError as exc:
            if retry:
                self.logged_in = False
                await self.login()
                return await self._request(payload, retry=False)
            raise CameraError(f"OEM相机响应异常: {response.text[:120]}") from exc
        if data.get("state") != 200 and data.get("state_code") != 200:
            if retry:
                self.logged_in = False
                await self.login()
                return await self._request(payload, retry=False)
            raise CameraError(data.get("err_msg") or "OEM相机请求失败")
        return data

    async def poll_records(self, lookback_seconds: int) -> list[CameraRecord]:
        now_epoch = int(time.time())
        wheres = [
            {"k": "recg_time", "o": "gte", "v": now_epoch - lookback_seconds},
            {"k": "recg_time", "o": "lte", "v": now_epoch + 300},
        ]
        where_value = base64.urlsafe_b64encode(
            json.dumps(wheres, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ).decode("ascii").rstrip("=")
        payload = {
            "module": "RECORD_SERVICE_MODULE",
            "type": "RECORD_DAO",
            "body": {
                "method": "query",
                "category": "pic_struct_v2",
                "params": {"page": 1, "size": 100, "wheres": where_value},
            },
        }
        data = await self._request(payload)
        result: list[CameraRecord] = []
        for row in data.get("body") or []:
            captured_epoch = int(row.get("recg_time") or 0)
            if not captured_epoch:
                continue
            captured_at = datetime.fromtimestamp(captured_epoch).strftime("%Y-%m-%d %H:%M:%S")
            plate = str(row.get("plate") or "").replace(",", " ").strip().upper()
            if not plate:
                plate = "无牌车"
            unique_id = (
                row.get("ng_img_id")
                or row.get("img_id")
                or row.get("id")
                or f"{captured_epoch}:{plate}"
            )
            result.append(
                CameraRecord(
                    source_key=f"oem:{self.gate.ip}:{unique_id}",
                    plate=plate,
                    plate_color=OEM_COLOR_CODES.get(int(row.get("color") or 0), "other"),
                    captured_at=captured_at,
                    captured_epoch=captured_epoch,
                    image_ref=str(row.get("img_id") or "") or None,
                    source_payload=json.dumps(row, ensure_ascii=False, separators=(",", ":")),
                )
            )
        return result

    async def fetch_image(self, image_ref: str) -> bytes:
        if not self.logged_in:
            await self.login()
        response = await self.client.get("/record_pic", params={"id": image_ref})
        response.raise_for_status()
        return response.content


class SignalwayClient(BaseCameraClient):
    supports_open_gate = True

    @staticmethod
    def _body(command: str, value: str, data_type: str, class_type: str) -> str:
        escaped = html.escape(value, quote=True)
        return (
            'XML[Value]=<?xml version="1.0" encoding="GB2312" standalone="yes"?>'
            f'<HvCmd ver="3.0"><CmdName Type="{data_type}" Class="{class_type}" '
            f'Value="{escaped}">{command}</CmdName></HvCmd>'
        )

    @staticmethod
    def _parse_command(text: str) -> tuple[str, str]:
        try:
            root = ET.fromstring(text)
            command = root.find(".//CmdName")
        except ET.ParseError as exc:
            raise CameraError(f"信路威相机XML响应异常: {text[:120]}") from exc
        if command is None:
            raise CameraError("信路威相机响应缺少命令结果")
        return command.attrib.get("RetCode", "-1"), command.attrib.get("RetMsg", "")

    async def _command(
        self,
        command: str,
        value: str = "",
        data_type: str = "CUSTOM",
        class_type: str = "GETTER",
    ) -> str:
        response = await self.client.post(
            f"/Signalway.fcgi?{command}",
            content=self._body(command, value, data_type, class_type),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        code, message = self._parse_command(response.text)
        if code != "0":
            raise CameraError(f"信路威命令{command}失败: {message}")
        return message.strip()

    async def login(self) -> None:
        value = (
            f"UserName=[{self.settings.camera_username}],"
            f"Password=[{self.settings.camera_password}]"
        )
        await self._command("DoLogin", value)
        self.logged_in = True

    async def poll_records(self, lookback_seconds: int) -> list[CameraRecord]:
        if not self.logged_in:
            await self.login()
        cutoff_epoch = int(time.time()) - lookback_seconds
        rows: list[dict[str, Any]] = []
        for offset in range(0, 250, 50):
            raw = await self._command("GetResultList", f"{offset},50")
            try:
                page = json.loads(raw).get("ResultList") or []
            except json.JSONDecodeError as exc:
                raise CameraError("信路威历史记录格式错误") from exc
            rows.extend(page)
            if len(page) < 50 or self._oldest_epoch(page) <= cutoff_epoch:
                break
        result: list[CameraRecord] = []
        for row in rows:
            time_value = str(row.get("time") or "")
            try:
                captured = datetime.strptime(time_value, "%Y-%m-%d %H:%M:%S:%f")
            except ValueError:
                continue
            if int(captured.timestamp()) < cutoff_epoch:
                continue
            plate, color = normalize_signalway_plate(str(row.get("plate") or ""))
            result.append(
                CameraRecord(
                    source_key=f"signalway:{self.gate.ip}:{time_value}:{plate}",
                    plate=plate,
                    plate_color=color,
                    captured_at=captured.strftime("%Y-%m-%d %H:%M:%S"),
                    captured_epoch=int(captured.timestamp()),
                    image_ref=f"{time_value},{row.get('plate') or ''}",
                    source_payload=json.dumps(row, ensure_ascii=False, separators=(",", ":")),
                )
            )
        return result

    @staticmethod
    def _oldest_epoch(rows: list[dict[str, Any]]) -> int:
        epochs: list[int] = []
        for row in rows:
            try:
                captured = datetime.strptime(str(row.get("time") or ""), "%Y-%m-%d %H:%M:%S:%f")
            except ValueError:
                continue
            epochs.append(int(captured.timestamp()))
        return min(epochs) if epochs else 0

    async def _get_image_path(self, detail_ref: str) -> str:
        raw = await self._command("GetResultDetail", detail_ref)
        try:
            return str(json.loads(raw).get("img_path") or "")
        except json.JSONDecodeError as exc:
            raise CameraError("信路威记录详情格式错误") from exc

    async def fetch_image(self, image_ref: str) -> bytes:
        image_path = await self._get_image_path(image_ref)
        if not image_path:
            raise CameraError("信路威记录没有抓拍图片")
        response = await self.client.get(f"/images/{image_path.lstrip('/')}")
        response.raise_for_status()
        return response.content

    async def open_gate(self) -> None:
        if not self.logged_in:
            await self.login()
        await self._command("TestOpenGate", "0", "INT", "SETTER")


def create_camera_client(gate: GateConfig, settings: Settings) -> BaseCameraClient:
    if gate.adapter == "oem_ipnc":
        return OemIpncClient(gate, settings)
    if gate.adapter == "signalway":
        return SignalwayClient(gate, settings)
    raise ValueError(f"未知相机适配器: {gate.adapter}")
