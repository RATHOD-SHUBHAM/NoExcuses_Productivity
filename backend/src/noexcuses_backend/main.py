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
    if not is_elevated_supabase_key(s.supabase_key_for_server()):
        _log.warning(
            "Supabase key for FastAPI is not elevated (e.g. sb_publishable_ or anon JWT). "
            "POST/DELETE will hit RLS until you set SUPABASE_SECRET_KEY (sb_secret_…) or "
            "SUPABASE_SERVICE_ROLE_KEY (legacy service_role eyJ…). Restart after .env changes."
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
