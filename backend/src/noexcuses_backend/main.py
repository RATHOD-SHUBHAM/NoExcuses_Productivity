import logging
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from noexcuses_backend.config import get_settings, is_elevated_supabase_key
from noexcuses_backend.routers.api import router as api_router
_log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_settings.cache_clear()
    s = get_settings()
    if is_elevated_supabase_key(s.supabase_key):
        _log.warning(
            "SUPABASE_KEY looks elevated (service_role or sb_secret). "
            "Per-user mode requires the anon/publishable key as SUPABASE_KEY so RLS runs per JWT."
        )
    yield


app = FastAPI(title="NoExcuses API", lifespan=lifespan)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/public/config-check")
def public_config_check() -> dict[str, str]:
    """No auth. Lets the browser verify Vercel and Render use the same Supabase project."""
    s = get_settings()
    host = urlparse(s.supabase_url).hostname or ""
    return {"supabase_host": host.lower()}


@app.get("/api/public/browser-config")
def public_browser_config() -> dict[str, str]:
    """
    No auth. Lets the SPA on Vercel load Supabase URL + publishable key when Vite did not bake VITE_*.
    Same values as SUPABASE_URL / SUPABASE_KEY on this API host (must be anon/publishable, never service_role).
    """
    s = get_settings()
    if is_elevated_supabase_key(s.supabase_key):
        raise HTTPException(
            status_code=503,
            detail="Server misconfiguration: SUPABASE_KEY must be anon/publishable for browser bootstrap.",
        )
    return {
        "supabase_url": s.supabase_url.rstrip("/"),
        "supabase_anon_key": s.supabase_key.strip(),
    }


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "NoExcuses backend is running."}
