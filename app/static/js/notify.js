// Notifikasi bunyi + pop-up (terkirim, laporan baru masuk, sudah dicek,
// minta perbaikan). Bunyi dibuat dengan Web Audio, tanpa file suara,
// supaya ringan dan tetap jalan di WebView (APK Android).
// Browser hanya mengizinkan bunyi setelah pengguna pernah menyentuh
// halaman, jadi AudioContext "dibuka" pada ketukan/klik pertama.
(function () {
    "use strict";

    let ctx = null;
    function audio() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }
    ["pointerdown", "keydown", "touchstart"].forEach(ev =>
        window.addEventListener(ev, () => audio(), { once: true, passive: true }));

    // Nada: [frekuensi Hz, mulai detik, durasi detik]
    const TUNES = {
        sent: [[660, 0, 0.12], [880, 0.11, 0.22]],                    // naik: terkirim
        incoming: [[880, 0, 0.18], [660, 0.2, 0.3]],                  // ding-dong: laporan masuk
        checked: [[784, 0, 0.12], [988, 0.1, 0.12], [1319, 0.2, 0.3]],  // chime: sudah dicek
        revision: [[523, 0, 0.18], [392, 0.2, 0.3]],                  // turun: perlu perbaikan
    };

    function play(kind) {
        const c = audio();
        if (!c || c.state !== "running") return;
        const t0 = c.currentTime + 0.02;
        for (const [freq, start, dur] of TUNES[kind] || TUNES.sent) {
            const osc = c.createOscillator(), gain = c.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t0 + start);
            gain.gain.exponentialRampToValueAtTime(0.22, t0 + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
            osc.connect(gain).connect(c.destination);
            osc.start(t0 + start);
            osc.stop(t0 + start + dur + 0.05);
        }
        if (navigator.vibrate) navigator.vibrate(kind === "revision" ? [80, 60, 80] : 60);
    }

    const ICONS = { sent: "bi-send-check", incoming: "bi-inbox", checked: "bi-check2-all", revision: "bi-arrow-counterclockwise" };
    let box = null;
    function toast({ type, title, text, url }) {
        if (!box) {
            box = document.createElement("div");
            box.className = "rh-toasts";
            box.setAttribute("aria-live", "polite");
            document.body.appendChild(box);
        }
        const el = document.createElement(url ? "a" : "div");
        el.className = `rh-toast rh-toast-${type}`;
        if (url) el.href = url;
        el.innerHTML = `<i class="bi ${ICONS[type] || "bi-bell"}"></i><div><strong></strong><span></span></div>`;
        el.querySelector("strong").textContent = title;
        el.querySelector("span").textContent = text || "";
        box.appendChild(el);
        requestAnimationFrame(() => el.classList.add("is-in"));
        setTimeout(() => { el.classList.remove("is-in"); setTimeout(() => el.remove(), 300); }, 6000);
    }

    function notify(ev) {
        play(ev.type);
        toast(ev);
    }
    window.rhNotify = { play, toast, notify };

    // Cek kejadian baru tiap 30 detik (dan saat tab kembali aktif).
    // Waktu cek terakhir disimpan per tab supaya kejadian saat pindah
    // halaman tidak terlewat.
    let since = null, busy = false;
    try { since = sessionStorage.getItem("rh-notif-since"); } catch (e) {}
    async function poll() {
        if (busy || document.hidden) return;
        busy = true;
        try {
            const r = await fetch("/api/notif" + (since ? "?since=" + encodeURIComponent(since) : ""),
                                  { credentials: "same-origin", headers: { Accept: "application/json" } });
            if (r.ok && !r.redirected) {
                const data = await r.json();
                since = data.now;
                try { sessionStorage.setItem("rh-notif-since", since); } catch (e) {}
                data.events.forEach((ev, i) => setTimeout(() => notify(ev), i * 1200));
            }
        } catch (e) { /* jaringan putus sebentar: coba lagi di siklus berikutnya */ }
        busy = false;
    }
    poll();
    setInterval(poll, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
})();
