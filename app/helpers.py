from datetime import date, datetime, timedelta
from functools import wraps

from flask import abort
from flask_login import current_user, login_required


HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
         "Agustus", "September", "Oktober", "November", "Desember"]


def format_date(value, with_day=True):
    if not value:
        return ""
    if isinstance(value, datetime):
        value = value.date()
    text = f"{value.day} {BULAN[value.month - 1]} {value.year}"
    return f"{HARI[value.weekday()]}, {text}" if with_day else text


def parse_date(text, default=None):
    try:
        return date.fromisoformat(text)
    except (TypeError, ValueError):
        return default


def parse_month(text, default):
    """'2026-10' -> date(2026, 10, 1)."""
    try:
        year, month = text.split("-")
        return date(int(year), int(month), 1)
    except (AttributeError, ValueError):
        return default


def month_end(first):
    nxt = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    return nxt - timedelta(days=1)


def wa_text(name, report_date, day_status, items):
    """Format sama dengan report WA yang selama ini dipakai."""
    header = (f"Daily Report {HARI[report_date.weekday()]}/{report_date.day:02d} "
              f"{BULAN[report_date.month - 1]} {report_date.year} ({name}).")
    if day_status:
        header += f" ({day_status})"
    lines = [f"{i}. {it['text'].strip()}" for i, it in enumerate(
        [it for it in items if it.get("text", "").strip()], 1)]
    return header + "\n\n" + "\n".join(lines)


def spv_required(view):
    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if not current_user.is_spv:
            abort(403)
        return view(*args, **kwargs)
    return wrapper


def admin_required(view):
    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if not current_user.is_admin:
            abort(403)
        return view(*args, **kwargs)
    return wrapper
