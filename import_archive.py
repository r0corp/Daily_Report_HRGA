"""
Impor arsip report harian dari Sticky Notes (data/archive.json) sebagai
report milik satu user.

    python import_archive.py data/archive.json --user "Abdul Rohman Ridwan"           (cek saja)
    python import_archive.py data/archive.json --user "Abdul Rohman Ridwan" --apply   (simpan)

Format archive.json: {"YYYY-MM-DD": {"s": status_hari, "i": [[teks, kategori, rutin], ...]}}
Tanggal yang sudah punya report untuk user itu dilewati. Report arsip
ditandai source="arsip" dan status Terkirim, tidak masuk daftar
"Menunggu dicek" Spv.
"""

import argparse
import json
from datetime import date, datetime

from app import create_app, db
from app.constants import STATE_SENT
from app.models import Report, User


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file")
    parser.add_argument("--user", required=True, help="Nama user persis seperti di aplikasi")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as f:
        archive = json.load(f)

    app = create_app()
    with app.app_context():
        user = User.query.filter(db.func.lower(User.name) == args.user.lower()).first()
        if not user:
            raise SystemExit(f"User '{args.user}' tidak ditemukan. Buat dulu dari menu User.")

        existing = {r.date for r in Report.query.filter_by(user_id=user.id)}
        added = skipped = items = 0

        for day, rec in archive.items():
            d = date.fromisoformat(day)
            if d in existing:
                skipped += 1
                continue
            report = Report(
                user_id=user.id, date=d, day_status=rec.get("s", ""), state=STATE_SENT,
                source="arsip", submitted_at=datetime(d.year, d.month, d.day, 17, 0),
                created_at=datetime.now(), updated_at=datetime.now(),
            )
            report.items = [{"text": t, "cat": c, "rutin": bool(r), "manual": True} for t, c, r in rec.get("i", [])]
            items += len(report.items)
            db.session.add(report)
            added += 1

        print(f"{user.name}: {added} hari baru ({items} pekerjaan), {skipped} hari sudah ada dilewati.")
        if args.apply:
            db.session.commit()
            print("Tersimpan.")
        else:
            db.session.rollback()
            print("Mode cek - tambahkan --apply untuk menyimpan.")


if __name__ == "__main__":
    main()
