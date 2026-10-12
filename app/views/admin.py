from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import current_user

from .. import db
from ..constants import DEFAULT_CATEGORIES, DEFAULT_QUICK, ROLES, TEAMS
from ..helpers import admin_required, spv_required
from ..models import Report, User, set_setting, team_categories, team_quick
from .auth import validate_secret


bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.route("/user")
@admin_required
def users():
    order = {t: i for i, t in enumerate(TEAMS)}
    rows = sorted(User.query.all(), key=lambda u: (not u.active, order.get(u.team, 99), u.name.lower()))
    counts = dict(db.session.query(Report.user_id, db.func.count(Report.id)).group_by(Report.user_id).all())
    return render_template("admin_users.html", rows=rows, counts=counts, roles=ROLES)


@bp.route("/user/baru", methods=["GET", "POST"])
@bp.route("/user/<int:user_id>", methods=["GET", "POST"])
@admin_required
def user_form(user_id=None):
    user = db.session.get(User, user_id) if user_id else None
    if user_id and not user:
        abort(404)

    if request.method == "POST":
        name = " ".join(request.form.get("name", "").split())[:100]
        team = request.form.get("team", "")
        role = request.form.get("role", "staff")
        secret = request.form.get("secret", "").strip()

        if not name or team not in TEAMS or role not in ROLES:
            flash("Nama, tim, dan peran wajib diisi.", "danger")
        elif User.query.filter(db.func.lower(User.name) == name.lower(),
                               User.id != (user.id if user else 0)).first():
            flash("Nama itu sudah dipakai user lain. Tambahkan inisial supaya beda.", "danger")
        else:
            is_new = user is None
            if is_new:
                user = User(name=name, team=team, role=role, secret_hash="")
            else:
                user.name, user.team, user.role = name, team, role

            if user.id == current_user.id and role != "admin":
                flash("Anda tidak bisa menurunkan peran akun Anda sendiri.", "danger")
                return redirect(url_for("admin.user_form", user_id=user.id))

            if secret or is_new:
                error = validate_secret(user, secret)
                if error:
                    db.session.rollback()
                    flash(error, "danger")
                    return render_template("admin_user_form.html", user=user if not is_new else None,
                                           form=request.form, roles=ROLES)
                user.set_secret(secret)
                user.failed_logins = 0
                user.locked_until = None

            db.session.add(user)
            db.session.commit()
            flash(f"User {user.name} {'ditambahkan' if is_new else 'disimpan'}.", "success")
            return redirect(url_for("admin.users"))

    return render_template("admin_user_form.html", user=user, form=request.form, roles=ROLES)


@bp.route("/user/<int:user_id>/aktif", methods=["POST"])
@admin_required
def toggle_active(user_id):
    user = db.session.get(User, user_id) or abort(404)
    if user.id == current_user.id:
        flash("Anda tidak bisa menonaktifkan akun Anda sendiri.", "danger")
    else:
        user.active = not user.active
        db.session.commit()
        flash(f"{user.name} {'diaktifkan' if user.active else 'dinonaktifkan'}.", "success")
    return redirect(url_for("admin.users"))


@bp.route("/user/<int:user_id>/buka-kunci", methods=["POST"])
@admin_required
def unlock(user_id):
    user = db.session.get(User, user_id) or abort(404)
    user.failed_logins = 0
    user.locked_until = None
    db.session.commit()
    flash(f"Kunci login {user.name} dibuka.", "success")
    return redirect(url_for("admin.users"))


@bp.route("/kategori", methods=["GET", "POST"])
@spv_required
def categories():
    team = request.values.get("tim", TEAMS[0])
    if team not in TEAMS:
        abort(404)

    if request.method == "POST":
        if request.form.get("reset"):
            set_setting("categories:" + team, DEFAULT_CATEGORIES.get(team, ["Lainnya"]))
            set_setting("quick:" + team, DEFAULT_QUICK.get(team, []))
            flash(f"Kategori {team} dikembalikan ke bawaan.", "info")
        else:
            cats = _lines(request.form.get("categories", ""), 100)
            if "Lainnya" not in cats:
                cats.append("Lainnya")
            set_setting("categories:" + team, cats)
            set_setting("quick:" + team, _lines(request.form.get("quick", ""), 1000))
            flash(f"Kategori dan pekerjaan rutin {team} disimpan.", "success")
        db.session.commit()
        return redirect(url_for("admin.categories", tim=team))

    return render_template("admin_categories.html", team=team,
                           categories=team_categories(team), quick=team_quick(team))


def _lines(text, max_len):
    seen, out = set(), []
    for line in text.splitlines():
        line = " ".join(line.split())[:max_len]
        if line and line.lower() not in seen:
            seen.add(line.lower())
            out.append(line)
    return out[:40]
