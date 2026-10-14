// Pengganti tampilan <select class="form-select"> bawaan browser dengan
// pemilih bergaya aplikasi (kartu di PC, lembar dari bawah di HP) - sama
// dengan pemilih kategori di halaman Tulis Report.
// <select> asli tetap ada (disembunyikan) supaya form, filter, dan event
// "change" berjalan seperti biasa. Lewati dengan atribut data-native.
// Dimuat paling akhir supaya nilai yang di-set script halaman ikut terbaca.
(function () {
    "use strict";

    const L = window.RH_SELECT_TEXT || {};
    const t = s => L[s] || s;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    let picker = null, ctx = null;

    function labelFor(sel) {
        return sel._rhLabel || sel.getAttribute("aria-label") || sel.title || t("Pilih");
    }

    function syncButton(sel) {
        const btn = sel._rhBtn;
        if (!btn) return;
        const opt = sel.options[sel.selectedIndex];
        btn.querySelector("span").textContent = opt ? opt.textContent.trim() : "";
        btn.classList.toggle("is-placeholder", !sel.value);
        btn.disabled = sel.disabled;
    }

    function enhance(sel) {
        if (sel._rhBtn || sel.multiple || sel.hasAttribute("data-native")) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = sel.className.replace(/\bform-select\b/, "form-select rh-select-btn");
        btn.setAttribute("aria-haspopup", "listbox");
        btn.innerHTML = "<span></span>";
        if (sel.id) btn.id = sel.id + "_btn";
        sel.parentNode.insertBefore(btn, sel);
        sel.classList.add("rh-select-native");
        sel.tabIndex = -1;
        sel.setAttribute("aria-hidden", "true");
        sel._rhBtn = btn;
        // <label for> menunjuk ke tombol supaya klik label ikut membuka.
        const lab = sel.id && document.querySelector(`label[for="${sel.id}"]`);
        if (lab) { sel._rhLabel = lab.textContent.trim(); lab.htmlFor = btn.id; }
        btn.addEventListener("click", () => open(sel));
        sel.addEventListener("change", () => syncButton(sel));
        // Validasi "required": tampilkan pesan di tombol.
        sel.addEventListener("invalid", () => { btn.classList.add("is-invalid"); btn.focus(); });
        syncButton(sel);
    }

    function build() {
        picker = document.createElement("div");
        picker.className = "rh-picker";
        picker.hidden = true;
        picker.innerHTML = `
          <div class="rh-picker-backdrop" data-close></div>
          <div class="rh-picker-panel" role="dialog" aria-modal="true">
            <div class="rh-picker-head"><strong></strong>
              <button type="button" class="rh-picker-x" data-close aria-label="${esc(t("Tutup"))}"><i class="bi bi-x-lg"></i></button></div>
            <label class="rh-picker-search"><i class="bi bi-search"></i>
              <input type="search" placeholder="${esc(t("Cari…"))}" autocomplete="off" aria-label="${esc(t("Cari…"))}"></label>
            <div class="rh-picker-list" role="listbox"></div>
          </div>`;
        document.body.appendChild(picker);
        picker.addEventListener("click", e => {
            if (e.target.closest("[data-close]")) return close();
            const opt = e.target.closest(".rh-picker-opt");
            if (opt) choose(+opt.dataset.index);
        });
        picker.querySelector("input").addEventListener("input", renderList);
        picker.addEventListener("keydown", e => {
            if (e.key === "Escape") { e.preventDefault(); close(); return; }
            const opts = [...picker.querySelectorAll(".rh-picker-opt")];
            if (e.key === "Enter" && e.target.tagName === "INPUT" && opts[0]) { e.preventDefault(); opts[0].click(); return; }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const i = opts.indexOf(document.activeElement);
                const n = e.key === "ArrowDown" ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1);
                if (opts[n]) opts[n].focus();
            }
        });
        window.addEventListener("resize", () => { if (ctx) close(); });
        window.addEventListener("scroll", () => { if (ctx && !picker.classList.contains("is-sheet")) close(); }, { passive: true });
    }

    function renderList() {
        const sel = ctx.sel;
        const q = picker.querySelector("input").value.trim().toLowerCase();
        const check = '<i class="bi bi-check-lg rh-picker-check"></i>';
        let html = "", group = null, shown = 0;
        [...sel.options].forEach((o, i) => {
            const text = o.textContent.trim();
            if (q && (!o.value || !text.toLowerCase().includes(q))) return;
            // Placeholder ("Pilih nama…") pada isian wajib bukan pilihan sungguhan.
            if (!o.value && sel.required) return;
            const g = o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label : null;
            if (g && g !== group) html += `<div class="rh-picker-group">${esc(g)}</div>`;
            group = g;
            const on = i === sel.selectedIndex && (o.value || !q);
            html += `<button type="button" class="rh-picker-opt${on ? " is-on" : ""}${o.value ? "" : " rh-picker-auto"}"
                data-index="${i}" role="option" aria-selected="${on}" ${o.disabled ? "disabled" : ""}><span>${esc(text)}</span>${check}</button>`;
            shown++;
        });
        if (!shown) html = `<div class="rh-picker-empty">${esc(t("Tidak ditemukan"))}</div>`;
        picker.querySelector(".rh-picker-list").innerHTML = html;
    }

    function open(sel) {
        if (sel.disabled) return;
        if (!picker) build();
        ctx = { sel, btn: sel._rhBtn };
        ctx.btn.setAttribute("aria-expanded", "true");
        picker.querySelector(".rh-picker-head strong").textContent = labelFor(sel);
        picker.querySelector(".rh-picker-panel").setAttribute("aria-label", labelFor(sel));
        const input = picker.querySelector("input");
        input.value = "";
        const many = sel.options.length > 8;
        picker.querySelector(".rh-picker-search").hidden = !many;
        renderList();
        const sheet = window.innerWidth < 576;
        picker.classList.toggle("is-sheet", sheet);
        picker.hidden = false;
        const panel = picker.querySelector(".rh-picker-panel");
        panel.style.top = panel.style.left = panel.style.width = "";
        if (!sheet) {
            const r = ctx.btn.getBoundingClientRect();
            panel.style.width = Math.max(240, Math.min(r.width, 420)) + "px";
            const w = panel.offsetWidth, h = panel.offsetHeight;
            const below = r.bottom + 6 + h <= window.innerHeight - 8;
            panel.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + "px";
            panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + "px";
        }
        requestAnimationFrame(() => picker.classList.add("is-open"));
        const cur = picker.querySelector(".rh-picker-opt.is-on") || picker.querySelector(".rh-picker-opt");
        if (!sheet && many) input.focus();
        else if (cur) { cur.focus(); cur.scrollIntoView({ block: "nearest" }); }
    }

    function close() {
        if (!picker || !ctx) return;
        const btn = ctx.btn;
        btn.setAttribute("aria-expanded", "false");
        ctx = null;
        picker.classList.remove("is-open");
        picker.hidden = true;
        if (btn && document.body.contains(btn)) btn.focus();
    }

    function choose(index) {
        const sel = ctx.sel;
        const changed = sel.selectedIndex !== index;
        sel.selectedIndex = index;
        sel._rhBtn.classList.remove("is-invalid");
        syncButton(sel);
        close();
        if (changed) sel.dispatchEvent(new Event("change", { bubbles: true }));
    }

    document.querySelectorAll("select.form-select").forEach(enhance);
    window.rhSelect = { enhance, sync: syncButton };
})();
