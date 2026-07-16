import tempfile
import unittest
from pathlib import Path

from app.config import GateConfig
from app.database import ParkingDatabase


class ParkingDatabaseTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.database = ParkingDatabase(Path(self.tempdir.name) / "parking.sqlite3")
        self.database.initialize()
        self.database.sync_gates(
            (
                GateConfig("gate-in", 7, "7号门进", "in", "192.0.2.1", "oem_ipnc"),
                GateConfig("gate-out", 7, "7号门出", "out", "192.0.2.2", "oem_ipnc"),
            )
        )

    def tearDown(self):
        self.tempdir.cleanup()

    def insert_event(self, source_key: str, gate_id: str, direction: str, epoch: int):
        return self.database.insert_event(
            {
                "source_key": source_key,
                "gate_id": gate_id,
                "plate": "苏A12345",
                "plate_color": "blue",
                "direction": direction,
                "captured_at": "2026-07-16 10:00:00" if direction == "in" else "2026-07-16 11:00:00",
                "captured_epoch": epoch,
                "source_payload": "{}",
            }
        )

    def test_events_are_deduplicated_and_paired_into_session(self):
        self.assertIsNotNone(self.insert_event("in-1", "gate-in", "in", 100))
        self.assertIsNone(self.insert_event("in-1", "gate-in", "in", 100))
        self.assertIsNotNone(self.insert_event("out-1", "gate-out", "out", 200))

        self.database.rebuild_sessions()
        sessions = self.database.list_sessions("closed")
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]["plate"], "苏A12345")
        self.assertEqual(sessions[0]["entry_gate_name"], "7号门进")
        self.assertEqual(sessions[0]["exit_gate_name"], "7号门出")

    def test_stats_group_events_by_gate_and_direction(self):
        self.insert_event("in-1", "gate-in", "in", 100)
        self.insert_event("out-1", "gate-out", "out", 200)
        self.database.set_gate_status("gate-in", True)
        stats = self.database.get_stats("2026-07-16 00:00:00", "2026-07-16 23:59:59", 500)
        self.assertEqual(stats["summary"]["entries"], 1)
        self.assertEqual(stats["summary"]["exits"], 1)
        self.assertEqual(stats["channels"][0]["gate_no"], 7)
        self.assertEqual(stats["channels"][0]["enter_count"], 1)

    def test_presence_summary_tracks_open_sessions_and_gate_status(self):
        self.insert_event("in-1", "gate-in", "in", 100)
        self.database.rebuild_sessions()
        self.database.set_gate_status("gate-in", True)

        summary = self.database.get_presence_summary(500)

        self.assertEqual(summary["vehicles_on_site"], 1)
        self.assertEqual(summary["remaining_spaces"], 499)
        self.assertEqual(summary["online_gates"], 1)
        self.assertEqual(summary["offline_gates"], 1)
        self.assertEqual(summary["latest_event_at"], "2026-07-16 10:00:00")

    def test_vehicle_appointment_updates_whitelist_and_status(self):
        appointment = self.database.create_appointment(
            {
                "appointment_type": "vehicle",
                "subject_name": "测试访客",
                "phone": "13800000000",
                "plate": "苏A88888",
                "reason": "设备维护",
                "valid_from": "2026-07-16 10:00:00",
                "valid_until": "2026-07-16 18:00:00",
            }
        )
        vehicle = self.database.upsert_appointment_vehicle(
            {
                "plate": "苏A88888",
                "owner": "测试访客",
                "phone": "13800000000",
                "reason": "设备维护",
                "valid_from": "2026-07-16 10:00:00",
                "valid_until": "2026-07-16 18:00:00",
            }
        )
        result = self.database.update_appointment_result(
            appointment["id"], "active", "已写入停车场预约白名单", str(vehicle["id"])
        )

        self.assertEqual(result["sync_status"], "active")
        self.assertEqual(self.database.list_vehicles("苏A88888")[0]["vehicle_type"], "预约车辆")
        self.assertEqual(self.database.list_appointments(1)[0]["plate"], "苏A88888")


if __name__ == "__main__":
    unittest.main()
