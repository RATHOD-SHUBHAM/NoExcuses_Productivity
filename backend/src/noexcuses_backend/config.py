import base64
import json
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent


def _strip_env_value(v: object) -> str | None:
    if v is None:
        return None
    s = str(v).strip().strip("\ufeff")
    if len(s) >= 2 and ((s[0] == s[-1] == '"') or (s[0] == s[-1] == "'")):
        s = s[1:-1].strip()
    return s if s else None


def jwt_role_from_token(token: str) -> str | None:
    """Read `role` claim from a Supabase JWT without verifying the signature."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("ascii")))
        r = payload.get("role")
        return str(r) if r is not None else None
    except Exception:
        return None


def is_elevated_supabase_key(key: str) -> bool:
    """True if this key should bypass RLS (secret key or service_role JWT)."""
    k = (key or "").strip()
    if k.startswith("sb_secret_"):
        return True
    if k.startswith("sb_publishable_"):
        return False
    if k.startswith("eyJ"):
        return jwt_role_from_token(k) == "service_role"
    return False


class Settings(BaseSettings):
    """Loads Supabase credentials from environment (use `.env` at repo root)."""

    supabase_url: str
    # Anon / publishable key (sb_publishable_… or legacy anon JWT). Required for API DB access
    # with end-user JWTs so RLS runs as authenticated.
    supabase_key: str
    # Project Settings → API → JWT Secret (symmetric). Used to verify Supabase access tokens.
    supabase_jwt_secret: str
    # Comma-separated browser origins allowed to call the API (Vercel + local dev).
    # Example: https://my-app.vercel.app,http://localhost:5173
    cors_origins: str | None = None
    # New platform keys (recommended): sb_secret_* bypasses RLS
    supabase_secret_key: str | None = None
    # Legacy JWT service_role (eyJ...) from "Legacy API Keys"
    supabase_service_role_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_nested_delimiter="__",
        # Empty SUPABASE_* in the shell must not override non-empty values from .env
        env_ignore_empty=True,
    )

    @field_validator("supabase_url", "supabase_key", mode="before")
    @classmethod
    def _normalize_required(cls, v: object) -> str:
        s = _strip_env_value(v)
        if not s:
            raise ValueError("cannot be empty")
        return s

    @field_validator("supabase_jwt_secret", mode="before")
    @classmethod
    def _normalize_jwt_secret(cls, v: object) -> str:
        s = _strip_env_value(v)
        if not s:
            raise ValueError("cannot be empty")
        return s

    @field_validator("supabase_secret_key", "supabase_service_role_key", "cors_origins", mode="before")
    @classmethod
    def _normalize_optional(cls, v: object) -> str | None:
        if v is None:
            return None
        return _strip_env_value(v)

    def cors_allow_origins(self) -> list[str]:
        """Origins for FastAPI CORSMiddleware: local dev defaults plus CORS_ORIGINS."""
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if not self.cors_origins:
            return list(defaults)
        extra = [
            o.strip().rstrip("/")
            for o in self.cors_origins.split(",")
            if o.strip()
        ]
        seen: set[str] = set()
        out: list[str] = []
        for o in (*defaults, *extra):
            if o not in seen:
                seen.add(o)
                out.append(o)
        return out

    def supabase_key_for_server(self) -> str:
        """Elevated key first (sb_secret_ or service_role JWT), else publishable/anon."""
        for candidate in (
            self.supabase_secret_key,
            self.supabase_service_role_key,
            self.supabase_key,
        ):
            if candidate:
                return candidate
        raise ValueError("No Supabase API key configured (set SUPABASE_KEY at minimum)")


@lru_cache
def get_settings() -> Settings:
    return Settings()
