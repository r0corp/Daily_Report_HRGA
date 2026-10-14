from datetime import datetime, timedelta

from flask import (
    Blueprint, current_app, flash, redirect, render_template, request, session, url_for,
)
from flask_login import current_user, login_required, login_user, logout_user

from .. import db
from ..constants import TEAMS
from ..i18n import COOKIE, LANGS, _
from ..models import User


bp = Blueprint("auth", __name__)


def _home():
    return url_for("spv.dashboard") if current_user.is_spv else url_for("report.write")


def _safe_next(target):
    if target and target.startswith("/") and not target.startswith("//"):
        return target
    return None


def _login_users():
    users = User.query.filter_by(active=True).all()
    order = {t: i for i, t in enumerate(TEAMS)}
    users.sort(key=lambda u: (order.get(u.team, 99), u.name.lower()))
    groups = []
    for u in users:
        if not groups or groups[-1][0] != u.team:
            groups.append((u.team, []))
        groups[-1][1].append(u)
    return groups


@bp.route("/login", methods=["GET", "POST"])
def login():

    if current_user.is_authenticated:
        return redirect(_home())

    selected = None

    if request.method == "POST":

        user = db.session.get(User, request.form.get("user_id", type=int) or 0)
        secret = request.form.get("secret", "")
        selected = user.id if user else None
        now = datetime.now()

        if user and user.locked_until and user.locked_until > now:
            minutes = max(1, int((user.locked_until - now).total_seconds() // 60) + 1)
            msg = "Terlalu banyak salah PIN/password. Coba lagi dalam {minutes} menit atau minta IT mereset."
            flash(_(msg, minutes=minutes), "danger")
            return render_template("login.html", groups=_login_users(), selected=selected), 429

        if user and user.active and user.check_secret(secret):
            user.failed_logins = 0
            user.locked_until = None
            user.last_login_at = now
            db.session.commit()
            session.clear()
            session.permanent = True
            login_user(user)
            return redirect(_safe_next(request.args.get("next")) or _home())

        if user:
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= current_app.config["LOGIN_MAX_FAILS"]:
                user.locked_until = now + timedelta(minutes=current_app.config["LOGIN_LOCK_MINUTES"])
                user.failed_logins = 0
            db.session.commit()

        flash(_("Nama atau PIN/password salah."), "danger")

    return render_template("login.html", groups=_login_users(), selected=selected)


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    session.clear()
    return redirect(url_for("auth.login"))


@bp.route("/ganti-pin", methods=["GET", "POST"])
@login_required
def change_secret():

    if request.method == "POST":
        old = request.form.get("old", "")
        new = request.form.get("new", "")
        confirm = request.form.get("confirm", "")
        error = validate_secret(current_user, new)

        if not current_user.check_secret(old):
            flash(_("PIN/password lama salah."), "danger")
        elif error:
            flash(error, "danger")
        elif new != confirm:
            flash(_("Konfirmasi tidak sama."), "danger")
        else:
            current_user.set_secret(new)
            db.session.commit()
            flash(_("Berhasil diganti."), "success")
            return redirect(_home())

    return render_template("change_secret.html")


def validate_secret(user, secret):
    """Pesan error, atau None kalau valid."""
    if user.uses_pin:
        if not (secret.isdigit() and 4 <= len(secret) <= 6):
            return _("PIN harus 4-6 angka.")
    elif len(secret) < 8:
        return _("Password minimal 8 karakter.")
    return None


@bp.route("/bahasa/<code>")
def set_lang(code):
    """Simpan pilihan bahasa di cookie perangkat ini (1 tahun)."""
    target = _safe_next(request.args.get("next")) or _safe_next(
        (request.referrer or "").replace(request.host_url.rstrip("/"), "", 1)) or url_for("auth.index")
    resp = redirect(target)
    if code in LANGS:
        resp.set_cookie(COOKIE, code, max_age=365 * 24 * 3600, samesite="Lax", httponly=True)
    return resp


@bp.route("/")
@login_required
def index():
    return redirect(_home())
