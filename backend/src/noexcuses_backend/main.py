import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
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


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "NoExcuses backend is running."}
