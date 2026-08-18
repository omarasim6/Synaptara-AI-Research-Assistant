import logging
from contextlib import asynccontextmanager

import anyio
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, search, papers, reports, alerts, dashboard, payment_methods, billing, assistant
from app.services.scheduler import start_scheduler, stop_scheduler

# Import all models so Alembic + Base.metadata pick them up
import app.models  # noqa: F401

settings = get_settings()
logger = logging.getLogger(__name__)


def _run_migrations() -> None:
    """
    Apply all pending Alembic migrations synchronously.

    IMPORTANT: this replaces the old `Base.metadata.create_all(...)` startup
    hook. `create_all` only creates tables that don't exist yet — it never
    ALTERs an existing table, so schema changes shipped as Alembic migrations
    (e.g. widening `users.avatar_url` to TEXT in revision 003) would silently
    never apply to a database that was first created before that migration
    existed. Running `alembic upgrade head` on startup guarantees the live
    schema always matches the migration history, in dev and prod alike.
    """
    cfg = Config("alembic.ini")
    # Alembic's own engine is sync (uses psycopg2/whatever sync driver is on
    # the URL scheme); our runtime DATABASE_URL uses the async driver, so we
    # pass the same URL through and let alembic/env.py handle it.
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Bring the DB schema up to date, then create any net-new tables that
    don't yet have a migration (dev convenience only)."""
    try:
        # _run_migrations() calls Alembic's own asyncio.run(...) internally
        # (see alembic/env.py run_migrations_online). We're already inside a
        # running event loop here, so it must go through a worker thread —
        # calling asyncio.run() directly on this loop would raise
        # "asyncio.run() cannot be called from a running event loop".
        await anyio.to_thread.run_sync(_run_migrations)
    except Exception:
        logger.exception(
            "Alembic migration failed on startup — the app will still boot, "
            "but the DB schema may be out of date. Run `alembic upgrade head` "
            "manually and check DATABASE_URL / alembic/env.py."
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    start_scheduler()
    yield
    stop_scheduler()
    await engine.dispose()


app = FastAPI(
    title="Synaptara API",
    description="AI Research Assistant backend — FastAPI + PostgreSQL",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,      prefix=API_PREFIX)
app.include_router(search.router,    prefix=API_PREFIX)
app.include_router(papers.router,    prefix=API_PREFIX)
app.include_router(reports.router,   prefix=API_PREFIX)
app.include_router(alerts.router,    prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(payment_methods.router, prefix=API_PREFIX)
app.include_router(billing.router, prefix=API_PREFIX)
app.include_router(assistant.router, prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "app": settings.APP_NAME})


@app.get("/", tags=["root"])
async def root() -> JSONResponse:
    return JSONResponse({"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs"})
