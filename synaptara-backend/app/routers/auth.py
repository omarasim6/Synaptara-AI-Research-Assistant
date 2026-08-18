from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserOut,
    TokenResponse,
    GoogleAuthRequest,
    NotificationPreferencesUpdate,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


# ── Google OAuth upsert ───────────────────────────────────────────────────────

@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Called from Next.js authOptions after successful Google OAuth.
    Creates the user on first sign-in, or fetches the existing one.
    Returns a FastAPI JWT so the frontend can make authenticated API calls.
    """
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            name=payload.name.strip(),
            email=payload.email.lower().strip(),
            avatar_url=payload.avatar_url,
            password_hash=None,  # Google users have no password
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update avatar if provided and not already set
        if payload.avatar_url and not user.avatar_url:
            user.avatar_url = payload.avatar_url
            await db.commit()
            await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


# ── Update profile ────────────────────────────────────────────────────────────

@router.patch("/profile", response_model=UserOut)
async def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    if payload.name is not None:
        current_user.name = payload.name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


# ── Notification preferences ──────────────────────────────────────────────────

@router.patch("/notifications", response_model=UserOut)
async def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """
    Persists Email Alerts / Weekly Digest toggle state server-side for the
    authenticated user. The account's existing email address is always used —
    this endpoint never accepts or stores a different email.
    """
    if payload.email_alerts_enabled is not None:
        current_user.email_alerts_enabled = payload.email_alerts_enabled
    if payload.weekly_digest_enabled is not None:
        current_user.weekly_digest_enabled = payload.weekly_digest_enabled

    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


# ── Delete account ───────────────────────────────────────────────────────────

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Permanently deletes the authenticated user's account and all associated
    data (searches, saved papers, reports, alerts, alert notifications) via
    cascading deletes configured on the User relationships / FK constraints.
    """
    await db.delete(current_user)
    await db.commit()
