from pydantic import BaseModel
from app.schemas.research import SearchOut, SavedPaperOut, ReportOut, AlertNotificationOut


class StatItem(BaseModel):
    label: str
    value: str
    delta: str


class DashboardStats(BaseModel):
    stats: list[StatItem]
    recent_searches: list[SearchOut]
    saved_reports: list[ReportOut]
    alerts: list[AlertNotificationOut]
