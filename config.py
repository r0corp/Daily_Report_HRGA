import os
from datetime import timedelta

from dotenv import load_dotenv


BASE_DIR = os.path.abspath(os.path.dirname(__file__))

load_dotenv(os.path.join(BASE_DIR, ".env"))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")

    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL")
        or "sqlite:///" + os.path.join(BASE_DIR, "instance", "report.db")
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Staf lapangan (OB, mekanik) membuka dari HP sepanjang hari; sesi
    # dibuat panjang supaya tidak perlu login ulang tiap jam.
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)

    # Cookie browser tidak dibedakan per port. Di server yang sama ada
    # Asset Tracker (:8000), Remote Tracker (:8100) dan Legal Contract
    # (:8200); tanpa nama sendiri login saling menimpa.
    SESSION_COOKIE_NAME = "report_harian_session"
    REMEMBER_COOKIE_NAME = "report_harian_remember"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Token CSRF ikut umur sesi (default Flask-WTF 1 jam akan membuat
    # autosave gagal kalau halaman dibiarkan terbuka lama).
    WTF_CSRF_TIME_LIMIT = None

    # Salah PIN/password sebanyak ini -> akun dikunci sementara.
    LOGIN_MAX_FAILS = 5
    LOGIN_LOCK_MINUTES = 15


class TestConfig(Config):
    TESTING = True
    SECRET_KEY = "test"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    WTF_CSRF_ENABLED = False
