from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid

from app.database import get_db
from app.models.user import User
from app.models.research import SavedPaper
from app.schemas.research import PaperSaveRequest, SavedPaperOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/papers", tags=["papers"])


@router.get("/saved", response_model=list[SavedPaperOut])
async def get_saved_papers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SavedPaperOut]:
    result = await db.execute(
        select(SavedPaper)
        .where(SavedPaper.user_id == current_user.id)
        .order_by(SavedPaper.saved_at.desc())
    )
    return [SavedPaperOut.model_validate(p) for p in result.scalars().all()]


@router.post("/save", response_model=SavedPaperOut, status_code=status.HTTP_201_CREATED)
async def save_paper(
    payload: PaperSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedPaperOut:
    # Prevent duplicates by title for the same user
    existing = await db.execute(
        select(SavedPaper).where(
            SavedPaper.user_id == current_user.id,
            SavedPaper.title == payload.title,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Paper already saved.",
        )

    paper = SavedPaper(
        user_id=current_user.id,
        title=payload.title,
        authors=payload.authors,
        source=payload.source,
        year=payload.year,
        tag=payload.tag,
        summary=payload.summary,
        paper_url=payload.paper_url,
    )
    db.add(paper)
    await db.commit()
    await db.refresh(paper)
    return SavedPaperOut.model_validate(paper)


@router.delete("/saved/{paper_id}", status_code=204)
async def remove_saved_paper(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        delete(SavedPaper).where(
            SavedPaper.id == paper_id,
            SavedPaper.user_id == current_user.id,
        )
    )
    await db.commit()
