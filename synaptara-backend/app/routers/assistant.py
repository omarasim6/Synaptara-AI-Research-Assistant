import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.assistant import AssistantConversation, AssistantMessage
from app.schemas.assistant import (
    AssistantMessageCreate,
    AssistantMessageOut,
    AssistantReplyOut,
    AssistantConversationOut,
    AssistantConversationDetailOut,
)
from app.core.deps import get_current_user
from app.services.assistant_service import (
    ASSISTANT_NAME,
    AssistantUnavailableError,
    check_rate_limit,
    get_assistant_reply,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assistant", tags=["assistant"])


async def _get_owned_conversation(
    conversation_id: uuid.UUID, user: User, db: AsyncSession
) -> AssistantConversation:
    result = await db.execute(
        select(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conv


@router.get("/config")
async def assistant_config() -> dict:
    """Safe, public info the client needs before rendering the widget."""
    return {"name": ASSISTANT_NAME}


@router.post("/message", response_model=AssistantReplyOut)
async def send_message(
    payload: AssistantMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssistantReplyOut:
    if not check_rate_limit(str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You're sending messages too quickly. Please wait a moment and try again.",
        )

    # Resolve or create the conversation
    if payload.conversation_id:
        conversation = await _get_owned_conversation(payload.conversation_id, current_user, db)
    else:
        conversation = AssistantConversation(
            user_id=current_user.id,
            title=payload.message[:80],
        )
        db.add(conversation)
        await db.flush()

    # Load prior turns for context
    history_result = await db.execute(
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation.id)
        .order_by(AssistantMessage.created_at)
    )
    history = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    # Persist the user's message
    user_msg = AssistantMessage(
        conversation_id=conversation.id, role="user", content=payload.message
    )
    db.add(user_msg)
    await db.commit()

    try:
        reply_text = await get_assistant_reply(history, payload.message, payload.page_context)
    except AssistantUnavailableError as exc:
        reason = str(exc)
        if reason == "not_configured":
            detail = (
                "Sage isn't fully set up yet — an OPENAI_API_KEY is required on the "
                "backend. Please contact support if this persists."
            )
        elif reason == "provider_quota_exceeded":
            # Distinct from a transient rate limit: the OpenAI project backing
            # this key has no available quota/credits. Retrying won't help
            # until that's fixed, so say so plainly rather than implying
            # "try again in a moment" like the rate-limit case below.
            detail = (
                "Sage is unavailable right now — the backend's OpenAI account has "
                "no available quota/credits. Please contact support."
            )
        elif reason == "provider_rate_limited":
            detail = "Sage is a little busy right now. Please try again in a moment."
        elif reason == "provider_unauthorized":
            detail = (
                "Sage isn't fully set up yet — the backend's OPENAI_API_KEY was "
                "rejected. Please contact support if this persists."
            )
        elif reason == "ollama_not_running":
            detail = (
                "Sage can't reach the local Ollama server. Make sure Ollama is "
                "running on your machine (open PowerShell and run `ollama serve`, "
                "or just open the Ollama app), then try again."
            )
        elif reason == "ollama_model_not_found":
            detail = (
                "Sage's local model isn't downloaded yet. Run "
                "`ollama pull llama3.2:1b` (or whatever OLLAMA_MODEL is set to) "
                "and try again."
            )
        elif reason == "ollama_timeout":
            detail = (
                "Sage's local model is taking too long to respond. This can "
                "happen on the first request after starting Ollama, or on "
                "slower hardware — try again in a moment."
            )
        else:
            detail = "Sage couldn't respond just now. Please try again."
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    except Exception:
        logger.exception("Unexpected error generating assistant reply")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )

    assistant_msg = AssistantMessage(
        conversation_id=conversation.id, role="assistant", content=reply_text
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return AssistantReplyOut(
        conversation_id=conversation.id,
        message=AssistantMessageOut.model_validate(assistant_msg),
    )


@router.get("/conversations", response_model=list[AssistantConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AssistantConversationOut]:
    result = await db.execute(
        select(AssistantConversation)
        .where(AssistantConversation.user_id == current_user.id)
        .order_by(AssistantConversation.updated_at.desc())
        .limit(20)
    )
    return [AssistantConversationOut.model_validate(c) for c in result.scalars().all()]


@router.get("/conversations/{conversation_id}", response_model=AssistantConversationDetailOut)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssistantConversationDetailOut:
    conv = await _get_owned_conversation(conversation_id, current_user, db)
    msgs_result = await db.execute(
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conv.id)
        .order_by(AssistantMessage.created_at)
    )
    messages = [AssistantMessageOut.model_validate(m) for m in msgs_result.scalars().all()]
    return AssistantConversationDetailOut(
        id=conv.id, title=conv.title, created_at=conv.created_at,
        updated_at=conv.updated_at, messages=messages,
    )


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        delete(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.user_id == current_user.id,
        )
    )
    await db.commit()
