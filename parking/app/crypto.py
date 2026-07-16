from __future__ import annotations

import base64
import struct
import time

from Crypto.Cipher import AES


def legacy_aes_ctr_encrypt(plaintext: str, password: str, now_ms: int | None = None) -> str:
    """Match the AES-CTR helper used by the OEM camera web interface."""

    password_bytes = password.encode("utf-8")[:16].ljust(16, b"\0")
    key = AES.new(password_bytes, AES.MODE_ECB).encrypt(password_bytes)

    nonce = now_ms if now_ms is not None else int(time.time() * 1000)
    nonce_seconds, nonce_millis = divmod(nonce, 1000)
    counter = bytearray(16)
    counter[:4] = struct.pack("<I", nonce_seconds & 0xFFFFFFFF)
    counter[4:8] = bytes([nonce_millis & 0xFF]) * 4

    source = plaintext.encode("utf-8")
    encrypted = bytearray()
    cipher = AES.new(key, AES.MODE_ECB)
    for block_index in range(0, len(source), 16):
        counter[8:16] = struct.pack(">Q", block_index // 16)
        key_stream = cipher.encrypt(bytes(counter))
        block = source[block_index : block_index + 16]
        encrypted.extend(left ^ right for left, right in zip(block, key_stream))

    return base64.b64encode(bytes(counter[:8]) + bytes(encrypted)).decode("ascii")
