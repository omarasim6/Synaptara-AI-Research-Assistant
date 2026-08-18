"""
Server-side scheduler for the Weekly Digest.

The project has no existing task queue / cron infrastructure (no Celery,
no Redis), so this uses APScheduler's AsyncIOScheduler running in-process
inside the FastAPI app — the smallest addition that fits a single-service
deployment. Started/stopped from the app lifespan in app/main.py.
"""
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.digest_service import build_digest_data, has_any_activity, render_digest_email
from app.services.email_service import send_email

logger = logging.getLogger(__name__)
settings = get_settings()

_scheduler: AsyncIOScheduler | None = None


def _current_iso_week() -> str:
    y, w, _ = datetime.now(timezone.utc).isocalendar()
    return f"{y}-W{w:02d}"


async def run_weekly_digest_job() -> None:
    """Finds users with Weekly Digest enabled, sends each their digest.
    Skips users already sent for the current ISO week. One user's failure
    never stops the others."""
    period = _current_iso_week()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(
                User.weekly_digest_enabled == True,  # noqa: E712
                User.is_active == True,  # noqa: E712
            )
        )
        users = result.scalars().all()

        sent, skipped, failed = 0, 0, 0
        for user in users:
            if user.weekly_digest_last_sent_period == period:
                skipped += 1
                continue
            try:
                digest = await build_digest_data(user, db)
                if not has_any_activity(digest):
                    # Nothing to report yet — still mark as sent for this
                    # period so we don't re-check every restart, but don't
                    # spam an empty email.
                    user.weekly_digest_last_sent_period = period
                    await db.commit()
                    continue

                subject, html = render_digest_email(user, digest)
                ok = await send_email(user.email, subject, html)
                if ok:
                    user.weekly_digest_last_sent_period = period
                    await db.commit()
                    sent += 1
                else:
                    failed += 1
            except Exception:
                logger.exception("Weekly digest failed for user %s", user.id)
                failed += 1
                await db.rollback()

        logger.info("Weekly digest run complete: sent=%d skipped=%d failed=%d", sent, skipped, failed)


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        run_weekly_digest_job,
        trigger="cron",
        day_of_week=settings.WEEKLY_DIGEST_DAY_OF_WEEK,
        hour=settings.WEEKLY_DIGEST_HOUR,
        id="weekly_digest",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "Weekly digest scheduler started (day_of_week=%s hour=%d UTC)",
        settings.WEEKLY_DIGEST_DAY_OF_WEEK,
        settings.WEEKLY_DIGEST_HOUR,
    )
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
