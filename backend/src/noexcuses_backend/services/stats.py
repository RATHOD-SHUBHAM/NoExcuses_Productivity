from datetime import date, timedelta


def total_days_tracked(created_at: date, today: date) -> int:
    """Calendar days from task creation through today (inclusive), at least 1."""
    span = (today - created_at).days + 1
    return max(1, span)


def completion_percent(
    total_completed_days: int,
    created_at: date,
    today: date,
) -> float:
    denom = total_days_tracked(created_at, today)
    if denom <= 0:
        return 0.0
    return round(min(100.0, (total_completed_days / denom) * 100.0), 2)


def _only_rest_between(prev: date, cur: date, rest_days: set[date]) -> bool:
    """True if every calendar day strictly between prev and cur is a rest day."""
    if cur <= prev + timedelta(days=1):
        return False
    d = prev + timedelta(days=1)
    while d < cur:
        if d not in rest_days:
            return False
        d += timedelta(days=1)
    return True


def current_streak_from_today(
    today: date,
    completed_days: set[date],
    rest_days: set[date] | None = None,
) -> int:
    """Consecutive completed days ending today; rest days bridge gaps without counting."""
    rest = rest_days or set()
    if today not in completed_days:
        return 0
    n = 1
    d = today - timedelta(days=1)
    for _ in range(4000):
        if d in completed_days:
            n += 1
        elif d in rest:
            pass
        else:
            break
        d -= timedelta(days=1)
    return n


def longest_streak(
    completed_days: set[date],
    rest_days: set[date] | None = None,
) -> int:
    """Longest run of completed days where gaps are filled only by rest days."""
    rest = rest_days or set()
    if not completed_days:
        return 0
    sorted_d = sorted(completed_days)
    best = 1
    run = 1
    for i in range(1, len(sorted_d)):
        prev, cur = sorted_d[i - 1], sorted_d[i]
        if cur == prev + timedelta(days=1):
            run += 1
        elif _only_rest_between(prev, cur, rest):
            run += 1
        else:
            run = 1
        best = max(best, run)
    return best
