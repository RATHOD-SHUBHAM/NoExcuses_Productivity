import time
from collections.abc import Callable, Iterator
from typing import Any

import httpx
from postgrest.exceptions import APIError
from supabase import Client, ClientOptions, create_client
from supabase_auth import SyncMemoryStorage

from noexcuses_backend.config import get_settings


def _is_transient_http_error(exc: BaseException) -> bool:
    if isinstance(
        exc,
        (
            httpx.ReadError,
            httpx.RemoteProtocolError,
            httpx.WriteError,
            httpx.ConnectError,
            httpx.TimeoutException,
        ),
    ):
        return True
    cause = getattr(exc, "__cause__", None)
    if isinstance(cause, OSError) and getattr(cause, "errno", None) == 35:
        return True
    return False


def run_query(builder_fn: Callable[[], Any]) -> Any:
    """Execute a PostgREST chain with retries on transient httpx/httpcore errors.

    Under FastAPI + sync Supabase on macOS, concurrent requests can hit errno 35
    (EAGAIN) on the HTTP connection; a short retry usually succeeds. APIError
    (RLS, validation, etc.) is never retried.
    """
    last: BaseException | None = None
    for attempt in range(3):
        try:
            return builder_fn().execute()
        except APIError:
            raise
        except Exception as e:
            last = e
            if _is_transient_http_error(e) and attempt < 2:
                time.sleep(0.05 * (2**attempt))
                continue
            raise
    assert last is not None
    raise last


def get_supabase() -> Iterator[Client]:
    """Per-request Supabase client with a dedicated HTTP/1.1 httpx session.

    A single global client + HTTP/2 is not safe under FastAPI's thread pool (many parallel
    requests from the browser → errno 35 / ReadError on macOS). Each request gets its own
    httpx.Client(http2=False) and it is closed after the handler finishes.
    """
    s = get_settings()
    http = httpx.Client(
        http2=False,
        timeout=httpx.Timeout(60.0, connect=15.0),
        follow_redirects=True,
        limits=httpx.Limits(max_keepalive_connections=0, max_connections=32),
    )
    options = ClientOptions(storage=SyncMemoryStorage(), httpx_client=http)
    client = create_client(s.supabase_url, s.supabase_key_for_server(), options=options)
    try:
        yield client
    finally:
        http.close()
