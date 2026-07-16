from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from .config import GateConfig


def now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class ParkingDatabase:
    def __init__(self, path: Path):
        self.path = path

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=20, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode = WAL")
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS gates (
                    id TEXT PRIMARY KEY,
                    gate_no INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
                    ip TEXT NOT NULL,
                    adapter TEXT NOT NULL,
                    online INTEGER NOT NULL DEFAULT 0,
                    last_poll_at TEXT,
                    last_online_at TEXT,
                    last_event_at TEXT,
                    last_error TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS vehicles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plate TEXT NOT NULL UNIQUE,
                    owner TEXT NOT NULL DEFAULT '',
                    department TEXT NOT NULL DEFAULT '',
                    phone TEXT NOT NULL DEFAULT '',
                    vehicle_type TEXT NOT NULL DEFAULT '内部车辆',
                    valid_from TEXT,
                    valid_until TEXT,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    note TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_key TEXT NOT NULL UNIQUE,
                    gate_id TEXT NOT NULL REFERENCES gates(id),
                    plate TEXT NOT NULL,
                    plate_color TEXT NOT NULL DEFAULT 'other',
                    vehicle_type TEXT NOT NULL DEFAULT '',
                    direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
                    captured_at TEXT NOT NULL,
                    captured_epoch INTEGER NOT NULL,
                    image_ref TEXT,
                    image_path TEXT,
                    source_payload TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_events_captured_at ON events(captured_at DESC);
                CREATE INDEX IF NOT EXISTS idx_events_plate ON events(plate, captured_at DESC);
                CREATE INDEX IF NOT EXISTS idx_events_gate ON events(gate_id, captured_at DESC);

                CREATE TABLE IF NOT EXISTS parking_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plate TEXT NOT NULL,
                    entry_event_id INTEGER NOT NULL REFERENCES events(id),
                    exit_event_id INTEGER REFERENCES events(id),
                    entry_gate_id TEXT NOT NULL REFERENCES gates(id),
                    exit_gate_id TEXT REFERENCES gates(id),
                    entry_time TEXT NOT NULL,
                    exit_time TEXT,
                    status TEXT NOT NULL CHECK(status IN ('open', 'closed'))
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions(status, entry_time DESC);
                CREATE INDEX IF NOT EXISTS idx_sessions_plate ON parking_sessions(plate, entry_time DESC);
                """
            )

    def sync_gates(self, gates: Iterable[GateConfig]) -> None:
        with self.connect() as db:
            for gate in gates:
                db.execute(
                    """
                    INSERT INTO gates (id, gate_no, name, direction, ip, adapter, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        gate_no=excluded.gate_no,
                        name=excluded.name,
                        direction=excluded.direction,
                        ip=excluded.ip,
                        adapter=excluded.adapter,
                        updated_at=excluded.updated_at
                    """,
                    (gate.id, gate.gate_no, gate.name, gate.direction, gate.ip, gate.adapter, now_text()),
                )

    def set_gate_status(self, gate_id: str, online: bool, error: str = "") -> None:
        timestamp = now_text()
        with self.connect() as db:
            db.execute(
                """
                UPDATE gates
                SET online=?, last_poll_at=?, last_online_at=CASE WHEN ?=1 THEN ? ELSE last_online_at END,
                    last_error=?, updated_at=?
                WHERE id=?
                """,
                (int(online), timestamp, int(online), timestamp, error[:500], timestamp, gate_id),
            )

    def has_source_key(self, source_key: str) -> bool:
        with self.connect() as db:
            return db.execute("SELECT 1 FROM events WHERE source_key=?", (source_key,)).fetchone() is not None

    def insert_event(self, event: dict[str, Any]) -> int | None:
        with self.connect() as db:
            cursor = db.execute(
                """
                INSERT OR IGNORE INTO events (
                    source_key, gate_id, plate, plate_color, vehicle_type, direction,
                    captured_at, captured_epoch, image_ref, source_payload, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event["source_key"],
                    event["gate_id"],
                    event["plate"],
                    event.get("plate_color", "other"),
                    event.get("vehicle_type", ""),
                    event["direction"],
                    event["captured_at"],
                    event["captured_epoch"],
                    event.get("image_ref"),
                    event.get("source_payload", ""),
                    now_text(),
                ),
            )
            if cursor.rowcount == 0:
                return None
            event_id = int(cursor.lastrowid)
            db.execute(
                "UPDATE gates SET last_event_at=?, updated_at=? WHERE id=?",
                (event["captured_at"], now_text(), event["gate_id"]),
            )
            return event_id

    def update_event_image(self, event_id: int, image_path: str) -> None:
        with self.connect() as db:
            db.execute("UPDATE events SET image_path=? WHERE id=?", (image_path, event_id))

    def rebuild_sessions(self) -> None:
        with self.connect() as db:
            db.execute("DELETE FROM parking_sessions")
            rows = db.execute(
                """
                SELECT id, plate, direction, gate_id, captured_at
                FROM events
                WHERE plate NOT IN ('', '无牌车', '无车牌')
                ORDER BY captured_epoch ASC, id ASC
                """
            ).fetchall()
            open_sessions: dict[str, int] = {}
            for row in rows:
                plate = row["plate"]
                if row["direction"] == "in":
                    if plate in open_sessions:
                        continue
                    cursor = db.execute(
                        """
                        INSERT INTO parking_sessions (
                            plate, entry_event_id, entry_gate_id, entry_time, status
                        ) VALUES (?, ?, ?, ?, 'open')
                        """,
                        (plate, row["id"], row["gate_id"], row["captured_at"]),
                    )
                    open_sessions[plate] = int(cursor.lastrowid)
                elif plate in open_sessions:
                    db.execute(
                        """
                        UPDATE parking_sessions
                        SET exit_event_id=?, exit_gate_id=?, exit_time=?, status='closed'
                        WHERE id=?
                        """,
                        (row["id"], row["gate_id"], row["captured_at"], open_sessions.pop(plate)),
                    )

    @staticmethod
    def _rows(rows: Iterable[sqlite3.Row]) -> list[dict[str, Any]]:
        return [dict(row) for row in rows]

    def list_gates(self) -> list[dict[str, Any]]:
        with self.connect() as db:
            return self._rows(db.execute("SELECT * FROM gates ORDER BY gate_no, direction").fetchall())

    def list_events(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        plate: str = "",
        gate_id: str = "",
        direction: str = "",
        start: str = "",
        end: str = "",
    ) -> tuple[list[dict[str, Any]], int]:
        clauses: list[str] = []
        params: list[Any] = []
        if plate:
            clauses.append("e.plate LIKE ?")
            params.append(f"%{plate}%")
        if gate_id:
            clauses.append("e.gate_id = ?")
            params.append(gate_id)
        if direction in {"in", "out"}:
            clauses.append("e.direction = ?")
            params.append(direction)
        if start:
            clauses.append("e.captured_at >= ?")
            params.append(start)
        if end:
            clauses.append("e.captured_at <= ?")
            params.append(end)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        select = f"""
            FROM events e
            JOIN gates g ON g.id=e.gate_id
            LEFT JOIN vehicles v ON v.plate=e.plate AND v.enabled=1
            {where}
        """
        with self.connect() as db:
            total = int(db.execute(f"SELECT COUNT(*) {select}", params).fetchone()[0])
            rows = db.execute(
                f"""
                SELECT e.*, g.name AS gate_name, g.gate_no,
                    v.id AS vehicle_id, v.owner, v.department, v.vehicle_type AS registered_type
                {select}
                ORDER BY e.captured_epoch DESC, e.id DESC
                LIMIT ? OFFSET ?
                """,
                [*params, limit, offset],
            ).fetchall()
            return self._rows(rows), total

    def get_event(self, event_id: int) -> dict[str, Any] | None:
        with self.connect() as db:
            row = db.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
            return dict(row) if row else None

    def list_sessions(self, status: str = "open", limit: int = 200) -> list[dict[str, Any]]:
        where = "WHERE s.status=?" if status in {"open", "closed"} else ""
        params: list[Any] = [status] if where else []
        with self.connect() as db:
            rows = db.execute(
                f"""
                SELECT s.*, gi.name AS entry_gate_name, go.name AS exit_gate_name,
                    v.owner, v.department, v.vehicle_type
                FROM parking_sessions s
                JOIN gates gi ON gi.id=s.entry_gate_id
                LEFT JOIN gates go ON go.id=s.exit_gate_id
                LEFT JOIN vehicles v ON v.plate=s.plate AND v.enabled=1
                {where}
                ORDER BY COALESCE(s.exit_time, s.entry_time) DESC
                LIMIT ?
                """,
                [*params, limit],
            ).fetchall()
            return self._rows(rows)

    def get_stats(self, start: str, end: str, capacity: int) -> dict[str, Any]:
        with self.connect() as db:
            direction_rows = db.execute(
                """
                SELECT direction, COUNT(*) AS count
                FROM events WHERE captured_at BETWEEN ? AND ? GROUP BY direction
                """,
                (start, end),
            ).fetchall()
            direction_counts = {row["direction"]: int(row["count"]) for row in direction_rows}
            channel_rows = db.execute(
                """
                SELECT g.gate_no, e.direction, COUNT(*) AS count
                FROM events e JOIN gates g ON g.id=e.gate_id
                WHERE e.captured_at BETWEEN ? AND ?
                GROUP BY g.gate_no, e.direction ORDER BY g.gate_no
                """,
                (start, end),
            ).fetchall()
            matter_rows = db.execute(
                """
                SELECT plate_color, COUNT(*) AS count
                FROM events WHERE captured_at BETWEEN ? AND ? GROUP BY plate_color
                """,
                (start, end),
            ).fetchall()
            time_rows = db.execute(
                """
                SELECT captured_at, direction FROM events
                WHERE captured_at BETWEEN ? AND ? ORDER BY captured_at
                """,
                (start, end),
            ).fetchall()
            inside = int(
                db.execute("SELECT COUNT(*) FROM parking_sessions WHERE status='open'").fetchone()[0]
            )
            online = int(db.execute("SELECT COUNT(*) FROM gates WHERE online=1").fetchone()[0])
            unregistered = int(
                db.execute(
                    """
                    SELECT COUNT(*) FROM events e
                    LEFT JOIN vehicles v ON v.plate=e.plate AND v.enabled=1
                    WHERE e.captured_at BETWEEN ? AND ? AND v.id IS NULL
                    """,
                    (start, end),
                ).fetchone()[0]
            )
        channels = {
            gate_no: {"gate_no": gate_no, "enter_count": 0, "exit_count": 0}
            for gate_no in (7, 8, 9, 10, 11)
        }
        for row in channel_rows:
            key = "enter_count" if row["direction"] == "in" else "exit_count"
            channels[int(row["gate_no"])][key] = int(row["count"])
        return {
            "summary": {
                "entries": direction_counts.get("in", 0),
                "exits": direction_counts.get("out", 0),
                "inside": inside,
                "remaining_spaces": max(0, capacity - inside),
                "online_gates": online,
                "offline_gates": 10 - online,
                "unregistered_events": unregistered,
            },
            "channels": list(channels.values()),
            "matters": {row["plate_color"]: int(row["count"]) for row in matter_rows},
            "timeline": self._rows(time_rows),
            "period": {"start": start, "end": end},
        }

    def list_vehicles(self, query: str = "") -> list[dict[str, Any]]:
        with self.connect() as db:
            if query:
                token = f"%{query}%"
                rows = db.execute(
                    """
                    SELECT * FROM vehicles
                    WHERE plate LIKE ? OR owner LIKE ? OR department LIKE ?
                    ORDER BY updated_at DESC
                    """,
                    (token, token, token),
                ).fetchall()
            else:
                rows = db.execute("SELECT * FROM vehicles ORDER BY updated_at DESC").fetchall()
            return self._rows(rows)

    def save_vehicle(self, vehicle: dict[str, Any], vehicle_id: int | None = None) -> dict[str, Any]:
        timestamp = now_text()
        fields = (
            vehicle["plate"].strip().upper(),
            vehicle.get("owner", "").strip(),
            vehicle.get("department", "").strip(),
            vehicle.get("phone", "").strip(),
            vehicle.get("vehicle_type", "内部车辆").strip(),
            vehicle.get("valid_from") or None,
            vehicle.get("valid_until") or None,
            int(bool(vehicle.get("enabled", True))),
            vehicle.get("note", "").strip(),
        )
        with self.connect() as db:
            if vehicle_id is None:
                cursor = db.execute(
                    """
                    INSERT INTO vehicles (
                        plate, owner, department, phone, vehicle_type, valid_from,
                        valid_until, enabled, note, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (*fields, timestamp, timestamp),
                )
                vehicle_id = int(cursor.lastrowid)
            else:
                db.execute(
                    """
                    UPDATE vehicles SET plate=?, owner=?, department=?, phone=?, vehicle_type=?,
                        valid_from=?, valid_until=?, enabled=?, note=?, updated_at=?
                    WHERE id=?
                    """,
                    (*fields, timestamp, vehicle_id),
                )
            row = db.execute("SELECT * FROM vehicles WHERE id=?", (vehicle_id,)).fetchone()
            if row is None:
                raise KeyError(vehicle_id)
            return dict(row)

    def delete_vehicle(self, vehicle_id: int) -> bool:
        with self.connect() as db:
            return db.execute("DELETE FROM vehicles WHERE id=?", (vehicle_id,)).rowcount > 0
