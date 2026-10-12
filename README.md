# Daily Report HRGA

Aplikasi report kerja harian untuk tim HRGA (IT, GA, HR Recruitment,
Receptionist, Mekanik, Office Boy). Staf menulis report, menekan
**Kirim ke Spv**, lalu Supervisor HRGA memeriksa dari dashboard.

- Server: `http://192.168.120.229:8300` (service Windows `DailyReportHRGA`)
- Stack: Flask + SQLite + waitress, tampilan AdminLTE seperti Legal Contract (aksen hijau)
- Database: `instance\report.db`

## Peran

| Peran | Login | Bisa |
|---|---|---|
| Staf | pilih nama + PIN 4-6 angka | tulis report sendiri, riwayat, rekap pribadi |
| Supervisor | pilih nama + password | dashboard Report Masuk, cek/minta perbaikan, rekap semua staf + Excel, atur kategori |
| Admin (IT) | pilih nama + password | semua di atas + kelola user, reset PIN, buka kunci |

Salah PIN/password 5 kali -> akun terkunci 15 menit (admin bisa membuka dari menu User).

## Menulis report

- **Tempel teks**: tempel report format WA lama; judul/tanggal dilewati, tiap nomor atau baris "-" jadi satu
  pekerjaan, sub-poin (`*`/`-` di bawah nomor) dan grup `#` digabung ke pekerjaannya.
- **Salin semua dari report terakhir**: untuk pekerjaan yang hampir sama tiap hari (OB), lalu hapus/ubah yang berbeda.
- **Kategori otomatis**: IT dari aturan kata kunci di `report.js`; tim lain dari `DEFAULT_KEYWORDS` di
  `app/constants.py` (disusun dari contoh report asli 9 Okt 2026). Selalu bisa diganti manual.

## Alur report

`Belum dikirim` -> **Kirim ke Spv** -> `Terkirim` -> Spv: **Tandai sudah dicek** (`Sudah dicek`, terkunci)
atau **Minta perbaikan** (`Perlu perbaikan`, staf memperbaiki lalu kirim ulang).
Report yang diubah setelah dikirim ditandai "diubah" di dashboard Spv.

## Instalasi pertama di server

1. Di laptop dev: `powershell -ExecutionPolicy Bypass -File .\package_server.ps1 -WithArchive`
   (`-WithArchive` ikut membawa arsip Sticky Notes milik Rohman).
2. Copy `dist\DailyReportHRGA-server.zip` ke server, extract ke `C:\Users\TCI-PC-010\daily-report-hrga`.
3. PowerShell **Run as Administrator** di server:
   ```
   Set-Location C:\Users\TCI-PC-010\daily-report-hrga
   powershell -ExecutionPolicy Bypass -File .\setup_server.ps1
   ```
   Catat password admin yang tampil sekali di layar.
4. Backup harian: `powershell -ExecutionPolicy Bypass -File .\install_backup_task.ps1`
5. Akun staf dari `data\daftar_staf.csv` dibuat otomatis di langkah 3 dengan PIN acak 6 angka
   (tampil di layar + `instance\pin_awal.txt`). Bagikan langsung ke tiap staf, lalu hapus file itu.
   Staf/Spv lain: tambah baris di CSV lalu `venv\Scripts\python.exe create_staff.py data\daftar_staf.csv`,
   atau lewat menu **User** di aplikasi.

Setup tidak menyentuh aplikasi lain di server (Asset Tracker :8000, Remote Tracker :8100,
Legal Contract :8200) dan berhenti kalau port 8300 sudah dipakai.

## Update

Siapkan file yang berubah di folder `update\` (struktur sama dengan folder aplikasi),
lalu di server (Run as Administrator): `powershell -ExecutionPolicy Bypass -File .\update_server.ps1`.
Database di-backup otomatis sebelum update; `.env`, `instance\`, `venv\`, `logs\` tidak disentuh.

## Development

```
venv\Scripts\python.exe run.py          # http://127.0.0.1:8300
venv\Scripts\python.exe -m pytest -q
```

Kategori & pekerjaan rutin bawaan per tim ada di `app/constants.py`; setelah diubah dari menu
**Kategori & Rutin**, nilai di database yang dipakai. Kategori otomatis tim IT ada di
`app/static/js/report.js`.
