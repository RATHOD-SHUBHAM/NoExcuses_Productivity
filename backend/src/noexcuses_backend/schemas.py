import json
import uuid
from datetime import date as Date
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    task_kind: Literal["daily", "monthly"] = "daily"
    """First day of the month (YYYY-MM-01) for monthly goals; omit or null for daily tasks."""

    month_bucket: Date | None = None
    """Optional same-day window (24h HH:MM local) for daily habits only; omit or set both."""
    window_start: str | None = None
    window_end: str | None = None


class TaskOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    task_kind: Literal["daily", "monthly"] = "daily"
    month_bucket: Date | None = None
    window_start: str | None = None
    window_end: str | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "TaskOut":
        ca = row["created_at"]
        if isinstance(ca, str):
            dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
        else:
            dt = ca
        kind_raw = row.get("task_kind")
        kind: Literal["daily", "monthly"] = (
            "monthly" if kind_raw == "monthly" else "daily"
        )
        mb_raw = row.get("month_bucket")
        mb: Date | None = None
        if mb_raw is not None:
            if isinstance(mb_raw, str):
                mb = Date.fromisoformat(mb_raw[:10])
            elif isinstance(mb_raw, datetime):
                mb = mb_raw.date()
            elif isinstance(mb_raw, Date):
                mb = mb_raw
        ws = row.get("window_start")
        we = row.get("window_end")
        return cls(
            id=str(row["id"]),
            title=row["title"],
            created_at=dt,
            task_kind=kind,
            month_bucket=mb,
            window_start=str(ws).strip() if isinstance(ws, str) and ws.strip() else None,
            window_end=str(we).strip() if isinstance(we, str) and we.strip() else None,
        )


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


class CalendarDayTaskOut(BaseModel):
    task_id: str
    title: str
    task_kind: Literal["daily", "monthly"] = "daily"
    month_bucket: Date | None = None
    completed: bool
    rest_today: bool
    window_start: str | None = None
    window_end: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    window_start: str | None = None
    window_end: str | None = None


class CalendarDayOut(BaseModel):
    date: Date
    global_rest: bool
    tasks: list[CalendarDayTaskOut]


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


class WeekendWishlistItem(BaseModel):
    """Single line for the weekend wishlist (not a habit task)."""

    id: str = Field(..., min_length=1, max_length=80)
    text: str = Field(..., min_length=1, max_length=500)
    done: bool = False


def _weekend_wishlist_from_notes(raw: str | None) -> list["WeekendWishlistItem"]:
    if not raw or not str(raw).strip():
        return []
    s = str(raw).strip()
    try:
        data = json.loads(s)
    except json.JSONDecodeError:
        lines = [ln.strip() for ln in s.split("\n") if ln.strip()]
        return [
            WeekendWishlistItem(
                id=str(uuid.uuid4()),
                text=ln[:500],
                done=False,
            )
            for ln in lines
        ]
    if isinstance(data, dict) and "items" in data:
        out: list[WeekendWishlistItem] = []
        for it in data.get("items") or []:
            if isinstance(it, dict):
                tid = str(it.get("id") or uuid.uuid4())
                text = str(it.get("text") or "").strip()
                if not text:
                    continue
                out.append(
                    WeekendWishlistItem(
                        id=tid[:80],
                        text=text[:500],
                        done=bool(it.get("done")),
                    )
                )
            elif isinstance(it, str) and it.strip():
                out.append(
                    WeekendWishlistItem(
                        id=str(uuid.uuid4()),
                        text=it.strip()[:500],
                        done=False,
                    )
                )
        return out
    if isinstance(data, list):
        return [
            WeekendWishlistItem(
                id=str(uuid.uuid4()),
                text=str(x).strip()[:500],
                done=False,
            )
            for x in data
            if str(x).strip()
        ]
    return []


def weekend_notes_json_from_items(items: list["WeekendWishlistItem"]) -> str:
    return json.dumps(
        {
            "v": 1,
            "items": [i.model_dump() for i in items],
        },
        ensure_ascii=False,
    )


class WeekendPlanUpsert(BaseModel):
    """weekend_start = Saturday (YYYY-MM-DD). Items are a wishlist, not tasks."""

    weekend_start: Date
    items: list[WeekendWishlistItem] = Field(default_factory=list, max_length=50)


class WeekendPlanOut(BaseModel):
    id: str | None = None
    weekend_start: Date
    items: list[WeekendWishlistItem]
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "WeekendPlanOut":
        ws = row["weekend_start"]
        if isinstance(ws, str):
            ws = Date.fromisoformat(ws[:10])
        raw_notes = row.get("notes")
        items = _weekend_wishlist_from_notes(
            str(raw_notes) if raw_notes is not None else None,
        )
        return cls(
            id=str(row["id"]) if row.get("id") else None,
            weekend_start=ws,
            items=items,
            created_at=_parse_optional_dt(row.get("created_at")),
            updated_at=_parse_optional_dt(row.get("updated_at")),
        )


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
