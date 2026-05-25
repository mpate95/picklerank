from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass

from fastapi import Header, HTTPException, Request, status

from app.core.config import get_settings


@dataclass(frozen=True)
class AuthIdentity:
    username: str
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _encode_segment(payload: dict[str, object]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _decode_segment(segment: str) -> dict[str, object]:
    padding = "=" * (-len(segment) % 4)
    raw = base64.urlsafe_b64decode(f"{segment}{padding}".encode("utf-8"))
    return json.loads(raw.decode("utf-8"))


def _sign_segment(segment: str) -> str:
    secret = get_settings().auth_token_secret.encode("utf-8")
    digest = hmac.new(secret, segment.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def create_access_token(username: str, role: str) -> str:
    settings = get_settings()
    payload = {
        "sub": username,
        "role": role,
        "exp": int(time.time()) + (settings.auth_token_ttl_minutes * 60),
    }
    encoded_payload = _encode_segment(payload)
    signature = _sign_segment(encoded_payload)
    return f"{encoded_payload}.{signature}"


def create_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def verify_access_token(token: str) -> AuthIdentity:
    try:
        encoded_payload, provided_signature = token.split(".", maxsplit=1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        ) from exc

    expected_signature = _sign_segment(encoded_payload)
    if not hmac.compare_digest(provided_signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    payload = _decode_segment(encoded_payload)
    expires_at = int(payload.get("exp", 0))
    if expires_at <= int(time.time()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
        )

    username = str(payload.get("sub", "")).strip()
    role = str(payload.get("role", "")).strip()
    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    return AuthIdentity(username=username, role=role)


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )
    return token


def get_current_identity(
    request: Request,
    authorization: str | None = Header(default=None),
) -> AuthIdentity | None:
    cookie_name = get_settings().auth_cookie_name
    token = _extract_bearer_token(authorization) or request.cookies.get(cookie_name)
    if token is None:
        return None
    return verify_access_token(token)


def require_csrf(request: Request) -> None:
    settings = get_settings()
    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    csrf_header = request.headers.get(settings.csrf_header_name)
    if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed.",
        )
