// Editor Tulis Report: autosave ke server, kategori otomatis (tim IT),
// kirim ke Spv, dan teks WhatsApp.
(function () {
"use strict";

const P = JSON.parse(document.getElementById("pageData").textContent);
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ---------- kategori otomatis (hanya tim IT) ----------
const CATS = [
 ['Kegiatan Kantor / Non-IT',3,/17 agustus|august 17|panitia|bbq|lomba|competition|gathering|outing|halal ?bihalal|buka bersama|sosialisasi/gi],
 ['Pengembangan Aplikasi & Sistem',3,/build aplikasi|ticketing|helpdesk|flow aplikasi|develop|web ?app|asset tracker|legal contract|report harian|daily report|power ?apps|power ?automate|coding|sourcode|source ?code|mailchimp|ecommerce|workflow|aplikasi pembuatan/gi],
 ['CCTV & Keamanan',3,/cctv|nvr\b|dvr\b|ip ?cam|door ?lock|kamera pengawas|piracy|fraud/gi],
 ['Mesin Absensi',3,/absensi|attendance|fingerprint|finger print|suprema/gi],
 ['IP Phone & Telepon',3,/ip ?phone|\bext\b|extension|phone line|line telfon|telfon|pabx|receive calls|depo(t)? phone|legal phone|phone units/gi],
 ['Printer & Fotokopi',3,/printer|prinnter|print\b|printing|kyocera|fotocop|photocop|copier|epson|toner|tinta|\bink\b|scan.?(to|by).?email|scaning|scanner|paper|kertas|lx ?310|canon|brother|rdn/gi],
 ['Setup Perangkat Baru / Reinstall',3,/laptop preparation|preparation .{0,20}laptop|prepare (aset|laptop|pc|asset)|set ?up \d+ laptop|setup laptop|new pc|new laptop|reinstall windows|install ulang|instal ulang|stock laptop|laptop baru|pc baru|upgrade windows|bootable|tci-i\d|create administrators?|set up administrators?|mission in/gi],
 ['Pengadaan & Vendor',2,/vendor|procure|pengadaan|purchas|quotation|price quote|penawaran|\bpr\b|spek|specification|beli|pembelian|invoice|payment|rekomendasi|recommendation|survey|autodesk agent|authorized partner|proposal/gi],
 ['Meeting & Koordinasi',2,/meeting|metting|meet with|rapat|diskusi|discuss|koordinasi|coordinat|report (problem|to)|lapor|presentasi|jobdesk|minutes|berita acara|confirm/gi],
 ['Jaringan & Internet',1,/internet|network|jaringan|indihome|indibiz|circle ?one|modem|wifi|wi-fi|\blan\b|router|switch|starlink|vpn|\bisp\b|server|kabel|cable|access point|mikrotik|bandwidth|ip address|ip setting|dns|corepatch|hotspot|topologi|orbit/gi],
 ['Email & Microsoft 365',1,/email|e-mail|outlook|teams|exchange|m365|office 365|microsoft 365|smtp|mailbox|signature|otp|display ?name|\bmfa\b|\w@\b|@tradecorp|storage .{0,15}email/gi],
 ['Cloud & Data (OneDrive/SharePoint)',1,/onedrive|one drive|sharepoint|cloud|gdrive|google drive|backup|back up|sync|sinkron|share link|folder|data\b|file|zip/gi],
 ['Software & Lisensi',1,/install|instal|license|lisensi|activat|aktivasi|autocad|revit|sketchup|cadmate|adobe|ms\.? ?office|office app|excel|word\b|pdf|software|aplikasi|application|apps\b|zoom|whatsapp|wechat|chrome|browser|edge\b|visual c|sap ?2000|lumion|tawk|claude|ms\.? ?project|\bmep\b|autodesk|office 2021|xampp/gi],
 ['Perangkat AV & Ruang Meeting',2,/\btv\b|hdmi|projector|proyektor|infocus|screen meeting|bracket|speaker|mod multi/gi],
 ['Perangkat Mobile (HP/iPhone)',2,/iphone|cellphone|cell phone|ponsel|\bhp\b|mobile|\bphone\b|memory card|sdxc|gps|cartrack/gi],
 ['Inventaris & Aset IT',2,/inventaris|inventory|\baset\b|\basset\b|dxdiag|packing|perlengkapan|rekap/gi],
 ['Troubleshooting Laptop/PC',1,/windows|regist(e)?ry|registery|bluescreen|driver|bios|tpm|keyboard|mouse|adapter|charger|ssd|hdd|hardrive|hard ?disk|motherboard|mainboard|battery|baterai|hardware|drive [cd]\b|c: drive|partition|storage|cache|\bram\b|cpu|lemot|slow|lag\b|hang|flicker|not respond|force close|crash|virus|malware|camera|cursor|monitor/gi],
 ['Troubleshooting Laptop/PC',0.4,/laptop|\bpc\b|komputer|computer|credential|password|login|log in|account|akun|remote|bypass|fix|repair/gi],
];
const RUTIN = /(kyocera|fotocop|photocop|copier).*(cakung|kelancaran|smooth)|(cakung|kelancaran).*(kyocera|copier)|(indihome|indibiz).*(circle ?one|scbd)|bypass (indihome|indibiz|network cakung)|periodic|regularly|rutin|berkala/i;

// Tim non-IT: kata kunci per kategori dari server (constants.DEFAULT_KEYWORDS).
const KW = (P.keywords || []).map(([c, p]) => [c, 1, new RegExp(p, "gi")]);
const CAN_AUTO = P.auto || KW.length > 0;

function hits(re, s) { const set = new Set(); re.lastIndex = 0; for (const m of s.matchAll(re)) set.add(m[0].toLowerCase()); return set; }
function classify(t) {
    if (!CAN_AUTO || !t.trim()) return "";
    const first = t.split("\n")[0], sc = {};
    for (const [n, w, re] of (P.auto ? CATS : KW)) {
        const h1 = hits(re, first), ha = hits(re, t);
        let extra = 0; for (const x of ha) if (!h1.has(x)) extra++;
        const s = h1.size ? w * (2 * h1.size + extra) : w * ha.size * 0.5;
        if (s) sc[n] = (sc[n] || 0) + s;
    }
    const keys = Object.keys(sc);
    if (!keys.length) return P.auto ? "Lainnya" : "";
    // Skor sama: IT ikut urutan kategori, tim lain ikut urutan kata kunci
    // (yang lebih spesifik, mis. Toilet, ditulis lebih dulu).
    const order = P.auto ? P.categories : KW.map(k => k[0]);
    return keys.sort((a, b) => sc[b] - sc[a] || order.indexOf(a) - order.indexOf(b))[0];
}

// ---------- util ----------
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const longDate = s => { const d = parseISO(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

async function api(method, url, body) {
    const r = await fetch(url, {
        method, credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": P.csrf },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (r.redirected || r.status === 401) { location.href = "/login"; throw new Error("login"); }
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(data.error || ("HTTP " + r.status));
    return data;
}

// ---------- state ----------
let cur = null;          // {date, day_status, items, state, editable, ...}
let prevRutin = [], prevAll = [], prevDate = null;
let dirty = false, saveTimer = null, saving = Promise.resolve();
const blank = () => ({ text: "", cat: "", rutin: false, manual: false });

function waText() {
    const d = parseISO(cur.date);
    const st = cur.day_status ? ` (${cur.day_status})` : "";
    const lines = cur.items.filter(i => i.text.trim()).map((i, k) => `${k + 1}. ${i.text.trim()}`);
    return `Daily Report ${HARI[d.getDay()]}/${pad(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()} (${P.name}).${st}\n\n${lines.join("\n")}`;
}
function catOptions(sel) {
    let opts = P.categories.slice();
    if (sel && !opts.includes(sel)) opts.unshift(sel);
    // Selalu ada pilihan kosong: baris yang belum diisi tidak boleh
    // tampil seolah sudah berkategori (dulu IT jatuh ke opsi pertama).
    return `<option value=""${sel ? "" : " selected"}>${CAN_AUTO ? "Kategori otomatis" : "Pilih kategori…"}</option>` +
        opts.map(c => `<option${c === sel ? " selected" : ""}>${esc(c)}</option>`).join("");
}
function autosize(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }
// Tinggi dihitung ulang setelah layout selesai: saat render pertama lebar
// kolom belum final sehingga scrollHeight bisa ratusan piksel.
function resizeAll() { requestAnimationFrame(() => $("items").querySelectorAll("textarea").forEach(autosize)); }
window.addEventListener("load", resizeAll);
let resizeTimer = null;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeAll, 150); });
function setSaveState(t, err) { $("saveState").textContent = t; $("saveState").classList.toggle("text-danger", !!err); }

function renderItems() {
    const ro = !cur.editable;
    $("items").innerHTML = cur.items.map((it, k) => `
    <li class="rh-item" data-k="${k}">
      <span class="rh-num">${k + 1}</span>
      <div class="rh-item-main">
        <textarea id="it-${k}" rows="1" class="form-control rh-input" ${ro ? "readonly" : ""}
          placeholder="${k === 0 ? "Contoh: Cleaning ruang meeting dan toilet" : "Tulis pekerjaan berikutnya…"}">${esc(it.text)}</textarea>
        <div class="rh-item-meta">
          <label class="rh-pill rh-cat-pill${it.cat ? "" : " is-empty"}" title="Kategori (ketuk untuk mengganti)">
            <i class="bi bi-tag"></i>
            <select aria-label="Kategori" data-act="cat" ${ro ? "disabled" : ""}>${catOptions(it.cat)}</select>
          </label>
          <button type="button" class="rh-pill rh-rutin-pill${it.rutin ? " is-on" : ""}" data-act="rutin" ${ro ? "disabled" : ""}
            aria-pressed="${it.rutin}" title="Tandai sebagai pekerjaan rutin"><i class="bi bi-arrow-repeat"></i>Rutin</button>
        </div>
      </div>
      ${ro ? "" : `<button type="button" class="rh-del" data-act="del" title="Hapus pekerjaan ini" aria-label="Hapus pekerjaan ${k + 1}"><i class="bi bi-x-lg"></i></button>`}
    </li>`).join("");
    resizeAll();
    $("btnAdd").disabled = ro;
    $("btnPaste").disabled = ro;
    document.querySelectorAll(".rh-chip").forEach(c => c.disabled = ro);
    $("quickWrap").hidden = ro || !P.quick.length;
    updateCounts();
}

function updateCounts() {
    const n = cur.items.filter(i => i.text.trim()).length;
    $("itemsTitle").textContent = n ? `Pekerjaan hari ini (${n})` : "Pekerjaan hari ini";
    $("sendCount").textContent = cur.day_status && !n ? cur.day_status : `${n} pekerjaan`;
    $("waText").textContent = waText();
    // Tombol "mulai cepat" hanya saat laporan masih kosong.
    $("startBox").hidden = !cur.editable || n > 0;
    $("btnCopyAll").hidden = !prevAll.length;
    renderState();
}

function renderState() {
    const hasContent = cur.items.some(i => i.text.trim()) || cur.day_status;
    const sent = cur.state === "sent" && !cur.edited_after_submit;
    const canSend = cur.editable && hasContent && !sent;
    let label = "Kirim ke Spv", icon = "bi-send-fill", info = "Belum dikirim";
    if (cur.state === "sent" && cur.edited_after_submit) { label = "Kirim ulang"; info = "Ada perubahan, kirim ulang"; }
    else if (sent) { label = "Terkirim"; icon = "bi-check2-circle"; info = `Dikirim ${esc(cur.submitted_at || "")}`; }
    else if (cur.state === "revision") { label = "Kirim perbaikan"; info = "Spv minta perbaikan"; }
    else if (cur.state === "checked") { label = "Sudah dicek"; icon = "bi-check2-all"; info = "Sudah dicek Spv"; }
    else if (!hasContent) info = "Tulis minimal satu pekerjaan";
    $("btnSend").disabled = !canSend;
    $("btnSend").innerHTML = `<i class="bi ${icon}"></i><span>${label}</span>`;
    $("btnSend").classList.toggle("is-done", sent || cur.state === "checked");
    $("sendInfo").innerHTML = info;

    const who = cur.reviewed_by ? ` (${esc(cur.reviewed_by)})` : "";
    let box = "";
    if (cur.state === "revision") box = `<div class="rh-notice rh-notice-warn"><i class="bi bi-arrow-counterclockwise"></i><div><strong>Spv minta perbaikan${who}</strong><p>${esc(cur.spv_note || "")}</p><small>Perbaiki daftar di bawah, lalu tekan <b>Kirim perbaikan</b>.</small></div></div>`;
    else if (cur.state === "checked") box = `<div class="rh-notice rh-notice-ok"><i class="bi bi-check2-all"></i><div><strong>Laporan sudah dicek Spv${who}</strong>${cur.spv_note ? `<p>${esc(cur.spv_note)}</p>` : "<p>Terima kasih, tidak ada yang perlu diubah.</p>"}</div></div>`;
    else if (sent) box = `<div class="rh-notice rh-notice-sent"><i class="bi bi-send-check"></i><div><strong>Laporan terkirim ke Spv</strong><p>Dikirim ${esc(cur.submitted_at || "")}. Masih bisa diubah; kalau diubah, tekan Kirim ulang.</p></div></div>`;
    $("stateBox").innerHTML = box;
}

function renderDate() {
    const d = parseISO(cur.date), today = parseISO(P.today);
    const diff = Math.round((today - d) / 86400000);
    $("dateLabel").textContent = diff === 0 ? "Hari ini" : diff === 1 ? "Kemarin" : `${diff} hari lalu`;
    $("dateLabel").classList.toggle("is-past", diff > 0);
    $("dateText").textContent = longDate(cur.date);
    $("btnNext").disabled = diff <= 0;
    document.querySelectorAll(".rh-chip").forEach(c => {
        const on = c.dataset.status === (cur.day_status || "");
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-checked", on);
    });
}

// ---------- load / save ----------
let fp = null;
async function load(date) {
    flush();
    await saving;
    let data;
    try { data = await api("GET", "/api/report/" + date); }
    catch (e) { setSaveState("Gagal memuat report: " + e.message, true); return; }
    prevRutin = data.previous_rutin || [];
    prevAll = data.previous_items || [];
    prevDate = data.previous_date;
    cur = { ...data, items: (data.items || []).map(i => ({ ...i })) };
    const draft = ls.get("rh-draft:" + date);
    if (draft && cur.editable && draft.savedAt && (!data.exists || draft.unsaved)) {
        cur.items = draft.items; cur.day_status = draft.day_status; dirty = true;
        setSaveState("Memulihkan isian yang belum tersimpan…");
        scheduleSave(200);
    } else {
        dirty = false;
        setSaveState(cur.editable ? (data.exists ? "Tersimpan" : "Tersimpan otomatis saat mengetik") : "Hanya bisa dibaca");
    }
    if (!cur.items.length && cur.editable) cur.items.push(blank());
    if (fp) fp.setDate(date, false);
    $("copyAllInfo").textContent = prevAll.length ? `${prevAll.length} pekerjaan dari ${prevDate}, tinggal diubah` : "";
    history.replaceState(null, "", "?tanggal=" + date);
    renderDate();
    renderQuick();
    renderItems();
}

function markDirty() {
    dirty = true;
    updateCounts();
    setSaveState("Belum tersimpan…");
    ls.set("rh-draft:" + cur.date, { items: cur.items, day_status: cur.day_status, savedAt: Date.now(), unsaved: true });
    scheduleSave(1200);
}
function scheduleSave(ms) { clearTimeout(saveTimer); saveTimer = setTimeout(save, ms); }
function save() {
    saveTimer = null;
    const snap = { date: cur.date, day_status: cur.day_status, items: cur.items.filter(i => i.text.trim()) };
    saving = saving.then(async () => {
        try {
            const data = await api("PUT", "/api/report/" + snap.date, snap);
            ls.del("rh-draft:" + snap.date);
            if (cur.date === snap.date) {
                Object.assign(cur, { state: data.state, editable: data.editable, submitted_at: data.submitted_at,
                                     edited_after_submit: data.edited_after_submit, exists: data.exists });
                dirty = false;
                setSaveState("Tersimpan");
                renderState();
            }
        } catch (e) {
            setSaveState("Gagal menyimpan (" + e.message + "). Isian aman di browser ini, coba lagi sebentar.", true);
        }
    });
    return saving;
}
function flush() { if (saveTimer) { clearTimeout(saveTimer); save(); } }

async function send() {
    flush();
    await saving;
    $("btnSend").disabled = true;
    try {
        const data = await api("POST", `/api/report/${cur.date}/send`);
        Object.assign(cur, { state: data.state, submitted_at: data.submitted_at, edited_after_submit: false, editable: data.editable });
        renderState();
        setSaveState("Terkirim ke Spv");
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (window.rhNotify) window.rhNotify.notify({ type: "sent", title: "Laporan terkirim", text: "Spv akan memeriksa laporan Anda." });
    } catch (e) {
        renderState();
        $("stateBox").innerHTML = `<div class="rh-notice rh-notice-warn"><i class="bi bi-exclamation-triangle"></i><div><strong>Belum terkirim</strong><p>${esc(e.message)}</p></div></div>`;
    }
}

// ---------- events ----------
$("items").addEventListener("input", e => {
    const li = e.target.closest(".rh-item");
    if (!li || e.target.tagName !== "TEXTAREA") return;
    const it = cur.items[+li.dataset.k];
    it.text = e.target.value;
    autosize(e.target);
    if (CAN_AUTO && !it.manual) {
        it.cat = classify(it.text);
        li.querySelector("[data-act=cat]").value = it.cat;
        li.querySelector(".rh-cat-pill").classList.toggle("is-empty", !it.cat);
    }
    if (P.auto && !it.manualRutin) setRutin(li, it, RUTIN.test(it.text));
    markDirty();
});
// Enter di baris terakhir yang sudah terisi = langsung tambah pekerjaan baru
// (Shift+Enter tetap baris baru untuk rincian).
$("items").addEventListener("keydown", e => {
    if (e.key !== "Enter" || e.shiftKey || e.target.tagName !== "TEXTAREA") return;
    const k = +e.target.closest(".rh-item").dataset.k;
    if (k === cur.items.length - 1 && e.target.value.trim() && !e.target.value.includes("\n")) {
        e.preventDefault();
        addItem();
    }
});
function setRutin(li, it, on) {
    it.rutin = on;
    const b = li.querySelector("[data-act=rutin]");
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on);
}
$("items").addEventListener("change", e => {
    const li = e.target.closest(".rh-item");
    if (!li || e.target.dataset.act !== "cat") return;
    const it = cur.items[+li.dataset.k];
    it.cat = e.target.value; it.manual = true;
    li.querySelector(".rh-cat-pill").classList.toggle("is-empty", !it.cat);
    markDirty();
});
$("items").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const li = b.closest(".rh-item"), k = +li.dataset.k, it = cur.items[k];
    if (b.dataset.act === "del") {
        cur.items.splice(k, 1);
        if (!cur.items.length) cur.items.push(blank());
        renderItems(); markDirty();
    }
    if (b.dataset.act === "rutin") { it.manualRutin = true; setRutin(li, it, !it.rutin); markDirty(); }
});

function addItem(text = "", rutin = false) {
    const last = cur.items[cur.items.length - 1];
    if (text && last && !last.text.trim()) cur.items.pop();
    cur.items.push({ text, cat: text ? classify(text) : "", rutin: rutin || RUTIN.test(text), manual: false, manualRutin: rutin });
    renderItems();
    if (text) markDirty();
    else { const ta = $("it-" + (cur.items.length - 1)); if (ta) ta.focus(); }
}
$("btnAdd").onclick = () => addItem();

function renderQuick() {
    $("quick").innerHTML = P.quick.map((q, i) =>
        `<button type="button" class="rh-quick-btn" data-q="${i}" title="${esc(q)}"><i class="bi bi-plus"></i><span>${esc(q)}</span></button>`).join("");
}

function appendItems(list) {
    cur.items = cur.items.filter(i => i.text.trim());
    for (const i of list) cur.items.push(i);
    if (!cur.items.length) cur.items.push(blank());
    renderItems();
    markDirty();
}

// ---------- tempel teks report (format WA) ----------
const HEADER_RE = /(daily\s*report|^report\b|report\s+hari|^laporan\b)/i;
const DATE_ONLY_RE = /^[\w',.\s/-]*\d{1,2}[\s/-]+(\w+|\d{1,2})[\s/-]+\d{4}[\w\s().,-]*$/i;
function parseReport(text) {
    text = text
        .replace(/[​-‍⁠﻿]/g, "")          // karakter tak terlihat dari WhatsApp
        .replace(/[ \t]{2,}(\d{1,3}\s*[.)]\s)/g, "\n$1");     // "... datang.  6. pelayanan" -> baris baru
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bulletRe = /^[-*•·–]\s*/, numRe = /^\d{1,3}\s*[.)]\s*/, headRe = /^#+\s*/;
    // Lewati judul/tanggal sebelum poin pertama.
    let start = 0;
    while (start < lines.length && !numRe.test(lines[start]) && !bulletRe.test(lines[start]) && !headRe.test(lines[start])
           && (HEADER_RE.test(lines[start]) || DATE_ONLY_RE.test(lines[start]))) start++;
    const body = lines.slice(start);
    const hasNumbered = body.some(l => numRe.test(l));
    const hasBullets = body.some(l => bulletRe.test(l) || headRe.test(l));
    const items = [];
    let group = null, last = null;
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    for (const l of body) {
        if (headRe.test(l)) {
            group = { text: cap(l.replace(headRe, "")) };
            items.push(group); last = group;
        } else if (numRe.test(l)) {
            const t = l.replace(numRe, "");
            if (group) group.text += "\n- " + t;
            else { last = { text: t }; items.push(last); }
        } else if (bulletRe.test(l)) {
            const t = l.replace(bulletRe, "");
            if ((hasNumbered || group) && last) last.text += "\n- " + t;
            else { last = { text: t }; items.push(last); }
        } else if (!hasNumbered && !hasBullets) {
            last = { text: l }; items.push(last);
        } else if (last) {
            last.text += " " + l;
        } else {
            last = { text: l }; items.push(last);
        }
    }
    return items.map(i => i.text.trim()).filter(Boolean);
}

function pastePreview() {
    const list = parseReport($("pasteText").value);
    $("pasteCount").textContent = list.length ? `${list.length} pekerjaan akan ditambahkan` : "Pratinjau";
    $("pastePreview").innerHTML = list.map(t => {
        const c = classify(t);
        return `<li class="text-pre">${esc(t)}${c ? ` <span class="rh-badge">${esc(c)}</span>` : ""}</li>`;
    }).join("");
    $("pasteApply").disabled = !list.length;
}
$("pasteText").addEventListener("input", pastePreview);
$("pasteApply").addEventListener("click", () => {
    const list = parseReport($("pasteText").value);
    appendItems(list.map(t => ({ text: t, cat: classify(t), rutin: P.auto && RUTIN.test(t), manual: false })));
    $("pasteText").value = "";
    pastePreview();
    bootstrap.Modal.getOrCreateInstance($("pasteModal")).hide();
});
document.getElementById("pasteModal").addEventListener("shown.bs.modal", () => $("pasteText").focus());
$("quick").addEventListener("click", e => {
    const b = e.target.closest("button[data-q]");
    if (!b) return;
    addItem(P.quick[+b.dataset.q], true);
    b.classList.add("is-added");
    setTimeout(() => b.classList.remove("is-added"), 900);
});
$("btnCopyAll").onclick = () =>
    appendItems(prevAll.map(i => ({ text: i.text, cat: i.cat, rutin: !!i.rutin, manual: true, manualRutin: true })));

document.querySelector(".rh-daystatus").addEventListener("click", e => {
    const c = e.target.closest(".rh-chip");
    if (!c || c.disabled) return;
    cur.day_status = c.dataset.status;
    renderDate();
    markDirty();
});
function shiftDay(step) {
    const d = parseISO(cur.date);
    do { d.setDate(d.getDate() + step); } while (d.getDay() === 0 || d.getDay() === 6);
    const next = iso(d);
    load(next > P.today ? P.today : next);
}
$("btnPrev").onclick = () => shiftDay(-1);
$("btnNext").onclick = () => shiftDay(1);
$("btnPickDate").onclick = () => fp && fp.open();
$("btnSend").onclick = send;
// navigator.clipboard hanya ada di https; di http (server kantor) dan
// WebView APK pakai textarea + execCommand yang masih didukung.
async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    return ok;
}
$("btnCopy").onclick = async () => {
    const b = $("btnCopy"), h = b.innerHTML;
    if (await copyText(waText())) {
        b.innerHTML = '<i class="bi bi-check2 me-1"></i>Tersalin, tinggal tempel di WhatsApp';
    } else {
        const r = document.createRange(); r.selectNodeContents($("waText"));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        b.textContent = "Teks sudah dipilih, tekan lama lalu Salin";
    }
    setTimeout(() => b.innerHTML = h, 2500);
};
window.addEventListener("pagehide", flush);
window.addEventListener("beforeunload", e => { if (dirty) { flush(); } });

fp = flatpickr($("fDate"), {
    dateFormat: "Y-m-d", disableMobile: true, maxDate: P.today, clickOpens: false,
    positionElement: $("btnPickDate"),
    onChange: (sel, str) => { if (str && cur && str !== cur.date) load(str); },
});
load(P.startDate);
})();
