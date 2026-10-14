"""Terjemahan sederhana Indonesia (bawaan) <-> English.

Teks sumber di template/kode ditulis dalam Bahasa Indonesia dan dibungkus
_("..."); kalau bahasa aktif English, teks dicari di kamus EN di bawah
(kalau belum ada, teks Indonesia yang tampil). Placeholder memakai
format Python: _("{n} pekerjaan", n=3).

Bahasa dipilih lewat cookie `lang` (per perangkat), diatur oleh route
auth.set_lang. Data (nama kategori, isi laporan, teks WhatsApp) tidak
diterjemahkan.
"""

from flask import g, has_request_context, request

LANGS = {"id": "Bahasa Indonesia", "en": "English"}
DEFAULT_LANG = "id"
COOKIE = "lang"


def get_lang():
    if not has_request_context():
        return DEFAULT_LANG
    lang = g.get("lang")
    if lang is None:
        lang = request.cookies.get(COOKIE)
        if lang not in LANGS:
            lang = DEFAULT_LANG
        g.lang = lang
    return lang


def _(text, **kwargs):
    if get_lang() == "en":
        text = (EN_ONE.get(text) if kwargs.get("n") == 1 else None) or EN.get(text, text)
    return text.format(**kwargs) if kwargs else text


def js_strings():
    """Kamus untuk JavaScript: kosong saat Bahasa Indonesia (teks sumber
    sudah Indonesia), kamus EN utuh saat English (~20 KB, cukup kecil)."""
    return {**EN, "_one": EN_ONE} if get_lang() == "en" else {}


from .i18n_en import EN, EN_ONE  # noqa: E402  (kamus besar dipisah supaya mudah diedit)
