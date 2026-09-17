from datetime import datetime, timezone


def format_iso_utc(dt: datetime = None) -> str:
    """Formats datetime to ISO-8601 UTC string."""
    if dt is None:
        dt = datetime.now(timezone.utc)
    return dt.isoformat()


def format_bulletin_code(category: str, state: str, counter: int) -> str:
    """Standardizes national bulletin reference codes."""
    cat_prefix = category[:3].upper()
    state_prefix = state[:2].upper()
    year = datetime.now().year
    return f"NDMA/{state_prefix}/{year}/{cat_prefix}-{counter:03d}"
