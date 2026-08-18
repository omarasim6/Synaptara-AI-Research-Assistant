import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

MAX_MESSAGE_LENGTH = 4000


class PageContext(BaseModel):
    """Safe, minimal context about what the user is currently looking at.
    Never include anything sensitive — just route/page/feature names."""

    path: str | None = None
    page_name: str | None = None

    @field_validator("path", "page_name")
    @classmethod
    def cap_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 200:
            return v[:200]
        return v


class AssistantMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    conversation_id: uuid.UUID | None = None
    page_context: PageContext | None = None

    @field_validator("message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class AssistantMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AssistantReplyOut(BaseModel):
    conversation_id: uuid.UUID
    message: AssistantMessageOut


class AssistantConversationOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssistantConversationDetailOut(AssistantConversationOut):
    messages: list[AssistantMessageOut]
