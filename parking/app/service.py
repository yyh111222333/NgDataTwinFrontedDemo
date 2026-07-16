from __future__ import annotations

import asyncio
import hashlib
import logging

import httpx

from .cameras import BaseCameraClient, CameraError, CameraRecord, create_camera_client
from .config import GATES, GateConfig, Settings
from .database import ParkingDatabase


logger = logging.getLogger(__name__)


class ParkingService:
    def __init__(self, settings: Settings, database: ParkingDatabase):
        self.settings = settings
        self.database = database
        self.gates = {gate.id: gate for gate in GATES}
        self.clients: dict[str, BaseCameraClient] = {
            gate.id: create_camera_client(gate, settings) for gate in GATES
        }
        self.tasks: list[asyncio.Task] = []
        self.sync_locks = {gate.id: asyncio.Lock() for gate in GATES}
        self.session_lock = asyncio.Lock()
        self.running = False

    async def start(self) -> None:
        self.running = True
        for index, gate in enumerate(GATES):
            self.tasks.append(asyncio.create_task(self._poll_loop(gate, index * 0.35)))

    async def stop(self) -> None:
        self.running = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        await asyncio.gather(*(client.close() for client in self.clients.values()))

    async def _poll_loop(self, gate: GateConfig, delay: float) -> None:
        await asyncio.sleep(delay)
        initial = True
        while self.running:
            try:
                lookback = (
                    self.settings.initial_lookback_seconds
                    if initial
                    else self.settings.regular_lookback_seconds
                )
                await self.sync_gate(gate.id, lookback)
                initial = False
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("gate sync failed: %s", gate.id)
                self.database.set_gate_status(gate.id, False, str(exc))
            await asyncio.sleep(self.settings.poll_interval_seconds)

    async def sync_gate(self, gate_id: str, lookback_seconds: int | None = None) -> int:
        gate = self.gates.get(gate_id)
        if gate is None:
            raise KeyError(gate_id)
        client = self.clients[gate_id]
        async with self.sync_locks[gate_id]:
            try:
                records = await client.poll_records(
                    lookback_seconds or self.settings.regular_lookback_seconds
                )
                inserted = 0
                for record in sorted(records, key=lambda item: item.captured_epoch):
                    if self.database.has_source_key(record.source_key):
                        continue
                    event_id = self.database.insert_event(self._event_payload(gate, record))
                    if event_id is None:
                        continue
                    inserted += 1
                    if record.image_ref:
                        try:
                            image = await client.fetch_image(record.image_ref)
                            relative_path = self._save_image(gate, record, image)
                            self.database.update_event_image(event_id, relative_path)
                        except Exception as exc:
                            logger.warning("image fetch failed for %s: %s", record.source_key, exc)
                if inserted:
                    async with self.session_lock:
                        self.database.rebuild_sessions()
                self.database.set_gate_status(gate_id, True)
                return inserted
            except (CameraError, httpx.HTTPError) as exc:
                self.database.set_gate_status(gate_id, False, str(exc))
                raise

    @staticmethod
    def _event_payload(gate: GateConfig, record: CameraRecord) -> dict:
        return {
            "source_key": record.source_key,
            "gate_id": gate.id,
            "plate": record.plate,
            "plate_color": record.plate_color,
            "direction": gate.direction,
            "captured_at": record.captured_at,
            "captured_epoch": record.captured_epoch,
            "image_ref": record.image_ref,
            "source_payload": record.source_payload,
        }

    def _save_image(self, gate: GateConfig, record: CameraRecord, image: bytes) -> str:
        digest = hashlib.sha1(record.source_key.encode("utf-8")).hexdigest()
        directory = self.settings.data_dir / "images" / gate.id
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"{digest}.jpg"
        path.write_bytes(image)
        return str(path.relative_to(self.settings.data_dir))

    async def open_gate(self, gate_id: str) -> None:
        if gate_id not in self.clients:
            raise KeyError(gate_id)
        await self.clients[gate_id].open_gate()

    def gate_capabilities(self, gate_id: str) -> dict[str, bool]:
        client = self.clients[gate_id]
        return {"manual_open": client.supports_open_gate}
