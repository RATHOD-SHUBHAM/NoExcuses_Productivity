from collections.abc import Iterator
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, ClientOptions, create_client
from supabase_auth import SyncMemoryStorage

from noexcuses_backend.auth_jwt import verify_supabase_access_token
from noexcuses_backend.config import get_settings, is_elevated_supabase_key

_bearer = HTTPBearer(auto_error=False)


def get_supabase_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Iterator[Client]:
    """Supabase PostgREST client scoped to the caller's JWT (RLS as authenticated)."""
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization bearer token",
        )
    token = creds.credentials.strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")
    verify_supabase_access_token(token)
    s = get_settings()
    if is_elevated_supabase_key(s.supabase_key):
        raise HTTPException(
            status_code=500,
            detail=(
                "Server misconfiguration: SUPABASE_KEY must be the anon/publishable key "
                "(not the service_role or secret key) so Row Level Security applies per user."
            ),
        )
    http = httpx.Client(
        http2=False,
        timeout=httpx.Timeout(60.0, connect=15.0),
        follow_redirects=True,
        limits=httpx.Limits(max_keepalive_connections=0, max_connections=32),
    )
    options = ClientOptions(
        storage=SyncMemoryStorage(),
        httpx_client=http,
        headers={"Authorization": f"Bearer {token}"},
    )
    client = create_client(s.supabase_url, s.supabase_key, options=options)
    try:
        yield client
    finally:
        http.close()
