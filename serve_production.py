"""
Menjalankan Daily Report HRGA dengan waitress (server produksi).

Dipasang di PC server yang sama dengan Asset Tracker (192.168.120.229).
Port yang sudah dipakai: 8000 Asset Tracker, 8100 Remote Tracker,
8200 Legal Contract. Aplikasi ini port 8300.

Cara pakai:
    python serve_production.py
"""

import os

from waitress import serve

from app import create_app


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8300))

app = create_app()

app.config["DEBUG"] = False


if __name__ == "__main__":

    print(f"Daily Report HRGA berjalan di http://{HOST}:{PORT}")

    serve(app, host=HOST, port=PORT, threads=6)
