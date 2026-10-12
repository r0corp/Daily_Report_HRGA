"""
Membuat akun staf dari CSV (kolom: nama,tim,peran). Aman dijalankan ulang:
nama yang sudah ada dilewati.

    python create_staff.py data/daftar_staf.csv

Staf mendapat PIN acak 6 angka; Supervisor/Admin password acak.
PIN/password baru tampil di layar dan disimpan ke instance\\pin_awal.txt
untuk dibagikan langsung ke masing-masing staf. Hapus file itu setelah
semua PIN dibagikan; staf bisa mengganti PIN sendiri setelah login.
"""

import csv
import os
import secrets
import sys
from datetime import datetime

from app import create_app, db
from app.constants import ROLES, TEAMS
from app.models import User


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Pakai: python create_staff.py data/daftar_staf.csv")

    app = create_app()
    with app.app_context():
        created = []
        with open(sys.argv[1], encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                name = " ".join((row.get("nama") or "").split())
                team = (row.get("tim") or "").strip()
                role = (row.get("peran") or "staff").strip().lower()
                if not name:
                    continue
                if team not in TEAMS or role not in ROLES:
                    print(f"Dilewati {name}: tim '{team}' / peran '{role}' tidak dikenal.")
                    continue
                if User.query.filter(db.func.lower(User.name) == name.lower()).first():
                    print(f"Sudah ada: {name}")
                    continue
                user = User(name=name, team=team, role=role, secret_hash="")
                secret = f"{secrets.randbelow(10**6):06d}" if user.uses_pin else secrets.token_urlsafe(9)
                user.set_secret(secret)
                db.session.add(user)
                created.append((name, team, "PIN" if user.uses_pin else "Password", secret))
        db.session.commit()

        if not created:
            print("Tidak ada akun baru.")
            return

        lines = [f"{n:<20} {t:<16} {k:<9} {s}" for n, t, k, s in created]
        print("\nAkun baru (bagikan langsung ke masing-masing staf):")
        print("\n".join(lines))

        path = os.path.join(app.instance_path, "pin_awal.txt")
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"# Dibuat {datetime.now():%d-%m-%Y %H:%M} - hapus file ini setelah PIN dibagikan\n")
            f.write("\n".join(lines) + "\n\n")
        print(f"\nTersimpan juga di {path}")


if __name__ == "__main__":
    main()
