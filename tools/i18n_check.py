"""Cek kelengkapan terjemahan English.

    python tools/i18n_check.py          -> daftar teks yang belum ada di app/i18n_en.py
    python tools/i18n_check.py --js     -> cetak daftar kunci JS (untuk JS_KEYS)

Teks dicari dari _("...") / _('...') di template & Python, dan T("...")
di static/js.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"

PY_TPL = re.compile(r"""_\(\s*(['"])((?:\\.|(?!\1).)*?)\1""", re.S)
JS = re.compile(r'''\bT\(\s*"((?:\\.|[^"\\])*)"''')


def unescape(s):
    return s.replace("\\'", "'").replace('\\"', '"')


def collect():
    keys = {}
    for f in list(APP.rglob("*.html")) + list(APP.rglob("*.py")):
        if "vendor" in f.parts or f.name in ("i18n_en.py",):
            continue
        for m in PY_TPL.finditer(f.read_text(encoding="utf-8")):
            keys.setdefault(unescape(m.group(2)), set()).add(f.name)
    js = set()
    for f in (APP / "static" / "js").glob("*.js"):
        for m in JS.finditer(f.read_text(encoding="utf-8")):
            k = unescape(m.group(1))
            js.add(k)
            keys.setdefault(k, set()).add(f.name)
    return keys, js


def main():
    keys, js = collect()
    if "--js" in sys.argv:
        print("\n".join(sorted(js)))
        return
    sys.path.insert(0, str(ROOT))
    from app.i18n_en import EN
    missing = sorted(k for k in keys if k not in EN and k.strip())
    print(f"{len(keys)} teks, {len(missing)} belum diterjemahkan")
    for k in missing:
        print(f"  {k!r}  ({', '.join(sorted(keys[k]))})")
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
