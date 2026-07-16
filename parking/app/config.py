from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class GateConfig:
    id: str
    gate_no: int
    name: str
    direction: str
    ip: str
    adapter: str


GATES = (
    GateConfig("gate-07-in", 7, "7号门进", "in", "192.168.51.101", "oem_ipnc"),
    GateConfig("gate-07-out", 7, "7号门出", "out", "192.168.51.102", "oem_ipnc"),
    GateConfig("gate-08-in", 8, "8号门进", "in", "192.168.54.100", "oem_ipnc"),
    GateConfig("gate-08-out", 8, "8号门出", "out", "192.168.54.101", "oem_ipnc"),
    GateConfig("gate-09-in", 9, "9号门进", "in", "192.168.54.102", "signalway"),
    GateConfig("gate-09-out", 9, "9号门出", "out", "192.168.54.103", "signalway"),
    GateConfig("gate-10-in", 10, "10号门进", "in", "192.168.54.104", "oem_ipnc"),
    GateConfig("gate-10-out", 10, "10号门出", "out", "192.168.54.105", "oem_ipnc"),
    GateConfig("gate-11-in", 11, "11号门进", "in", "192.168.54.106", "signalway"),
    GateConfig("gate-11-out", 11, "11号门出", "out", "192.168.54.107", "signalway"),
)


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    camera_username: str
    camera_password: str
    admin_username: str
    admin_password: str
    auth_secret: str
    poll_interval_seconds: float
    request_timeout_seconds: float
    initial_lookback_seconds: int
    regular_lookback_seconds: int
    parking_capacity: int

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            data_dir=Path(os.getenv("PARKING_DATA_DIR", "/data")),
            camera_username=os.getenv("CAMERA_USERNAME", "admin"),
            camera_password=os.getenv("CAMERA_PASSWORD", "admin"),
            admin_username=os.getenv("PARKING_ADMIN_USERNAME", "admin"),
            admin_password=os.getenv("PARKING_ADMIN_PASSWORD", "change-me"),
            auth_secret=os.getenv("PARKING_AUTH_SECRET", "replace-this-secret"),
            poll_interval_seconds=float(os.getenv("PARKING_POLL_INTERVAL", "5")),
            request_timeout_seconds=float(os.getenv("CAMERA_REQUEST_TIMEOUT", "6")),
            initial_lookback_seconds=int(os.getenv("PARKING_INITIAL_LOOKBACK", "172800")),
            regular_lookback_seconds=int(os.getenv("PARKING_REGULAR_LOOKBACK", "600")),
            parking_capacity=int(os.getenv("PARKING_CAPACITY", "500")),
        )
