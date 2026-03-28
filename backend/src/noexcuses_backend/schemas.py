from datetime import date as Date
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)


class TaskOut(BaseModel):
    id: str
    title: str
    created_at: datetime

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "TaskOut":
        ca = row["created_at"]
        if isinstance(ca, str):
            dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
        else:
            dt = ca
        return cls(id=str(row["id"]), title=row["title"], created_at=dt)


class TaskLogOut(BaseModel):
    date: Date
    completed: bool

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "TaskLogOut":
        d = row["date"]
        if isinstance(d, str):
            d = Date.fromisoformat(d[:10])
        return cls(date=d, completed=bool(row["completed"]))


class CompleteBody(BaseModel):
    """Defaults to today (server local date) when omitted; completed defaults to true."""

    date: Date | None = None
    completed: bool = True


class DailyCompletion(BaseModel):
    date: str
    count: int
    """How many per-task rest marks exist on this day (any habit)."""
    rest_marks: int = 0
    """Whole-day rest applies to every habit on this date."""
    global_rest: bool = False


class TaskStatsOut(BaseModel):
    task_id: str
    total_completed_days: int
    current_streak: int
    longest_streak: int
    completion_percent: float
    total_days_tracked: int
    """Days in the tracking window marked as rest (global and/or this task)."""
    rest_days_count: int = 0
    """Days that are completed and/or rest (union) in the window."""
    accounted_days: int = 0
    """Share of tracked days that are either completed or rest."""
    accounted_percent: float = 0.0


class WeeklyReviewUpsert(BaseModel):
    """week_start = Monday of that week (local server date if omitted)."""

    week_start: Date | None = None
    what_worked: str = ""
    what_to_improve: str = ""
    what_to_drop: str = ""


class WeeklyReviewOut(BaseModel):
    id: str | None = None
    week_start: Date
    what_worked: str
    what_to_improve: str
    what_to_drop: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "WeeklyReviewOut":
        ws = row["week_start"]
        if isinstance(ws, str):
            ws = Date.fromisoformat(ws[:10])
        ca = row.get("created_at")
        ua = row.get("updated_at")
        return cls(
            id=str(row["id"]) if row.get("id") else None,
            week_start=ws,
            what_worked=str(row.get("what_worked") or ""),
            what_to_improve=str(row.get("what_to_improve") or ""),
            what_to_drop=str(row.get("what_to_drop") or ""),
            created_at=_parse_optional_dt(ca),
            updated_at=_parse_optional_dt(ua),
        )


def _parse_optional_dt(v: Any) -> datetime | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    return None


class RestDayBody(BaseModel):
    date: Date | None = None


class RestDayOut(BaseModel):
    date: Date

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "RestDayOut":
        d = row["date"]
        if isinstance(d, str):
            d = Date.fromisoformat(d[:10])
        return cls(date=d)


class TaskRestDayOut(BaseModel):
    task_id: str
    date: Date

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "TaskRestDayOut":
        d = row["date"]
        if isinstance(d, str):
            d = Date.fromisoformat(d[:10])
        return cls(task_id=str(row["task_id"]), date=d)
