import base64
import unittest

from app.cameras import normalize_signalway_plate
from app.crypto import legacy_aes_ctr_encrypt


class CameraHelpersTest(unittest.TestCase):
    def test_oem_encryption_is_deterministic_for_fixed_timestamp(self):
        timestamp = 1_720_000_123_456
        encrypted = legacy_aes_ctr_encrypt("admin:admin", "天天", timestamp)
        self.assertEqual(encrypted, legacy_aes_ctr_encrypt("admin:admin", "天天", timestamp))
        decoded = base64.b64decode(encrypted)
        self.assertEqual(len(decoded), 8 + len("admin:admin"))
        self.assertNotIn(b"admin", decoded)

    def test_signalway_plate_prefix_is_normalized(self):
        self.assertEqual(normalize_signalway_plate("黄鲁H13K56"), ("鲁H13K56", "yellow"))
        self.assertEqual(normalize_signalway_plate("蓝苏A12345"), ("苏A12345", "blue"))
        self.assertEqual(normalize_signalway_plate("无车牌"), ("无牌车", "unlicensed"))


if __name__ == "__main__":
    unittest.main()
