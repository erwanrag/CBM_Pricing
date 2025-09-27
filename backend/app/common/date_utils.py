from datetime import datetime, date
from typing import Optional

def to_iso_string(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None

def first_day_of_month(year: int, month: int) -> date:
    return date(year, month, 1)

def last_day_of_month(year: int, month: int) -> date:
    from calendar import monthrange
    day = monthrange(year, month)[1]
    return date(year, month, day)
