"""Terjemahan isi report Indonesia -> English lewat DeepL API.

Kunci API hanya di .env server: DEEPL_API_KEY=... (key paket Free berakhiran
":fx" otomatis memakai api-free.deepl.com). Tanpa key, fitur memberi pesan
"belum diatur" - aplikasi lain tetap jalan normal.
"""

import json
import urllib.error
import urllib.request

from flask import current_app

FREE_URL = "https://api-free.deepl.com/v2/translate"
PRO_URL = "https://api.deepl.com/v2/translate"


class TranslateError(Exception):
    """kind: not_configured | auth | quota | busy | network | http"""

    def __init__(self, kind):
        super().__init__(kind)
        self.kind = kind


def is_configured():
    return bool(current_app.config.get("DEEPL_API_KEY"))


def deepl_translate(texts, source="ID", target="EN-US"):
    key = current_app.config.get("DEEPL_API_KEY", "")
    if not key:
        raise TranslateError("not_configured")
    url = current_app.config.get("DEEPL_API_URL") or (FREE_URL if key.endswith(":fx") else PRO_URL)

    body = json.dumps({
        "text": texts,
        "source_lang": source,
        "target_lang": target,
        # Baris baru dan tanda "- " rincian tetap seperti aslinya.
        "preserve_formatting": True,
        "split_sentences": "nonewlines",
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"DeepL-Auth-Key {key}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        raise TranslateError({403: "auth", 456: "quota", 429: "busy", 503: "busy"}.get(e.code, "http")) from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise TranslateError("network") from e

    return [t.get("text", "") for t in data.get("translations", [])]
