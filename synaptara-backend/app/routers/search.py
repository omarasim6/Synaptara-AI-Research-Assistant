from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid

from app.database import get_db
from app.models.user import User
from app.models.research import Search
from app.schemas.research import SearchCreate, SearchOut, SearchResponse
from app.core.deps import get_current_user
from app.services.search_service import run_search

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(
    payload: SearchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    """Run a search and persist it to the user's history."""
    results = await run_search(payload.query, payload.source_filter)

    # Persist search record
    record = Search(
        user_id=current_user.id,
        query=payload.query,
        results_count=len(results),
        source_filter=payload.source_filter,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return SearchResponse(
        query=payload.query,
        total=len(results),
        results=results,
        search_id=record.id,
    )


@router.get("/history", response_model=list[SearchOut])
async def get_search_history(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SearchOut]:
    result = await db.execute(
        select(Search)
        .where(Search.user_id == current_user.id)
        .order_by(Search.created_at.desc())
        .limit(limit)
    )
    return [SearchOut.model_validate(r) for r in result.scalars().all()]


@router.delete("/history/{search_id}", status_code=204)
async def delete_search(
    search_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        delete(Search).where(
            Search.id == search_id, Search.user_id == current_user.id
        )
    )
    await db.commit()
