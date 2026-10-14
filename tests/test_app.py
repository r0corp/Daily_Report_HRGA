from datetime import date, timedelta

import pytest

from app import create_app, db
from app.models import Report, User


@pytest.fixture
def app():
    app = create_app("config.TestConfig")
    with app.app_context():
        for name, team, role, secret in [
            ("Admin IT", "IT", "admin", "admin-password"),
            ("Spv HRGA", "Supervisor", "spv", "spv-password"),
            ("Budi", "Office Boy", "staff", "1234"),
            ("Andi", "Mekanik", "staff", "5678"),
        ]:
            u = User(name=name, team=team, role=role, secret_hash="")
            u.set_secret(secret)
            db.session.add(u)
        db.session.commit()
    # App context TIDAK dibiarkan terbuka: kalau terbuka, tiap request
    # memakai g yang sama dan user login bocor antar test client.
    yield app


def uid(app, name):
    with app.app_context():
        return User.query.filter_by(name=name).first().id


def login(app, client, name, secret):
    return client.post("/login", data={"user_id": uid(app, name), "secret": secret})


def report_state(app, report_id):
    with app.app_context():
        return db.session.get(Report, report_id).state


def test_login_with_pin_and_lockout(app):
    c = app.test_client()
    r = login(app, c, "Budi", "1234")
    assert r.status_code == 302 and r.location.endswith("/tulis")

    c2 = app.test_client()
    for _ in range(5):
        login(app, c2, "Andi", "0000")
    # Setelah 5 kali salah, PIN benar pun ditolak sementara.
    r = login(app, c2, "Andi", "5678")
    assert r.status_code == 429


def test_spv_lands_on_dashboard(app):
    c = app.test_client()
    r = login(app, c, "Spv HRGA", "spv-password")
    assert r.location.endswith("/spv")


def test_save_send_review_flow(app):
    staff = app.test_client()
    login(app, staff, "Budi", "1234")
    today = date.today().isoformat()

    r = staff.put(f"/api/report/{today}", json={"items": [
        {"text": "Membersihkan ruangan", "cat": "Kebersihan Ruangan", "rutin": True},
        {"text": "   ", "cat": "x"},
    ]})
    assert r.status_code == 200
    assert r.json["state"] == "draft" and len(r.json["items"]) == 1

    # Spv tidak melihat draft.
    spv = app.test_client()
    login(app, spv, "Spv HRGA", "spv-password")
    with app.app_context():
        report_id = Report.query.one().id
    assert spv.get(f"/spv/report/{report_id}").status_code == 404

    assert staff.post(f"/api/report/{today}/send").json["state"] == "sent"
    assert spv.get(f"/spv/report/{report_id}").status_code == 200
    assert b"Budi" in spv.get("/spv").data

    # Ubah setelah kirim -> ditandai diubah.
    r = staff.put(f"/api/report/{today}", json={"items": [{"text": "Membersihkan ruangan dan toilet", "cat": "Kebersihan Ruangan"}]})
    assert r.json["edited_after_submit"] is True

    # Minta perbaikan butuh catatan.
    spv.post(f"/spv/report/{report_id}/review", data={"action": "revision", "note": ""})
    assert report_state(app, report_id) == "sent"
    spv.post(f"/spv/report/{report_id}/review", data={"action": "revision", "note": "Tambahkan pantry"})
    assert report_state(app, report_id) == "revision"
    assert staff.get(f"/api/report/{today}").json["spv_note"] == "Tambahkan pantry"

    staff.post(f"/api/report/{today}/send")
    spv.post(f"/spv/report/{report_id}/review", data={"action": "check", "note": ""})
    assert report_state(app, report_id) == "checked"

    # Sudah dicek -> staf tidak bisa mengubah.
    r = staff.put(f"/api/report/{today}", json={"items": [{"text": "x"}]})
    assert r.status_code == 409


def test_empty_send_and_future_date_rejected(app):
    c = app.test_client()
    login(app, c, "Budi", "1234")
    today = date.today().isoformat()
    assert c.post(f"/api/report/{today}/send").status_code == 400
    future = (date.today() + timedelta(days=1)).isoformat()
    assert c.put(f"/api/report/{future}", json={"items": [{"text": "x"}]}).status_code == 400


def test_access_control(app):
    c = app.test_client()
    login(app, c, "Budi", "1234")
    assert c.get("/spv").status_code == 403
    assert c.get("/admin/user").status_code == 403
    assert c.get("/admin/kategori").status_code == 403
    assert app.test_client().get("/tulis").status_code == 302  # belum login

    spv = app.test_client()
    login(app, spv, "Spv HRGA", "spv-password")
    assert spv.get("/admin/kategori").status_code == 200
    assert spv.get("/admin/user").status_code == 403


def test_staff_only_sees_own_reports(app):
    andi = app.test_client()
    login(app, andi, "Andi", "5678")
    today = date.today().isoformat()
    andi.put(f"/api/report/{today}", json={"items": [{"text": "Servis unit B 1234", "cat": "Servis Berkala"}]})
    andi.post(f"/api/report/{today}/send")

    budi = app.test_client()
    login(app, budi, "Budi", "1234")
    assert budi.get(f"/api/report/{today}").json["items"] == []
    assert b"Servis unit" not in budi.get("/riwayat").data
    assert b"Andi" not in budi.get("/rekap").data


def test_admin_creates_staff_with_pin_rules(app):
    c = app.test_client()
    login(app, c, "Admin IT", "admin-password")
    r = c.post("/admin/user/baru", data={"name": "Sari", "team": "Receptionist", "role": "staff", "secret": "12"})
    assert b"PIN harus 4-6 angka" in r.data
    c.post("/admin/user/baru", data={"name": "Sari", "team": "Receptionist", "role": "staff", "secret": "2468"})
    with app.app_context():
        assert User.query.filter_by(name="Sari").first().check_secret("2468")


def test_pages_render(app):
    admin = app.test_client()
    login(app, admin, "Admin IT", "admin-password")
    today = date.today().isoformat()
    admin.put(f"/api/report/{today}", json={"items": [{"text": "Cek Kyocera Cakung", "cat": "Printer & Fotokopi", "rutin": True}]})
    admin.post(f"/api/report/{today}/send")
    for url in ["/tulis", "/riwayat", "/riwayat?q=kyocera&kategori=Printer+%26+Fotokopi", "/rekap", "/spv",
                "/admin/user", "/admin/user/baru", "/admin/kategori?tim=Mekanik", "/ganti-pin",
                "/rekap/export.xlsx", "/spv/report/1"]:
        assert admin.get(url).status_code == 200, url
    assert app.test_client().get("/login").status_code == 200


def test_notifications_for_spv_and_staff(app):
    import time
    staff = app.test_client()
    login(app, staff, "Budi", "1234")
    spv = app.test_client()
    login(app, spv, "Spv HRGA", "spv-password")

    # Panggilan pertama hanya memberi waktu server (tanpa kejadian lama).
    first = spv.get("/api/notif").json
    assert first["events"] == []
    staff_since = staff.get("/api/notif").json["now"]
    time.sleep(1.1)

    today = date.today().isoformat()
    staff.put(f"/api/report/{today}", json={"items": [{"text": "Cleaning lobby", "cat": "Kebersihan Ruangan"}]})
    staff.post(f"/api/report/{today}/send")
    ev = spv.get(f"/api/notif?since={first['now']}").json["events"]
    assert [e["type"] for e in ev] == ["incoming"] and "Budi" in ev[0]["title"]

    with app.app_context():
        report_id = Report.query.one().id
    spv.post(f"/spv/report/{report_id}/review", data={"action": "revision", "note": "Tambah detail"})
    ev = staff.get(f"/api/notif?since={staff_since}").json["events"]
    assert ev[0]["type"] == "revision" and "Tambah detail" in ev[0]["text"]


def test_language_switch(app):
    c = app.test_client()
    # Bawaan Bahasa Indonesia.
    assert "Selamat Datang" in c.get("/login").get_data(as_text=True)

    r = c.get("/bahasa/en?next=/login")
    assert r.status_code == 302 and r.location.endswith("/login")
    assert "lang=en" in r.headers["Set-Cookie"]
    page = c.get("/login").get_data(as_text=True)
    assert "Welcome" in page and 'lang="en"' in page

    # Pesan dari server ikut diterjemahkan.
    r = c.post("/login", data={"user_id": uid(app, "Budi"), "secret": "0000"})
    assert "Wrong name or PIN/password." in r.get_data(as_text=True)

    login(app, c, "Budi", "1234")
    page = c.get("/tulis").get_data(as_text=True)
    assert "My Daily Report" in page and '"lang": "en"' in page
    assert c.post(f"/api/report/{date.today().isoformat()}/send").json["error"].startswith("The report is empty")

    # Kode bahasa tidak dikenal diabaikan, redirect ke luar ditolak.
    r = c.get("/bahasa/xx?next=https://evil.example")
    assert "lang=xx" not in r.headers.get("Set-Cookie", "")
    assert not r.location.startswith("https://evil")

    c.get("/bahasa/id")
    assert "Laporan Harian Saya" in c.get("/tulis").get_data(as_text=True)


def test_english_dates(app):
    from app.helpers import format_date
    with app.test_request_context(headers={"Cookie": "lang=en"}):
        assert format_date(date(2026, 10, 12)) == "Monday, 12 October 2026"
    with app.test_request_context():
        assert format_date(date(2026, 10, 12)) == "Senin, 12 Oktober 2026"
