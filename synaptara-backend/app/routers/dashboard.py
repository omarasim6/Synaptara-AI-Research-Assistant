from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.user import User
from app.models.research import Search, SavedPaper, Report, Alert, AlertNotification
from app.schemas.dashboard import DashboardStats, StatItem
from app.schemas.research import SearchOut, ReportOut, AlertNotificationOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardStats:
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # ── Counts ────────────────────────────────────────────────────────────────
    total_searches = await db.scalar(
        select(func.count()).where(Search.user_id == current_user.id)
    ) or 0
    weekly_searches = await db.scalar(
        select(func.count()).where(
            Search.user_id == current_user.id,
            Search.created_at >= one_week_ago,
        )
    ) or 0

    total_reports = await db.scalar(
        select(func.count()).where(Report.user_id == current_user.id)
    ) or 0
    weekly_reports = await db.scalar(
        select(func.count()).where(
            Report.user_id == current_user.id,
            Report.created_at >= one_week_ago,
        )
    ) or 0

    total_alerts = await db.scalar(
        select(func.count()).where(Alert.user_id == current_user.id)
    ) or 0

    unread_count = await db.scalar(
        select(func.count(AlertNotification.id))
        .join(Alert, AlertNotification.alert_id == Alert.id)
        .where(
            Alert.user_id == current_user.id,
            AlertNotification.is_read == False,  # noqa: E712
        )
    ) or 0

    stats: list[StatItem] = [
        StatItem(label="Searches", value=str(total_searches), delta=f"+{weekly_searches} this week"),
        StatItem(label="Reports saved", value=str(total_reports), delta=f"+{weekly_reports} this week"),
        StatItem(label="Papers indexed", value="50K+", delta="Live feed"),
        StatItem(label="Active alerts", value=str(total_alerts), delta=f"{unread_count} unread"),
    ]

    # ── Recent searches ───────────────────────────────────────────────────────
    recent_searches_result = await db.execute(
        select(Search)
        .where(Search.user_id == current_user.id)
        .order_by(Search.created_at.desc())
        .limit(5)
    )
    recent_searches = [
        SearchOut.model_validate(s) for s in recent_searches_result.scalars().all()
    ]

    # ── Saved reports ─────────────────────────────────────────────────────────
    reports_result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .limit(5)
    )
    saved_reports = [ReportOut.model_validate(r) for r in reports_result.scalars().all()]

    # ── Alert notifications ───────────────────────────────────────────────────
    notifs_result = await db.execute(
        select(AlertNotification)
        .join(Alert, AlertNotification.alert_id == Alert.id)
        .where(Alert.user_id == current_user.id)
        .options(selectinload(AlertNotification.alert))
        .order_by(AlertNotification.created_at.desc())
        .limit(5)
    )
    alert_notifications = [
        AlertNotificationOut(
            id=n.id,
            alert_id=n.alert_id,
            title=n.title,
            papers_count=n.papers_count,
            is_read=n.is_read,
            created_at=n.created_at,
            source=n.alert.source,
            alert_query=n.alert.query,
        )
        for n in notifs_result.scalars().all()
    ]

    return DashboardStats(
        stats=stats,
        recent_searches=recent_searches,
        saved_reports=saved_reports,
        alerts=alert_notifications,
    )
