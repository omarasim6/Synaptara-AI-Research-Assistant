from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
import uuid

from app.database import get_db
from app.models.user import User
from app.models.research import Alert, AlertNotification
from app.schemas.research import AlertCreate, AlertOut, AlertNotificationOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AlertOut]:
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    return [AlertOut.model_validate(a) for a in result.scalars().all()]


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertOut:
    alert = Alert(
        user_id=current_user.id,
        source=payload.source,
        query=payload.query,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    await db.delete(alert)
    await db.commit()


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=list[AlertNotificationOut])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AlertNotificationOut]:
    result = await db.execute(
        select(AlertNotification)
        .join(Alert, AlertNotification.alert_id == Alert.id)
        .where(Alert.user_id == current_user.id)
        .options(selectinload(AlertNotification.alert))
        .order_by(AlertNotification.created_at.desc())
        .limit(20)
    )
    notifications = result.scalars().all()
    return [
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
        for n in notifications
    ]


@router.patch("/notifications/{notification_id}/read", status_code=204)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    # Verify ownership via join
    result = await db.execute(
        select(AlertNotification)
        .join(Alert, AlertNotification.alert_id == Alert.id)
        .where(
            AlertNotification.id == notification_id,
            Alert.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notification.is_read = True
    await db.commit()
