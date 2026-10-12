"""Daftar tim, peran, dan nilai awal kategori / pekerjaan rutin.

Kategori dan pekerjaan rutin per tim bisa diubah admin dari menu
Pengaturan (disimpan di tabel setting); nilai di sini hanya dipakai
kalau belum pernah diubah.
"""

ROLE_STAFF = "staff"
ROLE_SPV = "spv"
ROLE_ADMIN = "admin"

ROLES = {
    ROLE_STAFF: "Staf",
    ROLE_SPV: "Supervisor",
    ROLE_ADMIN: "Admin",
}

# Urutan = urutan tampil di login, dashboard Spv dan rekap.
TEAMS = [
    "IT",
    "GA",
    "HR Recruitment",
    "Receptionist",
    "Mekanik",
    "Office Boy",
    "Supervisor",
]

DAY_STATUSES = ["", "Cuti", "Sakit", "Izin", "Libur", "Perjalanan Dinas"]

STATE_DRAFT = "draft"
STATE_SENT = "sent"
STATE_REVISION = "revision"
STATE_CHECKED = "checked"

STATES = {
    STATE_DRAFT: ("Belum dikirim", "secondary"),
    STATE_SENT: ("Terkirim", "primary"),
    STATE_REVISION: ("Perlu perbaikan", "warning"),
    STATE_CHECKED: ("Sudah dicek", "success"),
}

# IT memakai kategori otomatis dari kata kunci (lihat static/js/report.js);
# daftar ini harus sama dengan nama kategori di sana.
IT_CATEGORIES = [
    "Printer & Fotokopi",
    "Troubleshooting Laptop/PC",
    "Jaringan & Internet",
    "Software & Lisensi",
    "Cloud & Data (OneDrive/SharePoint)",
    "Email & Microsoft 365",
    "Setup Perangkat Baru / Reinstall",
    "CCTV & Keamanan",
    "IP Phone & Telepon",
    "Pengadaan & Vendor",
    "Meeting & Koordinasi",
    "Perangkat Mobile (HP/iPhone)",
    "Mesin Absensi",
    "Inventaris & Aset IT",
    "Pengembangan Aplikasi & Sistem",
    "Perangkat AV & Ruang Meeting",
    "Kegiatan Kantor / Non-IT",
    "Lainnya",
]

DEFAULT_CATEGORIES = {
    "IT": IT_CATEGORIES,
    # Disusun dari contoh report asli tiap tim (9 Okt 2026).
    "GA": [
        "Keuangan & Pembayaran",
        "Pembelian & Pengadaan",
        "Onboarding & Dukungan Karyawan",
        "Acara Kantor",
        "Pemeliharaan Gedung & Fasilitas",
        "Pengiriman Dokumen",
        "Keamanan & Absensi",
        "Aset & Inventaris",
        "Meeting & Koordinasi",
        "Lainnya",
    ],
    "HR Recruitment": [
        "Interview",
        "Persiapan Interview",
        "Background Checking",
        "Screening CV",
        "Posting Lowongan",
        "Psikotes / Tes",
        "Offering & Onboarding",
        "Administrasi Karyawan",
        "Meeting & Koordinasi",
        "Lainnya",
    ],
    "Receptionist": [
        "Penerimaan & Pelayanan Tamu",
        "Telepon & Operator",
        "Absensi & Voucher Makan",
        "Perjalanan Dinas (TR, Tiket, Hotel)",
        "Surat & Paket",
        "Reservasi Ruang Meeting",
        "Administrasi & Arsip",
        "Lainnya",
    ],
    "Mekanik": [
        "Forklift & Alat Angkat",
        "AC & Pendingin",
        "Listrik & Pompa Air",
        "Perawatan Fasilitas",
        "Support Depo & Operasional",
        "Pengecekan Harian",
        "Penggantian Sparepart",
        "Lainnya",
    ],
    "Office Boy": [
        "Kebersihan Ruangan",
        "Kebersihan Toilet",
        "Kebersihan Area Luar",
        "Pantry, Minuman & Galon",
        "ATK & Perlengkapan",
        "Persiapan Acara & Meeting",
        "Tugas Luar & Kurir",
        "Utilitas & Kunci Ruangan",
        "Bantuan Umum",
        "Lainnya",
    ],
    "Supervisor": [
        "Koordinasi Tim",
        "Review & Approval",
        "Meeting & Koordinasi",
        "Administrasi",
        "Lainnya",
    ],
}

# Tombol "tambah cepat" pekerjaan rutin per tim.
DEFAULT_QUICK = {
    "IT": [
        "Remote troubleshooting of a Kyocera photocopier in Cakung: scan-to-email function, printing, copying, and configuration.",
        "Performed a remote bypass on Indibiz Cakung and Circle One SCBD to check the stability of the internet connection.",
        "Periodic checking of all CCTV field and office areas: image quality, connectivity, backup and storage.",
    ],
    "GA": [
        "Create absen security",
        "Create & submission payment voucher to finance",
    ],
    "HR Recruitment": [
        "Screening CV kandidat yang masuk",
        "Background checking kandidat",
    ],
    "Receptionist": [
        "Membuat daily absence",
        "Mengirimkan daily absence ke email pak Pandu",
        "Membuat voucher lunch",
        "Menerima tamu dan menginfokan ke yang dituju bahwa tamunya sudah datang",
    ],
    "Mekanik": [
        "Check level oli hydraulic & engine forklift",
        "Check level accu forklift",
        "Test pengereman forklift",
    ],
    "Office Boy": [
        "Cleaning ruang area office",
        "Cleaning toilet laki-laki dan toilet wanita",
        "Ceklis harian toilet laki-laki dan toilet wanita",
        "Ambil galon di security dan isi dispenser",
        "Cleaning sampah area office",
        "Pelayanan dan permintaan ATK",
        "Cuci piring dan gelas",
        "Matikan listrik dan mengunci ruangan sebelum pulang",
    ],
    "Supervisor": [],
}

# Kata kunci kategori otomatis untuk tim non-IT (regex, huruf kecil).
# Kategori yang tidak ada di daftar tim (mis. sudah di-rename admin)
# diabaikan; staf tetap bisa memilih manual.
DEFAULT_KEYWORDS = {
    "GA": {
        "Keuangan & Pembayaran": r"petty cash|reimburs|payment voucher|voucher|invoice|finance|pembayaran|bayar|tagihan|request petty",
        "Pembelian & Pengadaan": r"\bbuy\b|beli|purchase|pembelian|order|pengadaan|vendor|quotation|penawaran",
        "Onboarding & Dukungan Karyawan": r"induction|onboard|serah terima|\bwob\b|pkwt|new hire|karyawan baru|laptop|id card",
        "Acara Kantor": r"townhall|town hall|wedding|karangan bunga|acara|event|gathering|ulang tahun|17 agustus",
        "Pemeliharaan Gedung & Fasilitas": r"freon|\bac\b|listrik|lampu|bocor|perbaik|repair|maintenance|gedung|fasilitas",
        "Pengiriman Dokumen": r"resi|kirim|send|dokumen|stnk|paket|ekspedisi|jne|tiki",
        "Keamanan & Absensi": r"absen|security|satpam|keamanan|cctv|akses",
        "Aset & Inventaris": r"aset|asset|inventaris|penyimpanan|gudang|stock",
        "Meeting & Koordinasi": r"meeting|rapat|koordinasi|diskusi",
    },
    "HR Recruitment": {
        "Interview": r"interview|wawancara",
        "Persiapan Interview": r"prep|persiapan|jadwal|schedule|undang|invit",
        "Background Checking": r"background|reference check|bg check",
        "Screening CV": r"screening|\bcv\b|resume|sourcing|shortlist",
        "Posting Lowongan": r"posting|lowongan|job ?post|jobstreet|linkedin|loker|glints",
        "Psikotes / Tes": r"psikotes|psikologi|test|tes\b|assessment",
        "Offering & Onboarding": r"offer|onboard|induction|pkwt|kontrak kerja|join",
        "Administrasi Karyawan": r"administrasi|data karyawan|bpjs|absensi|arsip|dokumen",
        "Meeting & Koordinasi": r"meeting|rapat|koordinasi|diskusi",
    },
    "Receptionist": {
        "Perjalanan Dinas (TR, Tiket, Hotel)": r"\btr\b|mobilisasi|demobilisasi|tiket|ticket|hotel|pesawat|travel|perjalanan dinas",
        "Absensi & Voucher Makan": r"absen|absence|attendance|voucher|lunch|makan siang",
        "Penerimaan & Pelayanan Tamu": r"tamu|visitor|guest|pelayanan minuman",
        "Telepon & Operator": r"telp|telepon|telpon|telfon|phone|call|operator|menyambungkan",
        "Surat & Paket": r"surat|paket|kiriman|ekspedisi|resi|dokumen",
        "Reservasi Ruang Meeting": r"ruang meeting|booking ruang|reservasi ruang|meeting room",
        "Administrasi & Arsip": r"arsip|administrasi|input|data",
    },
    "Mekanik": {
        "Forklift & Alat Angkat": r"forklift|reach ?stacker|crane|hoist|cylinder|hydraulic|hidrolik",
        "AC & Pendingin": r"\bac\b|freon|kompresor|outdoor|indoor|pendingin|reefer",
        "Listrik & Pompa Air": r"listrik|lampu|kabel|mcb|panel|pompa|sanyo|toren|torn|genset",
        "Perawatan Fasilitas": r"pipa|bocor|las\b|cat\b|atap|pintu|perbaikan gedung|fasilitas",
        "Support Depo & Operasional": r"depo|container|kontainer|worker|support|bantu",
        "Pengecekan Harian": r"check|cek|level|test|inspeksi|accu|aki|oli",
        "Penggantian Sparepart": r"ganti|replace|part|sparepart|kampas",
    },
    "Office Boy": {
        "Kebersihan Toilet": r"toilet|wc|kamar mandi|handsoap|sabun",
        "Kebersihan Area Luar": r"gerbang|parkir|halaman|belakang|kantin|siram|tanaman|buang sampah",
        "Pantry, Minuman & Galon": r"kopi|teh\b|gelas|galon|golon|dispenser|aqua|minum|pentri|pantry|piring|kelapa",
        "Utilitas & Kunci Ruangan": r"kunci|mengunci|listrik|lampu|\bac\b|pompa|sanyo|toren|torn|matikan|hidupkan|nyalakan|nyalahin|sebelum pulang",
        "Kebersihan Ruangan": r"cleaning|bersih|sapu|pel\b|lap\b|sampah|lobby|loby|pintu kaca",
        "ATK & Perlengkapan": r"\batk\b|tissue|tisu|perlengkapan",
        "Persiapan Acara & Meeting": r"town ?hall|acara|event|persiapan|penataan|kursi|meja payung",
        "Tugas Luar & Kurir": r"ke luar kantor|keluar kantor|beli|pengantaran|antar invoice|ambil invoice|invoice|bank|setor|penyetoran|\bpt\b|kurir",
        "Bantuan Umum": r"packing|kardus|bantu|support|cari|voucher",
    },
    "Supervisor": {},
}
