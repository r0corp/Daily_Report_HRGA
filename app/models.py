import json
from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from . import db
from .constants import (
    DEFAULT_CATEGORIES, DEFAULT_QUICK, ROLE_ADMIN, ROLE_SPV, ROLES, STATE_DRAFT, STATES,
)


class User(UserMixin, db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    team = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="staff")

    # Staf: PIN 4-6 angka. Spv/admin: password minimal 8 karakter.
    secret_hash = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, nullable=False, default=True)

    failed_logins = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(db.DateTime)
    last_login_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    reports = db.relationship("Report", back_populates="user",
                              foreign_keys="Report.user_id", lazy="dynamic")

    def set_secret(self, secret):
        self.secret_hash = generate_password_hash(secret)

    def check_secret(self, secret):
        return check_password_hash(self.secret_hash, secret)

    @property
    def uses_pin(self):
        return self.role not in (ROLE_SPV, ROLE_ADMIN)

    @property
    def is_spv(self):
        return self.role in (ROLE_SPV, ROLE_ADMIN)

    @property
    def is_admin(self):
        return self.role == ROLE_ADMIN

    @property
    def role_label(self):
        from .i18n import _
        return _(ROLES.get(self.role, self.role))

    @property
    def initials(self):
        # Hanya kata yang diawali huruf ("Budi (uji)" -> "B", bukan "B(").
        parts = [p for p in self.name.split() if p[:1].isalpha()]
        return ((parts[0][0] + (parts[-1][0] if len(parts) > 1 else "")) if parts else "U").upper()


class Report(db.Model):
    __tablename__ = "report"
    __table_args__ = (db.UniqueConstraint("user_id", "date", name="uq_report_user_date"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)

    # "" = masuk kerja; selain itu Cuti/Sakit/Izin/Libur/Perjalanan Dinas.
    day_status = db.Column(db.String(30), nullable=False, default="")

    # JSON: [{"text", "cat", "rutin"}]
    items_json = db.Column(db.Text, nullable=False, default="[]")

    state = db.Column(db.String(20), nullable=False, default=STATE_DRAFT)
    submitted_at = db.Column(db.DateTime)
    # Kiriman pertama (tidak berubah saat kirim ulang / kirim perbaikan),
    # dipakai untuk menandai laporan susulan.
    first_submitted_at = db.Column(db.DateTime)
    # Diubah staf setelah dikirim (Spv perlu tahu isinya berubah).
    edited_after_submit = db.Column(db.Boolean, nullable=False, default=False)

    reviewed_at = db.Column(db.DateTime)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    spv_note = db.Column(db.Text)

    # "app" atau "arsip" (impor Sticky Notes).
    source = db.Column(db.String(20), nullable=False, default="app")

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    user = db.relationship("User", foreign_keys=[user_id], back_populates="reports")
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])

    @property
    def items(self):
        try:
            return json.loads(self.items_json or "[]")
        except ValueError:
            return []

    @items.setter
    def items(self, value):
        self.items_json = json.dumps(value, ensure_ascii=False)

    @property
    def state_label(self):
        from .i18n import _
        return _(STATES.get(self.state, (self.state, "secondary"))[0])

    @property
    def state_color(self):
        return STATES.get(self.state, ("", "secondary"))[1]

    @property
    def editable(self):
        return self.state != "checked"

    @property
    def late_days(self):
        """Berapa hari setelah tanggal laporan baru dikirim (0 = tepat waktu)."""
        if self.source != "app" or not self.first_submitted_at:
            return 0
        return max(0, (self.first_submitted_at.date() - self.date).days)


class Note(db.Model):
    """Catatan draft (sticky note) pribadi: pekerjaan dadakan yang belum
    pasti. Tidak terikat tanggal dan tidak terlihat oleh Spv."""
    __tablename__ = "note"

    COLORS = ("yellow", "orange", "pink", "blue", "green")

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    text = db.Column(db.Text, nullable=False, default="")
    color = db.Column(db.String(20), nullable=False, default="yellow")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    def to_json(self):
        return {"id": self.id, "text": self.text, "color": self.color,
                "created_at": self.created_at.isoformat(timespec="seconds")}


class Setting(db.Model):
    __tablename__ = "setting"

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text, nullable=False)


def get_setting(key, default):
    row = db.session.get(Setting, key)
    if not row:
        return default
    try:
        return json.loads(row.value)
    except ValueError:
        return default


def set_setting(key, value):
    row = db.session.get(Setting, key) or Setting(key=key)
    row.value = json.dumps(value, ensure_ascii=False)
    db.session.add(row)


def team_categories(team):
    return get_setting("categories:" + team, DEFAULT_CATEGORIES.get(team, ["Lainnya"]))


def team_quick(team):
    return get_setting("quick:" + team, DEFAULT_QUICK.get(team, []))
