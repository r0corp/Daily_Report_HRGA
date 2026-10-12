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
    return (P.auto ? "" : `<option value=""${sel ? "" : " selected"}>Pilih kategori…</option>`) +
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
      <div style="min-width:0">
        <textarea id="it-${k}" rows="1" class="form-control form-control-sm" ${ro ? "readonly" : ""}
          placeholder="Tulis pekerjaan… (Enter untuk baris baru, awali '-' untuk rincian)">${esc(it.text)}</textarea>
        <div class="rh-item-meta">
          <select class="form-select form-select-sm" aria-label="Kategori" data-act="cat" ${ro ? "disabled" : ""}>${catOptions(it.cat)}</select>
          ${CAN_AUTO ? `<span class="rh-auto">${it.manual ? '<i class="bi bi-hand-index me-1"></i>manual' : '<i class="bi bi-magic me-1"></i>otomatis'}</span>` : ""}
          <div class="form-check form-check-inline m-0">
            <input class="form-check-input" type="checkbox" id="rt-${k}" data-act="rutin" ${it.rutin ? "checked" : ""} ${ro ? "disabled" : ""}>
            <label class="form-check-label small" for="rt-${k}">Rutin</label>
          </div>
          ${ro ? "" : `<div class="rh-item-actions">
            <button class="btn btn-sm btn-outline-secondary" data-act="up" title="Naikkan" ${k === 0 ? "disabled" : ""}><i class="bi bi-arrow-up"></i></button>
            <button class="btn btn-sm btn-outline-danger" data-act="del" title="Hapus item"><i class="bi bi-trash"></i></button>
          </div>`}
        </div>
      </div>
    </li>`).join("");
    resizeAll();
    ["btnAdd", "fStatus"].forEach(id => $(id).disabled = ro);
    $("quickWrap").hidden = ro || (!P.quick.length && !prevAll.length);
    $("btnPaste").disabled = ro;
    updateCounts();
}

function updateCounts() {
    const n = cur.items.filter(i => i.text.trim()).length;
    $("itemsTitle").textContent = `Daftar pekerjaan (${n})`;
    $("waText").textContent = waText();
    renderState();
}

function renderState() {
    const labels = { draft: ["Belum dikirim", "secondary", "bi-pencil"], sent: ["Terkirim ke Spv", "primary", "bi-send-check"],
                     revision: ["Perlu perbaikan", "warning", "bi-arrow-counterclockwise"], checked: ["Sudah dicek Spv", "success", "bi-check2-all"] };
    const [label, , icon] = labels[cur.state] || labels.draft;
    const hasContent = cur.items.some(i => i.text.trim()) || cur.day_status;
    let info = `<div class="d-flex align-items-center gap-2 mb-1"><span class="badge rh-state rh-state-${cur.state}"><i class="bi ${icon} me-1"></i>${label}</span></div>`;
    if (cur.submitted_at) info += `<div class="text-secondary">Dikirim ${esc(cur.submitted_at)}${cur.edited_after_submit ? " · <strong class='text-warning-emphasis'>diubah setelah dikirim, kirim ulang supaya Spv tahu</strong>" : ""}</div>`;
    else if (cur.state === "draft") info += `<div class="text-secondary">Report tersimpan sebagai draft dan belum terlihat oleh Spv.</div>`;
    $("sendInfo").innerHTML = info;

    let canSend = cur.editable && hasContent && (cur.state !== "sent" || cur.edited_after_submit);
    const sendLabel = cur.state === "sent" || cur.state === "revision" ? "Kirim ulang ke Spv" : "Kirim ke Spv";
    for (const id of ["btnSend", "btnSendTop"]) {
        $(id).disabled = !canSend;
        $(id).innerHTML = `<i class="bi bi-send me-1"></i>${cur.state === "sent" && !cur.edited_after_submit ? "Sudah terkirim" : sendLabel}`;
    }

    let box = "";
    if (cur.state === "revision") box = `<div class="alert alert-warning"><i class="bi bi-arrow-counterclockwise me-1"></i><strong>Spv meminta perbaikan${cur.reviewed_by ? " (" + esc(cur.reviewed_by) + ")" : ""}:</strong> ${esc(cur.spv_note || "")}<div class="small mt-1">Perbaiki daftar pekerjaan di bawah lalu tekan <strong>Kirim ulang ke Spv</strong>.</div></div>`;
    else if (cur.state === "checked") box = `<div class="alert alert-success"><i class="bi bi-check2-all me-1"></i>Report ini sudah dicek${cur.reviewed_by ? " oleh " + esc(cur.reviewed_by) : ""} dan tidak bisa diubah lagi.${cur.spv_note ? `<div class="mt-1"><strong>Catatan Spv:</strong> ${esc(cur.spv_note)}</div>` : ""}</div>`;
    $("stateBox").innerHTML = box;
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
    $("fStatus").value = cur.day_status || "";
    $("pageSubtitle").textContent = longDate(date);
    history.replaceState(null, "", "?tanggal=" + date);
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
    for (const id of ["btnSend", "btnSendTop"]) $(id).disabled = true;
    try {
        const data = await api("POST", `/api/report/${cur.date}/send`);
        Object.assign(cur, { state: data.state, submitted_at: data.submitted_at, edited_after_submit: false, editable: data.editable });
        renderState();
        setSaveState("Terkirim ke Spv");
    } catch (e) {
        renderState();
        $("stateBox").innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-1"></i>${esc(e.message)}</div>`;
    }
}

// ---------- events ----------
$("items").addEventListener("input", e => {
    const li = e.target.closest(".rh-item");
    if (!li || e.target.tagName !== "TEXTAREA") return;
    const it = cur.items[+li.dataset.k];
    it.text = e.target.value;
    autosize(e.target);
    if (CAN_AUTO && !it.manual) { it.cat = classify(it.text); li.querySelector("[data-act=cat]").value = it.cat; }
    if (!it.manualRutin) { it.rutin = RUTIN.test(it.text); li.querySelector("[data-act=rutin]").checked = it.rutin; }
    markDirty();
});
$("items").addEventListener("change", e => {
    const li = e.target.closest(".rh-item");
    if (!li) return;
    const it = cur.items[+li.dataset.k];
    if (e.target.dataset.act === "cat") {
        it.cat = e.target.value; it.manual = true;
        const a = li.querySelector(".rh-auto"); if (a) a.innerHTML = '<i class="bi bi-hand-index me-1"></i>manual';
        markDirty();
    }
    if (e.target.dataset.act === "rutin") { it.rutin = e.target.checked; it.manualRutin = true; markDirty(); }
});
$("items").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const k = +b.closest(".rh-item").dataset.k;
    if (b.dataset.act === "del") { cur.items.splice(k, 1); if (!cur.items.length) cur.items.push(blank()); renderItems(); markDirty(); }
    if (b.dataset.act === "up" && k > 0) { [cur.items[k - 1], cur.items[k]] = [cur.items[k], cur.items[k - 1]]; renderItems(); markDirty(); }
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
    $("quick").innerHTML = P.quick.map((q, i) => `<button class="btn btn-sm btn-outline-primary text-start" data-q="${i}" title="${esc(q)}"><i class="bi bi-plus-circle me-1"></i>${esc(q.length > 48 ? q.slice(0, 46) + "…" : q)}</button>`).join("")
        + (prevRutin.length ? `<button class="btn btn-sm btn-outline-secondary" id="btnCopyRutin"><i class="bi bi-arrow-repeat me-1"></i>Salin ${prevRutin.length} pekerjaan rutin (${esc(prevDate)})</button>` : "")
        + (prevAll.length > prevRutin.length ? `<button class="btn btn-sm btn-outline-secondary" id="btnCopyAll"><i class="bi bi-files me-1"></i>Salin semua ${prevAll.length} pekerjaan dari report ${esc(prevDate)}</button>` : "");
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
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.q) addItem(P.quick[+b.dataset.q], true);
    if (b.id === "btnCopyRutin")
        appendItems(prevRutin.map(i => ({ text: i.text, cat: i.cat, rutin: true, manual: true, manualRutin: true })));
    if (b.id === "btnCopyAll")
        appendItems(prevAll.map(i => ({ text: i.text, cat: i.cat, rutin: !!i.rutin, manual: true, manualRutin: true })));
});

$("fStatus").onchange = () => { cur.day_status = $("fStatus").value; markDirty(); };
$("btnToday").onclick = () => load(P.today);
$("btnPrev").onclick = () => {
    const d = parseISO(cur.date);
    do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
    load(iso(d));
};
$("btnSend").onclick = send;
$("btnSendTop").onclick = send;
$("btnCopy").onclick = async () => {
    const b = $("btnCopy"), h = b.innerHTML;
    try { await navigator.clipboard.writeText(waText()); b.innerHTML = '<i class="bi bi-check2 me-1"></i>Tersalin'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($("waText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Tekan Ctrl+C"; }
    setTimeout(() => b.innerHTML = h, 1800);
};
window.addEventListener("pagehide", flush);
window.addEventListener("beforeunload", e => { if (dirty) { flush(); } });

fp = flatpickr($("fDate"), {
    dateFormat: "Y-m-d", altInput: true, altFormat: "d-m-Y", allowInput: true, disableMobile: true, maxDate: P.today,
    onChange: (sel, str) => { if (str && cur && str !== cur.date) load(str); },
});
load(P.startDate);
})();
