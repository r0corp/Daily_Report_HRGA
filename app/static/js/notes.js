// Catatan draft (sticky notes) di halaman Tulis Report: pekerjaan dadakan
// yang belum pasti jadi. Disimpan di server per user (ikut di HP/PC/APK),
// tidak terikat tanggal, tidak terlihat Spv. Tombol + memindahkan catatan
// ke daftar pekerjaan tanggal yang sedang dibuka (lewat window.rhReport).
(function () {
"use strict";

const P = JSON.parse(document.getElementById("pageData").textContent);
const $ = id => document.getElementById(id);
const T = (s, vars) => {
    let r = (vars && vars.n === 1 && P.i18n && P.i18n._one && P.i18n._one[s]) || (P.i18n && P.i18n[s]) || s;
    if (vars) for (const k in vars) r = r.split("{" + k + "}").join(vars[k]);
    return r;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const COLORS = ["yellow", "orange", "pink", "blue", "green"];

let notes = [];
const timers = {};

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

function toast(title, text) {
    if (window.rhNotify) window.rhNotify.toast({ type: "note", title, text });
}

function age(iso) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
    if (mins < 1) return T("Baru saja");
    if (mins < 60) return T("{n} menit lalu", { n: mins });
    const h = Math.round(mins / 60);
    if (h < 24) return T("{n} jam lalu", { n: h });
    return T("{n} hari lalu", { n: Math.round(h / 24) });
}

function autosize(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }

function noteHtml(n) {
    return `<div class="rh-note is-${n.color}" data-id="${n.id}">
        <textarea class="rh-note-text" rows="3" maxlength="2000" placeholder="${T("Tulis catatan…")}" aria-label="${T("Catatan")}">${esc(n.text)}</textarea>
        <div class="rh-note-foot">
            <small>${esc(age(n.created_at))}</small>
            <button type="button" class="rh-note-btn" data-act="color" title="${T("Ganti warna")}" aria-label="${T("Ganti warna")}"><i class="bi bi-palette"></i></button>
            <button type="button" class="rh-note-btn" data-act="del" title="${T("Hapus catatan")}" aria-label="${T("Hapus catatan")}"><i class="bi bi-trash3"></i></button>
            <button type="button" class="rh-note-btn rh-note-use" data-act="use" title="${T("Jadikan pekerjaan")}" aria-label="${T("Jadikan pekerjaan")}"><i class="bi bi-plus-lg"></i></button>
        </div>
    </div>`;
}

function render() {
    $("notes").innerHTML = notes.map(noteHtml).join("");
    $("notes").querySelectorAll("textarea").forEach(autosize);
    $("notesEmpty").hidden = notes.length > 0;
    $("notesCount").hidden = !notes.length;
    $("notesCount").textContent = notes.length;
}

const find = id => notes.find(n => n.id === id);

function save(n, ms = 800) {
    clearTimeout(timers[n.id]);
    timers[n.id] = setTimeout(async () => {
        delete timers[n.id];
        try { await api("PUT", "/api/notes/" + n.id, { text: n.text, color: n.color }); }
        catch (e) { toast(T("Gagal menyimpan catatan"), e.message); }
    }, ms);
}

async function remove(n) {
    clearTimeout(timers[n.id]);
    notes = notes.filter(x => x !== n);
    render();
    try { await api("DELETE", "/api/notes/" + n.id); }
    catch (e) { toast(T("Gagal menyimpan catatan"), e.message); load(); }
}

$("btnNoteAdd").onclick = async () => {
    const b = $("btnNoteAdd");
    b.disabled = true;
    try {
        const n = await api("POST", "/api/notes", { color: COLORS[notes.length % COLORS.length] });
        notes.unshift(n);
        render();
        const ta = $("notes").querySelector(`[data-id="${n.id}"] textarea`);
        if (ta) ta.focus();
    } catch (e) {
        toast(T("Gagal menyimpan catatan"), e.message);
    }
    b.disabled = false;
};

$("notes").addEventListener("input", e => {
    if (e.target.tagName !== "TEXTAREA") return;
    const n = find(+e.target.closest(".rh-note").dataset.id);
    n.text = e.target.value;
    autosize(e.target);
    save(n);
});

// Catatan baru yang dibiarkan kosong dibuang saat ditinggal.
$("notes").addEventListener("focusout", e => {
    if (e.target.tagName !== "TEXTAREA") return;
    const el = e.target.closest(".rh-note");
    setTimeout(() => {
        const n = find(+el.dataset.id);
        if (n && !n.text.trim() && !el.contains(document.activeElement)) remove(n);
    }, 150);
});

$("notes").addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const el = b.closest(".rh-note");
    const n = find(+el.dataset.id);
    if (!n) return;
    if (b.dataset.act === "color") {
        n.color = COLORS[(COLORS.indexOf(n.color) + 1) % COLORS.length];
        COLORS.forEach(c => el.classList.toggle("is-" + c, c === n.color));
        save(n, 300);
    } else if (b.dataset.act === "del") {
        if (!n.text.trim() || confirm(T("Hapus catatan ini?"))) remove(n);
    } else if (b.dataset.act === "use") {
        const R = window.rhReport;
        if (!n.text.trim()) { toast(T("Catatan masih kosong")); return; }
        if (!R || !R.canAdd()) { toast(T("Report tanggal ini sudah dicek Spv")); return; }
        R.addItem(n.text.trim());
        const d = R.date().split("-").reverse().slice(0, 2).join("-");
        toast(T("Dipindah ke pekerjaan"), T("Masuk ke report {d}", { d }));
        remove(n);
    }
});

async function load() {
    try { notes = (await api("GET", "/api/notes")).notes; }
    catch (e) { notes = []; }
    render();
}

// Simpan yang masih tertunda sebelum halaman ditutup.
window.addEventListener("pagehide", () => {
    for (const id in timers) {
        clearTimeout(timers[id]);
        const n = find(+id);
        if (n) fetch("/api/notes/" + id, {
            method: "PUT", keepalive: true, credentials: "same-origin",
            headers: { "Content-Type": "application/json", "X-CSRFToken": P.csrf },
            body: JSON.stringify({ text: n.text, color: n.color }),
        });
    }
});

load();
})();
