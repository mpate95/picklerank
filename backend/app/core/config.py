from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="PICKLERANK_",
    )

    env: str = Field(default="local")
    app_name: str = Field(default="PickleRank API")
    api_v1_prefix: str = Field(default="")
    cors_origins: list[str] = Field(default=["http://127.0.0.1:3000", "http://localhost:3000"])
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")
    db_host: str = Field(default="127.0.0.1")
    db_port: int = Field(default=5432)
    db_name: str = Field(default="picklerank")
    db_user: str = Field(default="picklerank")
    db_password: str = Field(default="picklerank")
    db_echo: bool = Field(default=False)
    auth_token_secret: str = Field(default="picklerank-dev-secret")
    auth_token_ttl_minutes: int = Field(default=60 * 24 * 7)
    auth_cookie_name: str = Field(default="picklerank_admin_session")
    csrf_cookie_name: str = Field(default="picklerank_csrf_token")
    csrf_header_name: str = Field(default="X-CSRF-Token")
    auth_cookie_domain: str | None = Field(default=None)
    auth_cookie_secure: bool | None = Field(default=None)
    auth_cookie_samesite: str | None = Field(default=None)
    login_rate_limit_attempts: int = Field(default=5)
    login_rate_limit_window_seconds: int = Field(default=900)
    admin_username: str = Field(default="admin")
    admin_password: str = Field(default="changeme-admin-password")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                return value
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self._normalize_database_url(self.database_url_override, require_ssl=True)

        return self._normalize_database_url(
            (
                f"postgresql+psycopg://{self.db_user}:{self.db_password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            ),
            require_ssl=False,
        )

    @staticmethod
    def _normalize_database_url(raw_url: str, *, require_ssl: bool) -> str:
        normalized = raw_url.replace("postgres://", "postgresql://", 1)
        if normalized.startswith("postgresql://") and not normalized.startswith("postgresql+psycopg://"):
            normalized = normalized.replace("postgresql://", "postgresql+psycopg://", 1)

        parsed = urlsplit(normalized)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if require_ssl:
            query.setdefault("sslmode", "require")
        return urlunsplit(parsed._replace(query=urlencode(query)))

    @property
    def resolved_auth_cookie_secure(self) -> bool:
        if self.auth_cookie_secure is not None:
            return self.auth_cookie_secure
        return self.env != "local"

    @property
    def resolved_auth_cookie_samesite(self) -> str:
        if self.auth_cookie_samesite:
            return self.auth_cookie_samesite
        return "none" if self.resolved_auth_cookie_secure else "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()
