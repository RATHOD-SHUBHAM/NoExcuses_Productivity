import csv
import logging
import re
from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from io import StringIO
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, PlainTextResponse
from postgrest.exceptions import APIError
from supabase import Client

from noexcuses_backend.schemas import (
    CalendarDayOut,
    CalendarDayTaskOut,
    CompleteBody,
    DailyCompletion,
    DayCheckinBucketOut,
    DayCheckinSummaryOut,
    RestDayBody,
    RestDayOut,
    TaskCreate,
    TaskLogOut,
    TaskOut,
    TaskUpdate,
    TaskRestDayOut,
    TaskStatsOut,
    WeeklyReviewOut,
    WeeklyReviewUpsert,
    WeekendPlanOut,
    WeekendPlanUpsert,
    weekend_notes_json_from_items,
)
from noexcuses_backend.services import stats as stats_svc
from noexcuses_backend.deps import get_supabase_user
from noexcuses_backend.supabase_client import run_query

router = APIRouter(prefix="/api", tags=["api"])
_log = logging.getLogger(__name__)

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def _coerce_hhmm(value: str | None) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if not _HHMM_RE.match(s):
        raise HTTPException(
            status_code=400,
            detail="Window times must be HH:MM in 24h (e.g. 09:00, 17:30).",
        )
    return s


def _daily_window_pair(
    start: str | None,
    end: str | None,
) -> tuple[str | None, str | None]:
    cs = _coerce_hhmm(start)
    ce = _coerce_hhmm(end)
    if cs is None and ce is None:
        return None, None
    if cs is None or ce is None:
        raise HTTPException(
            status_code=400,
            detail="Provide both window_start and window_end, or omit both.",
        )
    if cs >= ce:
        raise HTTPException(
            status_code=400,
            detail="window_end must be after window_start (same calendar day).",
        )
    return cs, ce


def _row_hhmm(row: dict[str, Any], key: str) -> str | None:
    v = row.get(key)
    if v is None:
        return None
    if isinstance(v, str) and v.strip():
        return v.strip()
    return None

_RLS_HELP = (
    "Row-level security blocked this operation. Ensure the request sends a valid "
    "Supabase access token (Authorization: Bearer …) and that SUPABASE_KEY on the API is "
    "the anon/publishable key, not the service_role or secret key."
)

# Tables (Supabase/Postgres): public.tasks, public.task_logs, rest_days,
# weekly_reviews, task_rest_days (see backend/sql/*.sql).
# task_logs: at most one row per (task_id, date).
# task_rest_days: optional per-task rest dates; merged with global rest_days for streaks.


def _parse_task_row_created_at(row: dict[str, Any]) -> datetime:
    ca = row["created_at"]
    if isinstance(ca, str):
        return datetime.fromisoformat(ca.replace("Z", "+00:00"))
    return ca


def _http_from_api_error(exc: APIError) -> None:
    # postgrest.APIError stores fields on the exception; exc.args[0] is str(self), not JSON.
    msg = (exc.message or "").lower()
    code = str(exc.code or "").lower()
    details = (exc.details or "").lower()
    hint = (exc.hint or "").lower()
    combined = f"{msg} {details} {hint} {code}"
    rls_or_denied = (
        code == "42501"
        or "42501" in combined
        or "row-level security" in combined
        or "permission denied" in combined
        or "insufficient_privilege" in combined
    )
    if rls_or_denied:
        raise HTTPException(status_code=403, detail=_RLS_HELP) from exc
    detail = exc.message or str(exc)
    if exc.details:
        detail = f"{detail} ({exc.details})"
    _log.warning("PostgREST error (non-RLS): %s", exc.json())
    raise HTTPException(status_code=502, detail=f"Database error: {detail}") from exc


_TASK_REST_DAYS_SETUP = (
    "Per-task rest needs the table public.task_rest_days. In Supabase: SQL Editor → "
    "run backend/sql/004_task_rest_days.sql (after 003). If errors persist, wait a "
    "minute or restart the project so PostgREST reloads the schema cache."
)


def _is_task_rest_days_table_missing(exc: APIError) -> bool:
    blob = f"{exc.message or ''} {exc.details or ''} {exc.hint or ''} {exc.code or ''}".lower()
    if "task_rest_days" not in blob:
        return False
    return (
        "could not find" in blob
        or "schema cache" in blob
        or "does not exist" in blob
        or "undefined_table" in blob
    )


def _task_kind_from_row(row: dict[str, Any]) -> str:
    return "monthly" if row.get("task_kind") == "monthly" else "daily"


def _month_bucket_iso(row: dict[str, Any]) -> str | None:
    mb = row.get("month_bucket")
    if mb is None:
        return None
    if isinstance(mb, str):
        return mb[:10]
    if isinstance(mb, datetime):
        return mb.date().isoformat()
    if isinstance(mb, date) and not isinstance(mb, datetime):
        return mb.isoformat()
    return None


def _daily_for_date_from_row(row: dict[str, Any]) -> date | None:
    v = row.get("daily_for_date")
    if v is None:
        return None
    if isinstance(v, str):
        return date.fromisoformat(v[:10])
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    return None


def _daily_task_applies_on_day(task_row: dict[str, Any], on: date) -> bool:
    if _task_kind_from_row(task_row) != "daily":
        return False
    dfd = _daily_for_date_from_row(task_row)
    if dfd is None:
        created = _parse_task_row_created_at(task_row).date()
        return created <= on
    return dfd == on


def _monthly_task_applies_on_day(task_row: dict[str, Any], on: date) -> bool:
    if _task_kind_from_row(task_row) != "monthly":
        return False
    mb = _month_bucket_iso(task_row)
    if mb is None:
        return False
    want = date(on.year, on.month, 1).isoformat()
    return mb == want


def _checkin_bucket_for_tasks(
    task_rows: list[dict[str, Any]],
    log_map: dict[str, bool],
    task_rest_ids: set[str],
) -> DayCheckinBucketOut:
    completed = 0
    incomplete = 0
    rested = 0
    for row in task_rows:
        tid = str(row["id"])
        if tid in task_rest_ids:
            rested += 1
            continue
        if log_map.get(tid, False):
            completed += 1
        else:
            incomplete += 1
    expected = completed + incomplete
    return DayCheckinBucketOut(
        expected=expected,
        completed=completed,
        incomplete=incomplete,
        rested=rested,
    )


def _parse_date_cell(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        return date.fromisoformat(value[:10])
    raise ValueError("Unsupported date value")


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _load_rest_days_set(db: Client) -> set[date]:
    res = run_query(lambda: db.table("rest_days").select("date"))
    out: set[date] = set()
    for r in res.data or []:
        out.add(_parse_date_cell(r["date"]))
    return out


def _load_task_rest_days_set(db: Client, task_id: str) -> set[date]:
    try:
        res = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("date")
                .eq("task_id", task_id)
            )
        )
    except APIError as e:
        if _is_task_rest_days_table_missing(e):
            return set()
        _http_from_api_error(e)
    out: set[date] = set()
    for r in res.data or []:
        out.add(_parse_date_cell(r["date"]))
    return out


def _effective_rest_days_for_task(db: Client, task_id: str) -> set[date]:
    return _load_rest_days_set(db) | _load_task_rest_days_set(db, task_id)


def _normalize_week_start(raw: date | None) -> date:
    return _monday_of(raw or date.today())


def _stats_calendar_today(as_of: date | None) -> date:
    """Last calendar day included in habit stats. Prefer the browser's date when passed."""
    server = date.today()
    if as_of is None:
        return server
    # Allow up to one day ahead of server (timezones ahead of the API host).
    cap = server + timedelta(days=1)
    return as_of if as_of <= cap else cap


def _stats_window_bounds(created_at: date, as_of: date | None) -> tuple[date, date]:
    """Inclusive [low, high] covering both DB creation (UTC calendar) and caller 'today'.

    If the browser date is *before* the UTC creation date (common across timezones),
    a naive loop `created_at .. as_of` would run zero times and miss rest/completions
    stored on the user's local calendar day.
    """
    end_ref = _stats_calendar_today(as_of)
    low = min(created_at, end_ref)
    high = max(created_at, end_ref)
    return low, high


@router.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(
    body: TaskCreate,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> TaskOut:
    title = body.title.strip()
    if body.task_kind == "monthly":
        if body.window_start is not None or body.window_end is not None:
            raise HTTPException(
                status_code=400,
                detail="Time windows apply to daily habits only.",
            )
        if body.daily_for_date is not None:
            raise HTTPException(
                status_code=400,
                detail="daily_for_date applies to daily tasks only.",
            )
        if body.month_bucket is None:
            raise HTTPException(
                status_code=400,
                detail="month_bucket (first day of the month) is required for monthly goals",
            )
        row = {
            "title": title,
            "task_kind": "monthly",
            "month_bucket": body.month_bucket.isoformat(),
        }
    else:
        ws, we = _daily_window_pair(body.window_start, body.window_end)
        dfd = body.daily_for_date.isoformat() if body.daily_for_date is not None else None
        row = {
            "title": title,
            "task_kind": "daily",
            "month_bucket": None,
            "window_start": ws,
            "window_end": we,
            "daily_for_date": dfd,
        }
    try:
        res = run_query(lambda: db.table("tasks").insert(row))
    except APIError as e:
        _http_from_api_error(e)
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create task")
    return TaskOut.from_row(res.data[0])


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(db: Annotated[Client, Depends(get_supabase_user)]) -> list[TaskOut]:
    res = run_query(lambda: db.table("tasks").select("*").order("created_at", desc=True))
    rows = res.data or []
    return [TaskOut.from_row(r) for r in rows]


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def patch_task(
    task_id: str,
    body: TaskUpdate,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> TaskOut:
    res = run_query(lambda: db.table("tasks").select("*").eq("id", task_id).limit(1))
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    row0 = res.data[0]
    kind = _task_kind_from_row(row0)
    data = body.model_dump(exclude_unset=True)
    patch: dict[str, Any] = {}

    if "title" in data and data["title"] is not None:
        t = str(data["title"]).strip()
        if not t:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        patch["title"] = t

    if kind == "monthly" and ("window_start" in data or "window_end" in data):
        raise HTTPException(
            status_code=400,
            detail="Time windows apply to daily habits only.",
        )

    if kind == "daily" and ("window_start" in data or "window_end" in data):
        ns = data["window_start"] if "window_start" in data else _row_hhmm(row0, "window_start")
        ne = data["window_end"] if "window_end" in data else _row_hhmm(row0, "window_end")
        cs, ce = _daily_window_pair(ns, ne)
        patch["window_start"] = cs
        patch["window_end"] = ce

    if not patch:
        return TaskOut.from_row(row0)

    try:
        upd = run_query(
            lambda: db.table("tasks").update(patch).eq("id", task_id),
        )
    except APIError as e:
        _http_from_api_error(e)
    if not upd.data:
        raise HTTPException(status_code=500, detail="Failed to update task")
    return TaskOut.from_row(upd.data[0])


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> None:
    exists = run_query(lambda: db.table("tasks").select("id").eq("id", task_id).limit(1))
    if not exists.data:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        run_query(lambda: db.table("tasks").delete().eq("id", task_id))
    except APIError as e:
        _http_from_api_error(e)


@router.post("/tasks/{task_id}/complete", response_model=TaskLogOut)
def mark_completed_for_day(
    task_id: str,
    db: Annotated[Client, Depends(get_supabase_user)],
    body: CompleteBody | None = None,
) -> TaskLogOut:
    b = body if body is not None else CompleteBody()
    day = b.date if b.date is not None else date.today()
    day_str = day.isoformat()
    want_completed = b.completed

    try:
        task = run_query(lambda: db.table("tasks").select("id").eq("id", task_id).limit(1))
        if not task.data:
            raise HTTPException(status_code=404, detail="Task not found")

        existing = run_query(
            lambda: (
                db.table("task_logs")
                .select("id, completed")
                .eq("task_id", task_id)
                .eq("date", day_str)
                .limit(1)
            )
        )

        if not existing.data:
            if not want_completed:
                return TaskLogOut(date=day, completed=False)
            ins = run_query(
                lambda: (
                    db.table("task_logs")
                    .insert(
                        {"task_id": task_id, "date": day_str, "completed": True},
                    )
                )
            )
            if not ins.data:
                raise HTTPException(status_code=500, detail="Failed to insert log")
            return TaskLogOut.from_row(ins.data[0])

        row = existing.data[0]
        log_id = row["id"]
        current = row.get("completed") is True

        if current == want_completed:
            out = run_query(
                lambda: (
                    db.table("task_logs")
                    .select("*")
                    .eq("id", log_id)
                    .limit(1)
                )
            )
            if not out.data:
                raise HTTPException(status_code=500, detail="Log read failed")
            return TaskLogOut.from_row(out.data[0])

        upd = run_query(
            lambda: (
                db.table("task_logs")
                .update({"completed": want_completed})
                .eq("id", log_id)
            )
        )
        if not upd.data:
            raise HTTPException(status_code=500, detail="Failed to update log")
        return TaskLogOut.from_row(upd.data[0])
    except APIError as e:
        _http_from_api_error(e)


@router.get("/stats/monthly-completions", response_model=list[DailyCompletion])
def monthly_completions(
    db: Annotated[Client, Depends(get_supabase_user)],
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    from_date: date | None = Query(
        None,
        alias="from",
        description="Inclusive range start (YYYY-MM-DD). Use with `to` for a window around today.",
    ),
    to_date: date | None = Query(
        None,
        alias="to",
        description="Inclusive range end (YYYY-MM-DD). Use with `from`.",
    ),
    month_bucket: date | None = Query(
        None,
        description="First day of month (YYYY-MM-01) for monthly task_kind when using from/to.",
    ),
    task_kind: Literal["all", "daily", "monthly"] = Query(
        "all",
        description="Filter completions: daily todos only, monthly goals for this month only, or all tasks.",
    ),
) -> list[DailyCompletion]:
    today = date.today()
    if (from_date is None) ^ (to_date is None):
        raise HTTPException(
            status_code=400,
            detail="Provide both `from` and `to`, or neither (use year and month).",
        )

    if from_date is not None and to_date is not None:
        start = min(from_date, to_date)
        end = max(from_date, to_date)
    else:
        y = year if year is not None else today.year
        m = month if month is not None else today.month
        start = date(y, m, 1)
        end = date(y, m, monthrange(y, m)[1])

    start_s = start.isoformat()
    end_s = end.isoformat()

    allowed_ids: set[str] | None = None
    if task_kind in ("daily", "monthly"):
        try:
            tasks_res = run_query(
                lambda: db.table("tasks").select("id, task_kind, month_bucket"),
            )
        except APIError as e:
            _http_from_api_error(e)
        task_rows = tasks_res.data or []
        if task_kind == "daily":
            allowed_ids = {
                str(t["id"]) for t in task_rows if _task_kind_from_row(t) == "daily"
            }
        else:
            mb_filter = (
                month_bucket.isoformat()[:10]
                if month_bucket is not None
                else date(start.year, start.month, 1).isoformat()
            )
            allowed_ids = {
                str(t["id"])
                for t in task_rows
                if _task_kind_from_row(t) == "monthly"
                and _month_bucket_iso(t) == mb_filter
            }

    # Count rows with completed=true per calendar day (task_logs.date)
    res = run_query(
        lambda: (
            db.table("task_logs")
            .select("task_id, date")
            .eq("completed", True)
            .gte("date", start_s)
            .lte("date", end_s)
        )
    )
    rows = res.data or []
    counts: dict[str, int] = {}
    for r in rows:
        tid = str(r["task_id"])
        if allowed_ids is not None and tid not in allowed_ids:
            continue
        d = _parse_date_cell(r["date"]).isoformat()
        counts[d] = counts.get(d, 0) + 1

    rest_marks_by_day: dict[str, int] = defaultdict(int)
    try:
        tr = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("task_id, date")
                .gte("date", start_s)
                .lte("date", end_s)
            )
        )
        for r in tr.data or []:
            tid = str(r["task_id"])
            if allowed_ids is not None and tid not in allowed_ids:
                continue
            ds = _parse_date_cell(r["date"]).isoformat()
            rest_marks_by_day[ds] += 1
    except APIError:
        pass

    global_rest_days: set[str] = set()
    try:
        gr = run_query(
            lambda: (
                db.table("rest_days")
                .select("date")
                .gte("date", start_s)
                .lte("date", end_s)
            )
        )
        for r in gr.data or []:
            global_rest_days.add(_parse_date_cell(r["date"]).isoformat())
    except APIError:
        pass

    out: list[DailyCompletion] = []
    d = start
    while d <= end:
        ds = d.isoformat()
        out.append(
            DailyCompletion(
                date=ds,
                count=counts.get(ds, 0),
                rest_marks=rest_marks_by_day.get(ds, 0),
                global_rest=ds in global_rest_days,
            )
        )
        d += timedelta(days=1)

    return out


@router.get("/stats/day-checkin", response_model=DayCheckinSummaryOut)
def day_checkin_summary(
    db: Annotated[Client, Depends(get_supabase_user)],
    on: date = Query(..., description="Calendar date (YYYY-MM-DD), browser-local."),
) -> DayCheckinSummaryOut:
    """Done vs not done for daily and monthly tasks that apply on this day (excludes per-task rest from expected)."""
    day_str = on.isoformat()
    try:
        tasks_res = run_query(
            lambda: db.table("tasks").select("*").order("created_at", desc=True)
        )
    except APIError as e:
        _http_from_api_error(e)
    task_rows = tasks_res.data or []

    global_rest = False
    try:
        gr = run_query(
            lambda: (
                db.table("rest_days")
                .select("date")
                .eq("date", day_str)
                .limit(1)
            )
        )
        global_rest = bool(gr.data)
    except APIError:
        pass

    empty_bucket = DayCheckinBucketOut(
        expected=0, completed=0, incomplete=0, rested=0
    )
    if global_rest:
        return DayCheckinSummaryOut(
            date=on,
            global_rest=True,
            daily=empty_bucket,
            monthly=empty_bucket,
        )

    log_map: dict[str, bool] = {}
    try:
        logs = run_query(
            lambda: (
                db.table("task_logs")
                .select("task_id, completed")
                .eq("date", day_str)
            )
        )
        for r in logs.data or []:
            log_map[str(r["task_id"])] = r.get("completed") is True
    except APIError as e:
        _http_from_api_error(e)

    task_rest_ids: set[str] = set()
    try:
        tr = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("task_id")
                .eq("date", day_str)
            )
        )
        for r in tr.data or []:
            task_rest_ids.add(str(r["task_id"]))
    except APIError as e:
        if not _is_task_rest_days_table_missing(e):
            _http_from_api_error(e)

    daily_rows = [
        r for r in task_rows if _daily_task_applies_on_day(r, on)
    ]
    monthly_rows = [
        r for r in task_rows if _monthly_task_applies_on_day(r, on)
    ]

    return DayCheckinSummaryOut(
        date=on,
        global_rest=False,
        daily=_checkin_bucket_for_tasks(daily_rows, log_map, task_rest_ids),
        monthly=_checkin_bucket_for_tasks(monthly_rows, log_map, task_rest_ids),
    )


def _task_visible_on_day(task_row: dict[str, Any], on: date) -> bool:
    if _task_kind_from_row(task_row) == "daily":
        return _daily_task_applies_on_day(task_row, on)
    return _monthly_task_applies_on_day(task_row, on)


@router.get("/calendar/day", response_model=CalendarDayOut)
def calendar_day(
    db: Annotated[Client, Depends(get_supabase_user)],
    on: date = Query(..., description="Calendar date (YYYY-MM-DD), browser-local."),
) -> CalendarDayOut:
    """Tasks and completion/rest state for a single day (in-app calendar detail panel)."""
    day_str = on.isoformat()
    try:
        tasks_res = run_query(
            lambda: db.table("tasks").select("*").order("created_at", desc=True)
        )
    except APIError as e:
        _http_from_api_error(e)
    task_rows = [r for r in (tasks_res.data or []) if _task_visible_on_day(r, on)]

    log_map: dict[str, bool] = {}
    try:
        logs = run_query(
            lambda: (
                db.table("task_logs")
                .select("task_id, completed")
                .eq("date", day_str)
            )
        )
        for r in logs.data or []:
            log_map[str(r["task_id"])] = r.get("completed") is True
    except APIError as e:
        _http_from_api_error(e)

    task_rest_ids: set[str] = set()
    try:
        tr = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("task_id")
                .eq("date", day_str)
            )
        )
        for r in tr.data or []:
            task_rest_ids.add(str(r["task_id"]))
    except APIError as e:
        if not _is_task_rest_days_table_missing(e):
            _http_from_api_error(e)

    global_rest = False
    try:
        gr = run_query(
            lambda: (
                db.table("rest_days")
                .select("date")
                .eq("date", day_str)
                .limit(1)
            )
        )
        global_rest = bool(gr.data)
    except APIError:
        pass

    out_tasks: list[CalendarDayTaskOut] = []
    for row in task_rows:
        tid = str(row["id"])
        mb_raw = row.get("month_bucket")
        mb_d: date | None = None
        if mb_raw is not None:
            if isinstance(mb_raw, str):
                mb_d = date.fromisoformat(mb_raw[:10])
            elif isinstance(mb_raw, datetime):
                mb_d = mb_raw.date()
            elif isinstance(mb_raw, date) and not isinstance(mb_raw, datetime):
                mb_d = mb_raw
        kind: Literal["daily", "monthly"] = (
            "monthly" if row.get("task_kind") == "monthly" else "daily"
        )
        wsa = _row_hhmm(row, "window_start")
        wea = _row_hhmm(row, "window_end")
        out_tasks.append(
            CalendarDayTaskOut(
                task_id=tid,
                title=str(row.get("title") or ""),
                task_kind=kind,
                month_bucket=mb_d,
                completed=log_map.get(tid, False),
                rest_today=tid in task_rest_ids,
                window_start=wsa if kind == "daily" else None,
                window_end=wea if kind == "daily" else None,
            )
        )

    out_tasks.sort(
        key=lambda t: (
            t.window_start or "99:99",
            t.title,
        ),
    )

    return CalendarDayOut(date=on, global_rest=global_rest, tasks=out_tasks)


@router.get("/tasks/{task_id}/logs", response_model=list[TaskLogOut])
def task_logs(
    task_id: str,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> list[TaskLogOut]:
    task = run_query(lambda: db.table("tasks").select("id").eq("id", task_id).limit(1))
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")

    res = run_query(
        lambda: (
            db.table("task_logs")
            .select("date, completed")
            .eq("task_id", task_id)
            .order("date")
        )
    )
    rows = res.data or []
    return [TaskLogOut.from_row(r) for r in rows]


@router.get("/tasks/{task_id}/stats", response_model=TaskStatsOut)
def task_stats(
    task_id: str,
    db: Annotated[Client, Depends(get_supabase_user)],
    as_of: date | None = Query(
        None,
        description=(
            "Caller calendar 'today' (YYYY-MM-DD), e.g. browser-local. "
            "When omitted, the API host date is used — can mismatch rest/completion "
            "dates from the client in other timezones."
        ),
    ),
) -> TaskStatsOut:
    t = run_query(lambda: db.table("tasks").select("*").eq("id", task_id).limit(1))
    if not t.data:
        raise HTTPException(status_code=404, detail="Task not found")
    task_row = t.data[0]

    logs = run_query(
        lambda: (
            db.table("task_logs")
            .select("date, completed")
            .eq("task_id", task_id)
        )
    )
    rows = logs.data or []
    # Stats window starts at task creation (tasks.created_at)
    created_at = _parse_task_row_created_at(task_row).date()
    completed_dates: set[date] = set()
    total_completed_days = 0
    for r in rows:
        if r.get("completed") is True:
            total_completed_days += 1
            completed_dates.add(_parse_date_cell(r["date"]))

    low, high = _stats_window_bounds(created_at, as_of)
    today_for_streak = _stats_calendar_today(as_of)
    pct = stats_svc.completion_percent(total_completed_days, low, high)
    rest_days = _effective_rest_days_for_task(db, task_id)
    total_days = stats_svc.total_days_tracked(low, high)
    rest_days_count = 0
    accounted_days = 0
    d = low
    while d <= high:
        in_rest = d in rest_days
        done = d in completed_dates
        if in_rest:
            rest_days_count += 1
        if done or in_rest:
            accounted_days += 1
        d += timedelta(days=1)
    accounted_percent = (
        round(min(100.0, (accounted_days / total_days) * 100.0), 2)
        if total_days > 0
        else 0.0
    )
    return TaskStatsOut(
        task_id=str(task_row["id"]),
        total_completed_days=total_completed_days,
        current_streak=stats_svc.current_streak_from_today(
            today_for_streak, completed_dates, rest_days
        ),
        longest_streak=stats_svc.longest_streak(completed_dates, rest_days),
        completion_percent=pct,
        total_days_tracked=total_days,
        rest_days_count=rest_days_count,
        accounted_days=accounted_days,
        accounted_percent=accounted_percent,
    )


@router.get("/task-rest-days", response_model=list[TaskRestDayOut])
def list_task_rest_days_on_date(
    db: Annotated[Client, Depends(get_supabase_user)],
    on: date = Query(..., description="Calendar day (YYYY-MM-DD)"),
) -> list[TaskRestDayOut]:
    """All tasks marked as resting on this day (per-task rest only; not global rest_days)."""
    ds = on.isoformat()
    try:
        res = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("task_id, date")
                .eq("date", ds)
            )
        )
    except APIError as e:
        if _is_task_rest_days_table_missing(e):
            return []
        _http_from_api_error(e)
    rows = res.data or []
    return [TaskRestDayOut.from_row(r) for r in rows]


@router.get("/tasks/{task_id}/rest-days", response_model=list[RestDayOut])
def list_task_rest_days_for_task(
    task_id: str,
    db: Annotated[Client, Depends(get_supabase_user)],
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
) -> list[RestDayOut]:
    task = run_query(lambda: db.table("tasks").select("id").eq("id", task_id).limit(1))
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")
    df, dt = date_from, date_to

    def _build():
        q = (
            db.table("task_rest_days")
            .select("date")
            .eq("task_id", task_id)
            .order("date")
        )
        if df is not None:
            q = q.gte("date", df.isoformat())
        if dt is not None:
            q = q.lte("date", dt.isoformat())
        return q

    try:
        res = run_query(_build)
    except APIError as e:
        if _is_task_rest_days_table_missing(e):
            return []
        _http_from_api_error(e)
    rows = res.data or []
    return [RestDayOut.from_row(r) for r in rows]


@router.post("/tasks/{task_id}/rest-days", response_model=RestDayOut, status_code=201)
def add_task_rest_day(
    task_id: str,
    db: Annotated[Client, Depends(get_supabase_user)],
    body: RestDayBody | None = None,
) -> RestDayOut:
    task = run_query(lambda: db.table("tasks").select("id").eq("id", task_id).limit(1))
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")
    d = (body.date if body else None) or date.today()
    ds = d.isoformat()
    try:
        run_query(
            lambda: db.table("task_rest_days").insert(
                {"task_id": task_id, "date": ds},
            )
        )
    except APIError as e:
        if _is_task_rest_days_table_missing(e):
            raise HTTPException(status_code=503, detail=_TASK_REST_DAYS_SETUP) from e
        # duplicate key / other insert noise — fall through to select
    try:
        res = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("date")
                .eq("task_id", task_id)
                .eq("date", ds)
                .limit(1)
            )
        )
    except APIError as e:
        if _is_task_rest_days_table_missing(e):
            raise HTTPException(status_code=503, detail=_TASK_REST_DAYS_SETUP) from e
        _http_from_api_error(e)
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to add task rest day")
    return RestDayOut.from_row(res.data[0])


@router.delete("/tasks/{task_id}/rest-days/{day}", status_code=204)
def remove_task_rest_day(
    task_id: str,
    day: str,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> None:
    task = run_query(lambda: db.table("tasks").select("id").eq("id", task_id).limit(1))
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        run_query(
            lambda: (
                db.table("task_rest_days")
                .delete()
                .eq("task_id", task_id)
                .eq("date", day)
            )
        )
    except APIError as e:
        if _is_task_rest_days_table_missing(e):
            return None
        _http_from_api_error(e)


@router.get("/weekly-review", response_model=WeeklyReviewOut)
def get_weekly_review(
    db: Annotated[Client, Depends(get_supabase_user)],
    week_start: date | None = Query(None, description="Any day in the week; normalized to Monday"),
) -> WeeklyReviewOut:
    mon = _normalize_week_start(week_start)
    mon_s = mon.isoformat()
    try:
        res = run_query(
            lambda: (
                db.table("weekly_reviews")
                .select("*")
                .eq("week_start", mon_s)
                .limit(1)
            )
        )
    except APIError as e:
        _http_from_api_error(e)
    if not res.data:
        return WeeklyReviewOut(
            id=None,
            week_start=mon,
            what_worked="",
            what_to_improve="",
            what_to_drop="",
            created_at=None,
            updated_at=None,
        )
    return WeeklyReviewOut.from_row(res.data[0])


@router.get("/weekly-reviews", response_model=list[WeeklyReviewOut])
def list_weekly_reviews(
    db: Annotated[Client, Depends(get_supabase_user)],
    limit: int = Query(100, ge=1, le=500),
) -> list[WeeklyReviewOut]:
    try:
        res = run_query(
            lambda: (
                db.table("weekly_reviews")
                .select("*")
                .order("week_start", desc=True)
                .limit(limit)
            )
        )
    except APIError as e:
        _http_from_api_error(e)
    rows = res.data or []
    return [WeeklyReviewOut.from_row(r) for r in rows]


@router.put("/weekly-review", response_model=WeeklyReviewOut)
def upsert_weekly_review(
    body: WeeklyReviewUpsert,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> WeeklyReviewOut:
    mon = _normalize_week_start(body.week_start)
    mon_s = mon.isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "week_start": mon_s,
        "what_worked": body.what_worked,
        "what_to_improve": body.what_to_improve,
        "what_to_drop": body.what_to_drop,
        "updated_at": now_iso,
    }
    try:
        ex = run_query(
            lambda: (
                db.table("weekly_reviews")
                .select("id")
                .eq("week_start", mon_s)
                .limit(1)
            )
        )
        if ex.data:
            run_query(
                lambda: (
                    db.table("weekly_reviews").update(payload).eq("week_start", mon_s)
                )
            )
        else:
            run_query(
                lambda: (
                    db.table("weekly_reviews").insert(
                        {**payload, "created_at": now_iso},
                    )
                )
            )
        out = run_query(
            lambda: (
                db.table("weekly_reviews")
                .select("*")
                .eq("week_start", mon_s)
                .limit(1)
            )
        )
    except APIError as e:
        _http_from_api_error(e)
    if not out.data:
        raise HTTPException(status_code=500, detail="Weekly review save failed")
    return WeeklyReviewOut.from_row(out.data[0])


def _assert_saturday(d: date) -> None:
    if d.weekday() != 5:
        raise HTTPException(
            status_code=400,
            detail="weekend_start must be a Saturday (YYYY-MM-DD).",
        )


@router.get("/weekend-plan", response_model=WeekendPlanOut)
def get_weekend_plan(
    db: Annotated[Client, Depends(get_supabase_user)],
    weekend_start: date = Query(..., description="Saturday of that weekend"),
) -> WeekendPlanOut:
    _assert_saturday(weekend_start)
    ws = weekend_start.isoformat()
    try:
        res = run_query(
            lambda: (
                db.table("weekend_plans")
                .select("*")
                .eq("weekend_start", ws)
                .limit(1)
            )
        )
    except APIError as e:
        _http_from_api_error(e)
    if not res.data:
        return WeekendPlanOut(
            id=None,
            weekend_start=weekend_start,
            items=[],
            created_at=None,
            updated_at=None,
        )
    return WeekendPlanOut.from_row(res.data[0])


@router.put("/weekend-plan", response_model=WeekendPlanOut)
def upsert_weekend_plan(
    body: WeekendPlanUpsert,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> WeekendPlanOut:
    _assert_saturday(body.weekend_start)
    ws = body.weekend_start.isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "weekend_start": ws,
        "notes": weekend_notes_json_from_items(body.items),
        "updated_at": now_iso,
    }
    try:
        ex = run_query(
            lambda: (
                db.table("weekend_plans")
                .select("id")
                .eq("weekend_start", ws)
                .limit(1)
            )
        )
        if ex.data:
            run_query(
                lambda: (
                    db.table("weekend_plans")
                    .update(payload)
                    .eq("weekend_start", ws)
                ),
            )
        else:
            run_query(
                lambda: (
                    db.table("weekend_plans").insert(
                        {**payload, "created_at": now_iso},
                    )
                ),
            )
        out = run_query(
            lambda: (
                db.table("weekend_plans")
                .select("*")
                .eq("weekend_start", ws)
                .limit(1)
            )
        )
    except APIError as e:
        _http_from_api_error(e)
    if not out.data:
        raise HTTPException(status_code=500, detail="Weekend plan save failed")
    return WeekendPlanOut.from_row(out.data[0])


@router.get("/rest-days", response_model=list[RestDayOut])
def list_rest_days(
    db: Annotated[Client, Depends(get_supabase_user)],
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
) -> list[RestDayOut]:
    df, dt = date_from, date_to

    def _build():
        q = db.table("rest_days").select("date").order("date")
        if df is not None:
            q = q.gte("date", df.isoformat())
        if dt is not None:
            q = q.lte("date", dt.isoformat())
        return q

    try:
        res = run_query(_build)
    except APIError as e:
        _http_from_api_error(e)
    rows = res.data or []
    return [RestDayOut.from_row(r) for r in rows]


@router.post("/rest-days", response_model=RestDayOut, status_code=201)
def add_rest_day(
    db: Annotated[Client, Depends(get_supabase_user)],
    body: RestDayBody | None = None,
) -> RestDayOut:
    d = (body.date if body else None) or date.today()
    ds = d.isoformat()
    try:
        run_query(lambda: db.table("rest_days").insert({"date": ds}))
    except APIError:
        pass
    try:
        res = run_query(
            lambda: db.table("rest_days").select("date").eq("date", ds).limit(1)
        )
    except APIError as e:
        _http_from_api_error(e)
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to add rest day")
    return RestDayOut.from_row(res.data[0])


@router.delete("/rest-days/{day}", status_code=204)
def remove_rest_day(
    day: str,
    db: Annotated[Client, Depends(get_supabase_user)],
) -> None:
    try:
        run_query(lambda: db.table("rest_days").delete().eq("date", day))
    except APIError as e:
        _http_from_api_error(e)


@router.get("/export/json")
def export_json(db: Annotated[Client, Depends(get_supabase_user)]) -> JSONResponse:
    try:
        tasks = run_query(
            lambda: db.table("tasks").select("*").order("created_at", desc=True)
        )
        logs = run_query(
            lambda: (
                db.table("task_logs").select("task_id, date, completed").order("date")
            )
        )
        reviews = run_query(
            lambda: db.table("weekly_reviews").select("*").order("week_start", desc=True)
        )
        rests = run_query(lambda: db.table("rest_days").select("date").order("date"))
    except APIError as e:
        _http_from_api_error(e)
    task_rests_rows: list[dict[str, Any]] = []
    try:
        task_rests = run_query(
            lambda: (
                db.table("task_rest_days")
                .select("task_id, date")
                .order("date")
            )
        )
        task_rests_rows = task_rests.data or []
    except APIError as e:
        if not _is_task_rest_days_table_missing(e):
            _http_from_api_error(e)
    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "tasks": tasks.data or [],
        "task_logs": logs.data or [],
        "weekly_reviews": reviews.data or [],
        "rest_days": [r["date"] for r in (rests.data or [])],
        "task_rest_days": task_rests_rows,
    }
    return JSONResponse(
        content=jsonable_encoder(payload),
        headers={
            "Content-Disposition": 'attachment; filename="noexcuses-export.json"'
        },
    )


@router.get("/export/csv")
def export_csv(db: Annotated[Client, Depends(get_supabase_user)]) -> PlainTextResponse:
    try:
        tasks = run_query(
            lambda: db.table("tasks")
            .select("id, title, created_at, task_kind, month_bucket, window_start, window_end")
            .order("created_at", desc=True)
        )
        logs = run_query(
            lambda: (
                db.table("task_logs").select("task_id, date, completed").order("date")
            )
        )
    except APIError as e:
        _http_from_api_error(e)
    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "task_id",
            "task_title",
            "task_created_at",
            "task_kind",
            "month_bucket",
            "window_start",
            "window_end",
            "log_date",
            "completed",
        ],
    )
    task_rows = {str(r["id"]): r for r in (tasks.data or [])}
    log_rows = logs.data or []
    for r in log_rows:
        tid = str(r["task_id"])
        t = task_rows.get(tid, {})
        title = t.get("title", "")
        tca = t.get("created_at", "")
        if hasattr(tca, "isoformat"):
            tca = tca.isoformat()
        tk = t.get("task_kind", "daily")
        mb = t.get("month_bucket")
        if mb is not None and hasattr(mb, "isoformat"):
            mb = mb.isoformat()
        elif isinstance(mb, str):
            mb = mb[:10]
        wss = t.get("window_start") or ""
        wee = t.get("window_end") or ""
        if isinstance(wss, str):
            wss = wss.strip()
        if isinstance(wee, str):
            wee = wee.strip()
        ld = r.get("date", "")
        if hasattr(ld, "isoformat"):
            ld = ld.isoformat()
        elif isinstance(ld, str):
            ld = ld[:10]
        w.writerow([tid, title, tca, tk, mb or "", wss, wee, ld, r.get("completed")])
    logged_ids = {str(x["task_id"]) for x in log_rows}
    for tid, t in task_rows.items():
        if tid not in logged_ids:
            tca = t.get("created_at", "")
            if hasattr(tca, "isoformat"):
                tca = tca.isoformat()
            tk = t.get("task_kind", "daily")
            mb = t.get("month_bucket")
            if mb is not None and hasattr(mb, "isoformat"):
                mb = mb.isoformat()
            elif isinstance(mb, str):
                mb = mb[:10]
            wss = t.get("window_start") or ""
            wee = t.get("window_end") or ""
            if isinstance(wss, str):
                wss = wss.strip()
            if isinstance(wee, str):
                wee = wee.strip()
            w.writerow([tid, t.get("title", ""), tca, tk, mb or "", wss, wee, "", ""])
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="noexcuses-export.csv"'
        },
    )
