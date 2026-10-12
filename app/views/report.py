from datetime import date, datetime

from flask import Blueprint, abort, jsonify, render_template, request
from flask_login import current_user, login_required

from .. import db
from ..constants import (
    DAY_STATUSES, DEFAULT_KEYWORDS, STATE_CHECKED, STATE_DRAFT, STATE_REVISION, STATE_SENT,
)
from ..helpers import format_date, parse_date, parse_month, wa_text
from ..models import Report, team_categories, team_quick


bp = Blueprint("report", __name__)

MAX_ITEMS = 60
MAX_TEXT = 3000


def _report_json(report, report_date):
    if not report:
        return {"date": report_date.isoformat(), "day_status": "", "items": [],
                "state": STATE_DRAFT, "editable": True, "spv_note": None,
                "submitted_at": None, "edited_after_submit": False, "exists": False}
    return {
        "date": report.date.isoformat(),
        "day_status": report.day_status,
        "items": report.items,
        "state": report.state,
        "editable": report.editable,
        "spv_note": report.spv_note,
        "reviewed_by": report.reviewed_by.name if report.reviewed_by else None,
        "submitted_at": report.submitted_at.strftime("%d-%m-%Y %H:%M") if report.submitted_at else None,
        "edited_after_submit": report.edited_after_submit,
        "exists": True,
    }


def _date_or_404(text):
    d = parse_date(text)
    if not d:
        abort(404)
    if d > date.today():
        abort(400, "Tidak bisa mengisi report untuk tanggal yang akan datang.")
    return d


def _clean_items(raw):
    if not isinstance(raw, list):
        abort(400, "Data tidak valid.")
    items = []
    for it in raw[:MAX_ITEMS]:
        if not isinstance(it, dict):
            continue
        text = str(it.get("text", "")).strip()[:MAX_TEXT]
        if not text:
            continue
        items.append({
            "text": text,
            "cat": (str(it.get("cat") or "").strip()[:100]) or "Lainnya",
            "rutin": bool(it.get("rutin")),
            "manual": bool(it.get("manual")),
        })
    return items


def _own_report(d):
    return Report.query.filter_by(user_id=current_user.id, date=d).first()


@bp.route("/tulis")
@login_required
def write():
    d = parse_date(request.args.get("tanggal"), date.today())
    if d > date.today():
        d = date.today()
    categories = team_categories(current_user.team)
    keywords = [[cat, pattern] for cat, pattern in DEFAULT_KEYWORDS.get(current_user.team, {}).items()
                if cat in categories]
    return render_template(
        "write.html",
        start_date=d.isoformat(),
        categories=categories,
        keywords=keywords,
        quick=team_quick(current_user.team),
        day_statuses=DAY_STATUSES,
        auto_category=current_user.team == "IT",
    )


@bp.route("/api/report/<day>")
@login_required
def api_get(day):
    d = parse_date(day)
    if not d:
        abort(404)
    report = _own_report(d)
    prev = (Report.query.filter(Report.user_id == current_user.id, Report.date < d)
            .order_by(Report.date.desc()).first())
    data = _report_json(report, d)
    data["previous_rutin"] = [it for it in (prev.items if prev else []) if it.get("rutin")]
    data["previous_items"] = prev.items if prev else []
    data["previous_date"] = prev.date.strftime("%d-%m") if prev else None
    data["title"] = format_date(d)
    return jsonify(data)


@bp.route("/api/report/<day>", methods=["PUT"])
@login_required
def api_save(day):
    d = _date_or_404(day)
    body = request.get_json(silent=True) or {}
    items = _clean_items(body.get("items", []))
    day_status = body.get("day_status", "")
    if day_status not in DAY_STATUSES:
        day_status = ""

    report = _own_report(d)

    if report and not report.editable:
        return jsonify({"error": "Report sudah dicek Spv dan tidak bisa diubah lagi."}), 409

    if not report:
        if not items and not day_status:
            return jsonify(_report_json(None, d))
        report = Report(user_id=current_user.id, date=d)
        db.session.add(report)

    changed = report.items != items or report.day_status != day_status
    report.items = items
    report.day_status = day_status
    if changed:
        report.updated_at = datetime.now()
        if report.state == STATE_SENT:
            report.edited_after_submit = True

    # Draft yang dikosongkan dihapus saja supaya tidak muncul di riwayat.
    if report.state == STATE_DRAFT and not items and not day_status and report.id:
        db.session.delete(report)
        db.session.commit()
        return jsonify(_report_json(None, d))

    db.session.commit()
    return jsonify(_report_json(report, d))


@bp.route("/api/report/<day>/send", methods=["POST"])
@login_required
def api_send(day):
    d = _date_or_404(day)
    report = _own_report(d)

    if not report or (not report.items and not report.day_status):
        return jsonify({"error": "Report masih kosong. Tulis minimal satu pekerjaan atau pilih status hari."}), 400
    if report.state == STATE_CHECKED:
        return jsonify({"error": "Report sudah dicek Spv."}), 409

    report.state = STATE_SENT
    report.submitted_at = datetime.now()
    report.edited_after_submit = False
    db.session.commit()
    return jsonify(_report_json(report, d))


@bp.route("/api/report/<day>/wa")
@login_required
def api_wa(day):
    d = parse_date(day) or abort(404)
    report = _own_report(d)
    return jsonify({"text": wa_text(current_user.name, d, report.day_status if report else "",
                                    report.items if report else [])})


@bp.route("/riwayat")
@login_required
def history():
    q = request.args.get("q", "").strip()
    cat = request.args.get("kategori", "")
    month = parse_month(request.args.get("bulan", ""), None)
    page = max(1, request.args.get("hal", 1, type=int))

    query = Report.query.filter_by(user_id=current_user.id)
    if month:
        from ..helpers import month_end
        query = query.filter(Report.date >= month, Report.date <= month_end(month))
    if q:
        query = query.filter(Report.items_json.ilike(f"%{q}%"))
    if cat:
        query = query.filter(Report.items_json.contains(f'"cat": "{cat}"'))

    pagination = query.order_by(Report.date.desc()).paginate(page=page, per_page=30, error_out=False)

    rows = []
    ql = q.lower()
    for r in pagination.items:
        items = [it for it in r.items
                 if (not cat or it.get("cat") == cat) and (not ql or ql in it.get("text", "").lower())]
        rows.append((r, items if (q or cat) else r.items))

    return render_template("history.html", rows=rows, pagination=pagination, q=q, cat=cat,
                           month=request.args.get("bulan", ""),
                           categories=team_categories(current_user.team))


@bp.errorhandler(400)
def bad_request(e):
    return jsonify({"error": getattr(e, "description", "Permintaan tidak valid.")}), 400


# Dipakai template untuk status di riwayat / dashboard.
STATE_ORDER = [STATE_DRAFT, STATE_SENT, STATE_REVISION, STATE_CHECKED]
