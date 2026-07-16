from __future__ import annotations

import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator

from .auth import TokenManager, require_user, require_user_or_query_token
from .cameras import CameraError
from .config import GATES, Settings
from .database import ParkingDatabase
from .k30 import K30Client, K30Error
from .service import ParkingService


class LoginRequest(BaseModel):
    username: str
    password: str


class VehicleInput(BaseModel):
    plate: str = Field(min_length=3, max_length=16)
    owner: str = Field(default="", max_length=40)
    department: str = Field(default="", max_length=80)
    phone: str = Field(default="", max_length=30)
    vehicle_type: str = Field(default="内部车辆", max_length=30)
    valid_from: str | None = None
    valid_until: str | None = None
    enabled: bool = True
    note: str = Field(default="", max_length=200)


def normalize_appointment_datetime(value: str) -> str:
    normalized = value.strip().replace("T", " ")
    if len(normalized) == 16:
        normalized += ":00"
    try:
        return datetime.strptime(normalized, "%Y-%m-%d %H:%M:%S").strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    except ValueError as exc:
        raise ValueError("许可时间格式应为 yyyy-MM-dd HH:mm:ss") from exc


class AppointmentPeriod(BaseModel):
    valid_from: str
    valid_until: str

    @model_validator(mode="after")
    def validate_period(self):
        self.valid_from = normalize_appointment_datetime(self.valid_from)
        self.valid_until = normalize_appointment_datetime(self.valid_until)
        if self.valid_until <= self.valid_from:
            raise ValueError("许可结束时间必须晚于开始时间")
        return self


class PersonAppointmentInput(AppointmentPeriod):
    name: str = Field(min_length=1, max_length=50)
    phone: str = Field(min_length=6, max_length=30)
    reason: str = Field(min_length=1, max_length=100)
    department_no: str = Field(default="", max_length=50)
    device_nos: list[str] = Field(default_factory=list, max_length=30)
    id_card: str = Field(default="", max_length=50)
    sex: Literal[0, 1, 2] = 0
    photo: str = Field(min_length=20, max_length=8_000_000)


class VehicleAppointmentInput(AppointmentPeriod):
    name: str = Field(min_length=1, max_length=50)
    phone: str = Field(min_length=6, max_length=30)
    plate: str = Field(min_length=3, max_length=16)
    reason: str = Field(min_length=1, max_length=100)


settings = Settings.from_env()
database = ParkingDatabase(settings.data_dir / "parking.sqlite3")
parking_service = ParkingService(settings, database)
k30_client = K30Client(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    database.initialize()
    database.sync_gates(GATES)
    database.rebuild_sessions()
    app.state.settings = settings
    app.state.database = database
    app.state.parking_service = parking_service
    app.state.k30_client = k30_client
    app.state.token_manager = TokenManager(settings)
    await parking_service.start()
    try:
        yield
    finally:
        await parking_service.stop()


app = FastAPI(title="南钢停车场管理服务", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"service": "南钢停车场管理服务", "ui": "/parking", "version": "1.0.0"}


@app.get("/health")
def health():
    gates = database.list_gates()
    return {
        "success": True,
        "service": "parking",
        "online_gates": sum(int(item["online"]) for item in gates),
        "total_gates": len(gates),
    }


@app.get("/api/public/stats")
def public_stats(start: str = "", end: str = ""):
    """Read-only aggregate data used by the main cockpit."""

    today = datetime.now().strftime("%Y-%m-%d")
    return database.get_stats(
        start or f"{today} 00:00:00",
        end or f"{today} 23:59:59",
        settings.parking_capacity,
    )


@app.get("/api/public/summary")
def public_summary():
    """Current vehicle presence used by the cockpit KPI polling."""

    return database.get_presence_summary(settings.parking_capacity)


@app.get("/api/public/events")
def public_events(limit: Annotated[int, Query(ge=1, le=100)] = 20):
    """Expose only the fields required to drive the 3D barrier animation."""

    items, total = database.list_events(limit=limit)
    fields = ("id", "source_key", "gate_id", "gate_no", "direction", "captured_at")
    return {
        "items": [{field: item.get(field) for field in fields} for item in items],
        "total": total,
    }


@app.get("/api/public/gates")
def public_gates():
    items = database.list_gates()
    for item in items:
        item["capabilities"] = parking_service.gate_capabilities(item["id"])
    return {"items": items, "total": len(items)}


@app.get("/api/public/appointments/options")
async def public_appointment_options():
    try:
        return await k30_client.get_options()
    except K30Error as exc:
        return {
            "available": False,
            "mode": k30_client.mode,
            "departments": [],
            "devices": [],
            "default_department_no": settings.k30_default_department_no,
            "message": str(exc),
        }


@app.get("/api/public/appointments")
def public_appointments(limit: Annotated[int, Query(ge=1, le=50)] = 10):
    items = database.list_appointments(limit)
    return {"items": items, "total": len(items)}


@app.post("/api/public/appointments/person", status_code=201)
async def create_person_appointment(payload: PersonAppointmentInput):
    values = payload.model_dump()
    appointment = database.create_appointment(
        {
            "appointment_type": "person",
            "subject_name": payload.name,
            "phone": payload.phone,
            "reason": payload.reason,
            "department_no": payload.department_no or settings.k30_default_department_no,
            "device_nos": payload.device_nos,
            "valid_from": payload.valid_from,
            "valid_until": payload.valid_until,
        }
    )
    try:
        result = await k30_client.create_person(values)
    except K30Error as exc:
        database.update_appointment_result(appointment["id"], "failed", str(exc))
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return database.update_appointment_result(
        appointment["id"], "active", result["message"], result["external_id"]
    )


@app.post("/api/public/appointments/vehicle", status_code=201)
def create_vehicle_appointment(payload: VehicleAppointmentInput):
    appointment = database.create_appointment(
        {
            "appointment_type": "vehicle",
            "subject_name": payload.name,
            "phone": payload.phone,
            "plate": payload.plate,
            "reason": payload.reason,
            "valid_from": payload.valid_from,
            "valid_until": payload.valid_until,
        }
    )
    try:
        vehicle = database.upsert_appointment_vehicle(
            {
                "plate": payload.plate,
                "owner": payload.name,
                "department": "预约车辆",
                "phone": payload.phone,
                "reason": payload.reason,
                "valid_from": payload.valid_from,
                "valid_until": payload.valid_until,
            }
        )
    except sqlite3.DatabaseError as exc:
        database.update_appointment_result(appointment["id"], "failed", str(exc))
        raise HTTPException(status_code=500, detail="车辆预约保存失败") from exc
    return database.update_appointment_result(
        appointment["id"], "active", "已写入停车场预约白名单", str(vehicle["id"])
    )


@app.get("/api/public/records")
def public_records(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    plate: str = "",
    gate_id: str = "",
    direction: Literal["", "in", "out"] = "",
    start: str = "",
    end: str = "",
):
    items, total = database.list_events(
        limit=limit,
        offset=offset,
        plate=plate.strip().upper(),
        gate_id=gate_id,
        direction=direction,
        start=start,
        end=end,
    )
    return {"items": items, "total": total}


@app.get("/api/public/sessions")
def public_sessions(
    session_status: Literal["open", "closed", "all"] = "open",
    limit: Annotated[int, Query(ge=1, le=1000)] = 200,
):
    items = database.list_sessions("" if session_status == "all" else session_status, limit)
    return {"items": items, "total": len(items)}


def image_response(event_id: int):
    event = database.get_event(event_id)
    if not event or not event.get("image_path"):
        raise HTTPException(status_code=404, detail="抓拍图片不存在")
    path = settings.data_dir / event["image_path"]
    try:
        path.resolve().relative_to(settings.data_dir.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="抓拍图片不存在") from exc
    if not path.is_file():
        raise HTTPException(status_code=404, detail="抓拍图片不存在")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


@app.get("/api/public/events/{event_id}/image")
def public_event_image(event_id: int):
    return image_response(event_id)


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request):
    current: Settings = request.app.state.settings
    if payload.username != current.admin_username or payload.password != current.admin_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    return {
        "token": request.app.state.token_manager.create(payload.username),
        "username": payload.username,
        "expires_in": 12 * 60 * 60,
    }


@app.get("/api/me")
def me(user: Annotated[str, Depends(require_user)]):
    return {"username": user}


@app.get("/api/gates")
def gates(_: Annotated[str, Depends(require_user)]):
    items = database.list_gates()
    for item in items:
        item["capabilities"] = parking_service.gate_capabilities(item["id"])
    return {"items": items, "total": len(items)}


@app.post("/api/gates/{gate_id}/sync")
async def sync_gate(gate_id: str, _: Annotated[str, Depends(require_user)]):
    try:
        inserted = await parking_service.sync_gate(gate_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="通道不存在") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"success": True, "inserted": inserted}


@app.post("/api/gates/{gate_id}/open")
async def open_gate(gate_id: str, _: Annotated[str, Depends(require_user)]):
    try:
        await parking_service.open_gate(gate_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="通道不存在") from exc
    except CameraError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"开闸失败: {exc}") from exc
    return {"success": True, "message": "开闸命令已发送"}


@app.get("/api/events")
def events(
    _: Annotated[str, Depends(require_user)],
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    plate: str = "",
    gate_id: str = "",
    direction: Literal["", "in", "out"] = "",
    start: str = "",
    end: str = "",
):
    items, total = database.list_events(
        limit=limit,
        offset=offset,
        plate=plate.strip().upper(),
        gate_id=gate_id,
        direction=direction,
        start=start,
        end=end,
    )
    return {"items": items, "total": total}


@app.get("/api/events/{event_id}/image")
def event_image(event_id: int, _: Annotated[str, Depends(require_user_or_query_token)]):
    return image_response(event_id)


@app.get("/api/sessions")
def sessions(
    _: Annotated[str, Depends(require_user)],
    session_status: Literal["open", "closed", "all"] = "open",
    limit: Annotated[int, Query(ge=1, le=1000)] = 200,
):
    items = database.list_sessions("" if session_status == "all" else session_status, limit)
    return {"items": items, "total": len(items)}


@app.get("/api/stats")
def stats(
    _: Annotated[str, Depends(require_user)],
    start: str = "",
    end: str = "",
):
    today = datetime.now().strftime("%Y-%m-%d")
    start_value = start or f"{today} 00:00:00"
    end_value = end or f"{today} 23:59:59"
    return database.get_stats(start_value, end_value, settings.parking_capacity)


@app.get("/api/vehicles")
def vehicles(_: Annotated[str, Depends(require_user)], query: str = ""):
    items = database.list_vehicles(query.strip())
    return {"items": items, "total": len(items)}


@app.post("/api/vehicles", status_code=201)
def create_vehicle(payload: VehicleInput, _: Annotated[str, Depends(require_user)]):
    try:
        return database.save_vehicle(payload.model_dump())
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="该车牌已存在") from exc


@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(
    vehicle_id: int, payload: VehicleInput, _: Annotated[str, Depends(require_user)]
):
    try:
        return database.save_vehicle(payload.model_dump(), vehicle_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="车辆不存在") from exc
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="该车牌已存在") from exc


@app.delete("/api/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, _: Annotated[str, Depends(require_user)]):
    if not database.delete_vehicle(vehicle_id):
        raise HTTPException(status_code=404, detail="车辆不存在")
    return Response(status_code=204)
