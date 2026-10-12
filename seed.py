"""
Membuat akun admin pertama (IT). Aman dijalankan ulang: kalau sudah ada
admin, tidak ada yang diubah.

    python seed.py [--name "Abdul Rohman Ridwan"]

Password admin yang dibuat tampil SEKALI di layar - catat lalu segera
ganti lewat menu profil setelah login. Staf lain ditambahkan dari menu
User di aplikasi.
"""

import argparse
import secrets

from app import create_app, db
from app.constants import ROLE_ADMIN
from app.models import User


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default="Abdul Rohman Ridwan")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if User.query.filter_by(role=ROLE_ADMIN).first():
            print("Admin sudah ada, dilewati.")
            return

        password = secrets.token_urlsafe(9)
        user = User(name=args.name, team="IT", role=ROLE_ADMIN, secret_hash="")
        user.set_secret(password)
        db.session.add(user)
        db.session.commit()
        print(f"Admin dibuat: {args.name} (tim IT)")
        print(f"Password awal: {password}")
        print("Catat sekarang, lalu ganti setelah login (menu profil > Password).")


if __name__ == "__main__":
    main()
