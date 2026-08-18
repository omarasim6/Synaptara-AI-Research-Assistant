import math

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid

from app.database import get_db
from app.models.user import User
from app.models.research import Report
from app.schemas.research import ReportCreate, ReportDetailOut, ReportGenerateRequest, ReportOut
from app.core.deps import get_current_user
from app.services.search_service import build_report_markdown, run_search

router = APIRouter(prefix="/reports", tags=["reports"])

# Rough "pages" estimate for a generated report, purely for display.
_WORDS_PER_PAGE = 400


@router.get("", response_model=list[ReportOut])
async def get_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReportOut]:
    result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
    )
    return [ReportOut.model_validate(r) for r in result.scalars().all()]


@router.get("/{report_id}", response_model=ReportDetailOut)
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportDetailOut:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    return ReportDetailOut.model_validate(report)


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportOut:
    report = Report(
        user_id=current_user.id,
        title=payload.title,
        tag=payload.tag,
        content=payload.content,
        pages=payload.pages,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ReportOut.model_validate(report)


@router.post("/generate", response_model=ReportDetailOut, status_code=status.HTTP_201_CREATED)
async def generate_report(
    payload: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportDetailOut:
    """
    Runs a search for the given query and compiles the results into a
    saved, viewable report — this is what "Start a report" / "+ New report"
    in the dashboard actually calls.
    """
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query cannot be empty.")

    results = await run_search(query, payload.source_filter)
    content = build_report_markdown(query, results)

    word_count = len(content.split())
    pages = max(1, math.ceil(word_count / _WORDS_PER_PAGE))

    # Use the top result's tag as the report's category when available,
    # falling back to a generic label for empty result sets.
    tag = results[0].tag if results else "General"

    title = query if len(query) <= 120 else f"{query[:117]}..."

    report = Report(
        user_id=current_user.id,
        title=title,
        tag=tag,
        content=content,
        pages=pages,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ReportDetailOut.model_validate(report)


@router.delete("/{report_id}", status_code=204)
async def delete_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    await db.delete(report)
    await db.commit()
