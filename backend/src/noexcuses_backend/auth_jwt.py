"""Verify Supabase Auth access tokens (HS256 legacy or RS256/ES256 via JWKS)."""

import ssl
from functools import lru_cache

import certifi
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from fastapi import HTTPException

from noexcuses_backend.config import get_settings


@lru_cache(maxsize=8)
def _jwks_client(supabase_url: str) -> PyJWKClient:
    """Use certifi CA bundle so JWKS HTTPS works on macOS / minimal Python installs."""
    jwks_url = supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    return PyJWKClient(jwks_url, ssl_context=ssl_ctx)


def verify_supabase_access_token(token: str) -> str:
    """Validate JWT and return auth user id (`sub`). Raises HTTPException if invalid."""
    s = get_settings()
    issuer = s.supabase_url.rstrip("/") + "/auth/v1"

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid access token: {e!s}",
        ) from e

    alg = header.get("alg") or "HS256"
    decode_kw: dict = {
        "algorithms": [alg],
        "audience": "authenticated",
        "issuer": issuer,
        "options": {"require": ["exp", "sub"]},
    }

    try:
        if alg == "HS256":
            payload = jwt.decode(token, s.supabase_jwt_secret, **decode_kw)
        elif alg in ("RS256", "ES256"):
            jwk_client = _jwks_client(s.supabase_url)
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(token, signing_key.key, **decode_kw)
        else:
            raise HTTPException(
                status_code=401,
                detail=f"Unsupported token algorithm: {alg}",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Access token expired") from None
    except PyJWKClientConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not fetch Supabase signing keys (JWKS). "
                "Check network, firewall, and that this host trusts HTTPS (TLS)."
            ),
        ) from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid access token: {e!s}",
        ) from e

    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="Invalid token subject")
    return sub
