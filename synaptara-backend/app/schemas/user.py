import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    """Sent from Next.js after successful Google OAuth to upsert the user."""
    email: EmailStr
    name: str
    avatar_url: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v

    @field_validator("avatar_url")
    @classmethod
    def avatar_url_reasonable_size(cls, v: str | None) -> str | None:
        # Profile pictures are compressed client-side into a small base64
        # data URL before being sent here (see the avatar upload flow in
        # the profile page). ~350KB of base64 comfortably covers that while
        # still rejecting anyone trying to smuggle a huge, unoptimized
        # image through this field.
        if v is not None and len(v) > 350_000:
            raise ValueError("Image is too large. Please choose a smaller photo.")
        return v


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    avatar_url: str | None
    plan: str
    email_alerts_enabled: bool
    weekly_digest_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreferencesUpdate(BaseModel):
    email_alerts_enabled: bool | None = None
    weekly_digest_enabled: bool | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
