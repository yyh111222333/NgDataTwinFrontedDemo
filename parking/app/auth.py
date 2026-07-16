from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings


bearer = HTTPBearer(auto_error=False)


class TokenManager:
    def __init__(self, settings: Settings):
        self.settings = settings

    @staticmethod
    def _encode(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")

    @staticmethod
    def _decode(value: str) -> bytes:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

    def create(self, username: str) -> str:
        payload = self._encode(
            json.dumps(
                {"sub": username, "exp": int(time.time()) + 12 * 60 * 60},
                separators=(",", ":"),
            ).encode("utf-8")
        )
        signature = hmac.new(
            self.settings.auth_secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256
        ).digest()
        return f"{payload}.{self._encode(signature)}"

    def verify(self, token: str) -> str:
        try:
            payload, signature = token.split(".", 1)
            expected = hmac.new(
                self.settings.auth_secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256
            ).digest()
            if not hmac.compare_digest(expected, self._decode(signature)):
                raise ValueError("signature")
            data = json.loads(self._decode(payload))
            if int(data["exp"]) < int(time.time()):
                raise ValueError("expired")
            return str(data["sub"])
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="登录状态已失效"
            ) from exc


def get_token_manager(request: Request) -> TokenManager:
    return request.app.state.token_manager


def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    manager: Annotated[TokenManager, Depends(get_token_manager)],
) -> str:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    return manager.verify(credentials.credentials)


def require_user_or_query_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    manager: Annotated[TokenManager, Depends(get_token_manager)],
    access_token: Annotated[str, Query()] = "",
) -> str:
    token = credentials.credentials if credentials else access_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    return manager.verify(token)
