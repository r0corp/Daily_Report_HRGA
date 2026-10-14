import os
from datetime import datetime, timedelta

from flask import Flask, render_template
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect


db = SQLAlchemy()

login_manager = LoginManager()

csrf = CSRFProtect()


def create_app(config_object="config.Config"):

    app = Flask(__name__)

    app.config.from_object(config_object)

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError(
            "SECRET_KEY belum diset. Buat file .env berisi "
            "SECRET_KEY=<hasil generate>, misalnya lewat:\n"
            "  python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)

    from .i18n import LANGS, _, get_lang

    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Silakan login terlebih dahulu."
    login_manager.login_message_category = "warning"
    login_manager.localize_callback = _

    csrf.init_app(app)

    from . import models  # noqa: F401  (daftarkan tabel)
    from .views import auth, report, spv, admin

    for bp in (auth.bp, report.bp, spv.bp, admin.bp):
        app.register_blueprint(bp)

    from .constants import STATES, TEAMS

    app.jinja_env.globals["_"] = _

    @app.context_processor
    def template_globals():
        return {"now": datetime.now, "TEAMS": TEAMS, "STATES": STATES,
                "timedelta1": timedelta(days=1), "lang": get_lang(), "LANGS": LANGS}

    @app.template_filter("tanggal")
    def tanggal(value, with_day=True):
        from .helpers import format_date
        return format_date(value, with_day)

    @app.template_filter("hari")
    def hari(value):
        from .helpers import day_name
        return day_name(value) if value else ""

    @app.errorhandler(403)
    def forbidden(_e):
        return render_template("error.html", code=403,
                               message=_("Anda tidak punya akses ke halaman ini.")), 403

    @app.errorhandler(404)
    def not_found(_e):
        return render_template("error.html", code=404,
                               message=_("Halaman atau data tidak ditemukan.")), 404

    with app.app_context():
        db.create_all()

    return app


@login_manager.user_loader
def load_user(user_id):

    from .models import User

    user = db.session.get(User, int(user_id))

    return user if user and user.active else None
