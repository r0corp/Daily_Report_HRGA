# Buat paket untuk dicopy ke PC server:
#   dist\DailyReportHRGA-server.zip -> extract ke C:\Users\TCI-PC-010\Daily_Report_HRGA
#
# Jalankan: powershell -ExecutionPolicy Bypass -File .\package_server.ps1
#   -WithArchive  ikut sertakan data\archive.json (arsip Sticky Notes) untuk
#                 diimpor otomatis saat setup_server.ps1

param(
    [switch]$WithArchive
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$dist = Join-Path $root "dist"
$staging = Join-Path $env:TEMP "DailyReportHRGA-package"

Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $dist, $staging | Out-Null

# Tanpa venv, database, .env, cache, tests dan file lama.
foreach ($item in @("app", "config.py", "run.py", "serve_production.py", "seed.py",
                    "import_archive.py", "create_staff.py", "backup.py", "install_backup_task.ps1",
                    "requirements.txt", "README.md",
                    "setup_server.ps1", "update_server.ps1")) {
    Copy-Item (Join-Path $root $item) $staging -Recurse
}

New-Item -ItemType Directory -Force (Join-Path $staging "data") | Out-Null
Copy-Item (Join-Path $root "data\daftar_staf.csv") (Join-Path $staging "data\daftar_staf.csv")

if ($WithArchive) {
    Copy-Item (Join-Path $root "data\archive.json") (Join-Path $staging "data\archive.json")
}

Get-ChildItem $staging -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

$zip = Join-Path $dist "DailyReportHRGA-server.zip"
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zip -Force

Remove-Item -Recurse -Force $staging

Get-ChildItem $dist | Select-Object Name, @{ n = "KB"; e = { [math]::Round($_.Length / 1KB) } }
