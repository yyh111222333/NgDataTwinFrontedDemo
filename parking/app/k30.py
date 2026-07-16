from __future__ import annotations

import base64
import hashlib
import json
from datetime import datetime
from typing import Any
from urllib.parse import quote, unquote

import httpx
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

from .config import Settings


class K30Error(RuntimeError):
    pass


def k30_timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S%f")[:17]


def compact_json(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def build_k30_sign(parameters: dict[str, Any], app_secret: str) -> str:
    pairs = [
        f"{key}={parameters[key]}"
        for key in sorted(parameters)
        if parameters[key] is not None and str(parameters[key]) != ""
    ]
    source = "&".join(pairs) + f"&key={app_secret}"
    return hashlib.md5(source.encode("utf-8")).hexdigest()


def aes_encrypt(value: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    encrypted = cipher.encrypt(pad(value.encode("utf-8"), AES.block_size))
    return quote(base64.b64encode(encrypted).decode("ascii"), safe="")


def aes_decrypt(value: str, key: str, iv: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    decrypted = cipher.decrypt(base64.b64decode(unquote(value)))
    return unpad(decrypted, AES.block_size).decode("utf-8")


def strip_data_url(value: str) -> str:
    return value.split(",", 1)[1] if value.startswith("data:") and "," in value else value


def build_portal_person_model(
    payload: dict[str, Any], company_no: str, department_no: str, job_number: str
) -> dict[str, Any]:
    return {
        "Staff_No": "",
        "Staff_CompanyNo": company_no,
        "Staff_DepartmentNo": department_no,
        "Staff_JobNumber": job_number,
        "Staff_Role_No": "",
        "Staff_EntryDate": payload["valid_from"][:10],
        "Staff_Remark": f"进场预约：{payload.get('reason', '')}"[:255],
        "Staff_IsBeVisited": 0,
        "Staff_MWPwd": "",
        "Staff_PersonPwd": "",
        "People_Name": payload["name"],
        "People_Phone": payload.get("phone", ""),
        "People_Sex": payload.get("sex", 0),
        "People_IDCard": payload.get("id_card", ""),
        "People_ICCard": "",
        "People_StartDate": payload["valid_from"],
        "People_EffDate": payload["valid_until"],
        "People_Photo": payload.get("photo", ""),
        "People_IDCardPhoto": "",
        "People_Nation": "",
        "People_Native": "",
        "People_Residence": "",
    }


class K30Client:
    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def mode(self) -> str:
        credentials = (
            self.settings.k30_app_secret,
            self.settings.k30_aes_key,
            self.settings.k30_aes_iv,
        )
        return "openapi" if all(credentials) else "portal"

    def _validate_openapi_crypto(self) -> None:
        if len(self.settings.k30_aes_key.encode("utf-8")) not in {16, 24, 32}:
            raise K30Error("K30 AES 密钥长度必须为 16、24 或 32 字节")
        if len(self.settings.k30_aes_iv.encode("utf-8")) != 16:
            raise K30Error("K30 AES 偏移量必须为 16 字节")

    async def _openapi_request(self, path: str, data: dict[str, Any]) -> dict[str, Any]:
        self._validate_openapi_crypto()
        timestamp = k30_timestamp()
        plain_data = compact_json(data)
        signed = {
            "companyno": self.settings.k30_company_no,
            "data": plain_data,
            "timestamp": timestamp,
        }
        payload = {
            "companyno": self.settings.k30_company_no,
            "timestamp": timestamp,
            "data": aes_encrypt(
                plain_data, self.settings.k30_aes_key, self.settings.k30_aes_iv
            ),
            "sign": build_k30_sign(signed, self.settings.k30_app_secret),
        }
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                response = await client.post(
                    f"{self.settings.k30_openapi_base_url}{path}", json=payload
                )
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise K30Error(f"K30 OpenAPI 请求失败: {exc}") from exc
        if str(result.get("resultcode")) != "1":
            raise K30Error(result.get("msg") or "K30 OpenAPI 操作失败")
        encrypted_data = result.get("data")
        if encrypted_data:
            try:
                decoded = aes_decrypt(
                    str(encrypted_data), self.settings.k30_aes_key, self.settings.k30_aes_iv
                )
                result["decoded_data"] = json.loads(decoded) if decoded else {}
            except (ValueError, TypeError, json.JSONDecodeError):
                result["decoded_data"] = encrypted_data
        return result

    async def get_options(self) -> dict[str, Any]:
        params = {"Company_No": self.settings.k30_company_no}
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                departments_response = await client.get(
                    f"{self.settings.k30_portal_base_url}/DropDownList/SelectDepartment",
                    params=params,
                )
                devices_response = await client.get(
                    f"{self.settings.k30_portal_base_url}/DropDownList/SelectDevice",
                    params={"CompanyNo": self.settings.k30_company_no},
                )
                departments_response.raise_for_status()
                devices_response.raise_for_status()
                departments_result = departments_response.json()
                devices_result = devices_response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise K30Error(f"K30 平台连接失败: {exc}") from exc
        if not departments_result.get("Success"):
            raise K30Error(departments_result.get("Message") or "K30 部门列表读取失败")
        departments = [
            {"no": item["Department_No"], "name": item["Department_Name"]}
            for item in departments_result.get("Data", [])
        ]
        devices = [
            {"no": item["Device_No"], "name": item["Device_Name"]}
            for item in devices_result.get("Data", [])
        ] if devices_result.get("Success") else []
        return {
            "available": True,
            "mode": self.mode,
            "departments": departments,
            "devices": devices,
            "default_department_no": self.settings.k30_default_department_no,
        }

    async def create_person(self, payload: dict[str, Any]) -> dict[str, str]:
        department_no = (
            payload.get("department_no") or self.settings.k30_default_department_no
        )
        job_number = datetime.now().strftime("%y%m%d%H%M%S%f")[:19]
        if self.mode == "openapi":
            create_data = {
                "name": payload["name"],
                "deptno": department_no,
                "jobnumber": job_number,
                "phone": payload.get("phone", ""),
                "sex": str(payload.get("sex", 0)),
                "idcard": payload.get("id_card", ""),
                "startdate": payload["valid_from"],
                "effdate": payload["valid_until"],
                "photo": strip_data_url(payload.get("photo", "")),
            }
            created = await self._openapi_request("/openapi/people/Create", create_data)
            decoded = created.get("decoded_data")
            people_no = decoded.get("no", "") if isinstance(decoded, dict) else ""
            if not people_no:
                listing = await self._openapi_request(
                    "/openapi/people/getlist",
                    {"pageindex": 1, "pagesize": 20, "jobnumber": job_number},
                )
                listing_data = listing.get("decoded_data", {})
                rows = listing_data.get("data", []) if isinstance(listing_data, dict) else []
                people_no = rows[0].get("no", "") if rows else ""
            if not people_no:
                raise K30Error("人员已创建，但 K30 未返回人员编号，无法同步设备")
            sync_data: dict[str, str] = {"no": people_no}
            device_nos = payload.get("device_nos") or []
            if device_nos:
                sync_data["device_nos"] = ",".join(device_nos)
            else:
                sync_data["deptno"] = department_no
            await self._openapi_request("/openapi/people/syncwhitelist", sync_data)
            return {
                "external_id": people_no,
                "message": "K30 人员已创建并同步到门禁设备",
                "mode": "openapi",
            }

        model = build_portal_person_model(
            payload, self.settings.k30_company_no, department_no, job_number
        )
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    f"{self.settings.k30_portal_base_url}/Staff/AddStaff",
                    data={"jsonModel": compact_json(model)},
                )
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise K30Error(f"K30 人员预约下发失败: {exc}") from exc
        if not result.get("Success"):
            raise K30Error(result.get("Message") or "K30 人员创建失败")
        return {
            "external_id": str(result.get("Data") or job_number),
            "message": "K30 人员已创建并按部门权限下发",
            "mode": "portal",
        }
