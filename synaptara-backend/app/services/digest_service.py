"""
Builds the personalized Weekly Digest for a user from data the app already
tracks: their Search history (most searched) and SavedPaper library
(most read / saved, interests). Never fabricates activity — sections are
simply omitted when the user has no data for them.
"""
from datetime import datetime, timedelta, timezone
from collections import Counter

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.research import Search, SavedPaper


async def build_digest_data(user: User, db: AsyncSession) -> dict:
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    searches_result = await db.execute(
        select(Search).where(Search.user_id == user.id, Search.created_at >= one_week_ago)
    )
    searches = searches_result.scalars().all()
    top_queries = [q for q, _ in Counter(s.query for s in searches).most_common(5)]

    saved_result = await db.execute(
        select(SavedPaper)
        .where(SavedPaper.user_id == user.id, SavedPaper.saved_at >= one_week_ago)
        .order_by(SavedPaper.saved_at.desc())
    )
    recent_saved = saved_result.scalars().all()

    # "Interests" = tags on saved papers + distinct search queries, i.e. only
    # topics the user's own activity actually produced.
    interests = list(dict.fromkeys([p.tag for p in recent_saved] + top_queries))[:8]

    return {
        "top_searches": top_queries,
        "most_read": [{"title": p.title, "source": p.source, "tag": p.tag} for p in recent_saved[:5]],
        "interests": interests,
        "search_count": len(searches),
        "saved_count": len(recent_saved),
    }


def has_any_activity(digest: dict) -> bool:
    return bool(digest["top_searches"] or digest["most_read"] or digest["interests"])


def render_digest_email(user: User, digest: dict) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    subject = "Your Synaptara weekly digest"

    def _section(title: str, items: list[str]) -> str:
        if not items:
            return ""
        rows = "".join(f"<li>{i}</li>" for i in items)
        return f"<h3 style='margin:16px 0 8px'>{title}</h3><ul style='margin:0;padding-left:20px'>{rows}</ul>"

    most_read_items = [f"{p['title']} — {p['source']} ({p['tag']})" for p in digest["most_read"]]

    body_sections = (
        _section("Top searches this week", digest["top_searches"])
        + _section("Most-read papers", most_read_items)
        + _section("Your interests", digest["interests"])
    )

    if not body_sections:
        body_sections = "<p>No new activity this week — search or save a paper to see it here next time.</p>"

    html = f"""
    <div style="font-family: -apple-system, Arial, sans-serif; color: #1a3a35; max-width: 560px; margin: 0 auto;">
      <h2 style="margin-bottom:4px">Weekly overview</h2>
      <p style="color:#4a7c6f; margin-top:0">Hi {user.name}, here's your research activity from the past week.</p>
      {body_sections}
      <p style="margin-top:24px; font-size:12px; color:#4a7c6f">
        You're receiving this because Weekly Digest is enabled in your Synaptara settings.
      </p>
    </div>
    """
    return subject, html
