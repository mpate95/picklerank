from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

from app.core.config import get_settings


class LoginRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._attempts: dict[str, deque[float]] = defaultdict(deque)

    def reset(self) -> None:
        with self._lock:
            self._attempts.clear()

    def check(self, key: str) -> None:
        settings = get_settings()
        now = time.time()
        window = settings.login_rate_limit_window_seconds
        max_attempts = settings.login_rate_limit_attempts

        with self._lock:
            attempts = self._attempts[key]
            while attempts and now - attempts[0] > window:
                attempts.popleft()

            if len(attempts) >= max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again later.",
                )

            attempts.append(now)


login_rate_limiter = LoginRateLimiter()
