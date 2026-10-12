// Tema, navbar melayang, sidebar, scroll progress, dan kalender
// (dipindah dari base.html Legal Contract).
(function () {
    "use strict";
    const root = document.documentElement;

    function apply(pref) {
        const dark = pref === "dark" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
        root.setAttribute("data-bs-theme", dark ? "dark" : "light");
        root.style.colorScheme = dark ? "dark" : "light";
        document.querySelectorAll("[data-lte-theme-icon]").forEach(i => i.classList.toggle("d-none", i.dataset.lteThemeIcon !== pref));
        document.querySelectorAll("[data-bs-theme-value]").forEach(b => b.querySelector(".bi-check-lg").classList.toggle("d-none", b.dataset.bsThemeValue !== pref));
    }
    let pref = "light";
    try { pref = localStorage.getItem("lte-theme") || "light"; } catch (e) {}
    apply(pref);
    document.querySelectorAll("[data-bs-theme-value]").forEach(b => b.addEventListener("click", () => {
        pref = b.dataset.bsThemeValue;
        try { localStorage.setItem("lte-theme", pref); } catch (e) {}
        apply(pref);
    }));
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (pref === "auto") apply(pref); });

    function positionNavbarBackdrop() {
        const navbar = document.querySelector(".app-header.navbar");
        const main = document.querySelector(".app-main");
        if (!navbar || !main) return;
        root.style.setProperty("--navbar-backdrop-height", navbar.getBoundingClientRect().bottom + "px");
        root.style.setProperty("--navbar-backdrop-left", Math.max(0, main.getBoundingClientRect().left) + "px");
    }
    positionNavbarBackdrop();
    window.addEventListener("load", positionNavbarBackdrop);
    window.addEventListener("resize", positionNavbarBackdrop);
    const toggle = document.querySelector('[data-lte-toggle="sidebar"]');
    if (toggle) toggle.addEventListener("click", () => setTimeout(positionNavbarBackdrop, 300));

    const sidebar = document.querySelector(".app-sidebar");
    if (sidebar) {
        const sync = () => sidebar.style.setProperty("margin-left",
            document.body.classList.contains("sidebar-collapse") ? "-280px" : "0px", "important");
        sync();
        new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    const bar = document.getElementById("scrollProgressBar");
    if (bar) {
        let ticking = false;
        const update = () => {
            const doc = document.documentElement, s = doc.scrollHeight - doc.clientHeight;
            bar.style.transform = "scaleX(" + (s > 0 ? Math.min(1, Math.max(0, doc.scrollTop / s)) : 0) + ")";
            ticking = false;
        };
        window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
        update();
    }

    // Kalender seragam untuk <input type="date"> biasa (form filter).
    document.querySelectorAll('input[type="date"]:not([data-no-picker])').forEach(el => {
        if (window.flatpickr) flatpickr(el, { dateFormat: "Y-m-d", altInput: true, altFormat: "d-m-Y", allowInput: true, disableMobile: true });
    });
})();
