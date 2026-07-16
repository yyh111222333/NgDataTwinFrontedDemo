import hashlib
import unittest

from app.k30 import aes_decrypt, aes_encrypt, build_k30_sign, build_portal_person_model


class K30HelpersTest(unittest.TestCase):
    def test_aes_cbc_round_trip_and_url_encoding(self):
        source = '{"name":"测试人员"}'
        encrypted = aes_encrypt(source, "1234567890abcdef", "abcdef1234567890")
        self.assertNotIn("+", encrypted)
        self.assertEqual(
            aes_decrypt(encrypted, "1234567890abcdef", "abcdef1234567890"), source
        )

    def test_signature_sorts_non_empty_parameters(self):
        parameters = {"timestamp": "20260716123000123", "data": "{}", "empty": "", "companyno": "ng"}
        expected_source = "companyno=ng&data={}&timestamp=20260716123000123&key=secret"
        expected = hashlib.md5(expected_source.encode("utf-8")).hexdigest()
        self.assertEqual(build_k30_sign(parameters, "secret"), expected)

    def test_portal_payload_contains_validity_and_face(self):
        model = build_portal_person_model(
            {
                "name": "访客甲",
                "phone": "13800000000",
                "reason": "进厂检修",
                "valid_from": "2026-07-16 09:00:00",
                "valid_until": "2026-07-16 18:00:00",
                "photo": "data:image/jpeg;base64,ZmFrZQ==",
            },
            "company-no",
            "department-no",
            "260716090000001",
        )
        self.assertEqual(model["Staff_DepartmentNo"], "department-no")
        self.assertEqual(model["People_EffDate"], "2026-07-16 18:00:00")
        self.assertTrue(model["People_Photo"].startswith("data:image/jpeg"))


if __name__ == "__main__":
    unittest.main()
