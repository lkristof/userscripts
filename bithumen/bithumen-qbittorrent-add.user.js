// ==UserScript==
// @name         BitHUmen – qBittorrent Add
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  Adds a [qB] button to BitHUmen torrent links to send torrents directly to qBittorrent WebUI
// @icon         https://bithumen.be/favicon.ico
//
// @match        https://bithumen.be/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/bithumen/bithumen-qbittorrent-add.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/bithumen/bithumen-qbittorrent-add.user.js
//
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(async function () {
    'use strict';

    const KEY = "qb_url";
    const LS_PREFIX = 'bithumen_';

    /* ---------------- GM storage adapter (iOS compatible) ---------------- */
    async function gmGet(key, def = "") {
        try {
            if (typeof GM_getValue === "function") return GM_getValue(key, def);
            if (typeof GM !== "undefined" && GM.getValue) return await GM.getValue(key, def);
        } catch (e) {
        }

        const v = localStorage.getItem(LS_PREFIX + key);
        return v ?? def;
    }

    async function gmSet(key, val) {
        try {
            if (typeof GM_setValue === "function") return GM_setValue(key, val);
            if (typeof GM !== "undefined" && GM.setValue) return await GM.setValue(key, val);
        } catch (e) {
        }

        localStorage.setItem(LS_PREFIX + key, val);
    }

    async function gmDel(key) {
        try {
            if (typeof GM_deleteValue === "function") return GM_deleteValue(key);
            if (typeof GM !== "undefined" && GM.deleteValue) return await GM.deleteValue(key);
        } catch (e) {
        }

        localStorage.removeItem(LS_PREFIX + key);
    }

    /* ---------------- Toast ---------------- */
    let toastContainer = null;
    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            Object.assign(toastContainer.style, {
                position: "fixed",
                bottom: "20px",
                right: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                zIndex: 99999
            });
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function showToast(message, type = 'success', duration = 3000) {
        const container = getToastContainer();

        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position: 'relative',
            overflow: 'hidden',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            minWidth: '220px',
            opacity: '0',
            transform: 'translateX(20px)',
            transition: 'all 0.3s ease',
            backgroundColor: type === 'success' ? '#2ecc71' : '#e74c3c',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        });

        const text = document.createElement('div');
        text.textContent = message;

        const bar = document.createElement('div');
        Object.assign(bar.style, {
            position: 'absolute',
            left: '0',
            bottom: '0',
            height: '3px',
            width: '100%',
            background: 'rgba(255,255,255,0.9)',
            transformOrigin: 'left',
            transform: 'scaleX(1)',
        });

        const animName = `toastBar_${Math.random().toString(16).slice(2)}`;
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ${animName} {
              from { transform: scaleX(1); }
              to   { transform: scaleX(0); }
            }`;
        document.head.appendChild(style);

        bar.style.animation = `${animName} ${duration}ms linear forwards`;

        toast.appendChild(text);
        toast.appendChild(bar);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        if (container.children.length > 5) container.removeChild(container.firstChild);

        let remaining = duration;
        let start = Date.now();
        let timeout;

        function removeToast() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 300);
        }

        function startTimer(time) {
            start = Date.now();
            timeout = setTimeout(removeToast, Math.max(0, time));
        }

        startTimer(remaining);

        toast.addEventListener('mouseenter', () => {
            bar.style.animationPlayState = 'paused';
            clearTimeout(timeout);
            const elapsed = Date.now() - start;
            remaining -= elapsed;
        });

        toast.addEventListener('mouseleave', () => {
            bar.style.animationPlayState = 'running';
            startTimer(remaining);
        });
    }

    /* ---------------- Send torrent ---------------- */
    async function sendToQB(downloadUrl) {

        const QB_URL = await gmGet(KEY, "http://127.0.0.1:8080");

        // torrent letöltése (cookie-val)
        const torrent = await fetch(downloadUrl, {
            credentials: "include"
        });

        const blob = await torrent.blob();

        const form = new FormData();
        form.append("torrents", blob, "torrent.torrent");

        GM_xmlhttpRequest({
            method: "POST",
            url: QB_URL + "/api/v2/torrents/add",
            data: form,
            onload: function () {
                showToast("Torrent elküldve qBittorrentbe", "success");
            },
            onerror: function () {
                showToast("Hiba qBittorrent küldésnél", "error");
            }
        });
    }

    /* ---------------- Inject qB button ---------------- */
    function inject() {
        document.querySelectorAll('a[href*="download.php"]').forEach(a => {

            if (a.dataset.qb) return;
            a.dataset.qb = 1;

            const qb = document.createElement("a");
            qb.href = "#";
            qb.textContent = "[qB]";
            qb.style.color = "#2ecc71";

            qb.onclick = (e) => {
                e.preventDefault();
                sendToQB(a.href);
            };

            const space = document.createTextNode(" ");

            a.after(space, qb);
        });

    }

    /* ---------------- QB URL link az infosávba ---------------- */
    async function addQBLink() {

        const bar = document.querySelector("span.smallfont nobr");

        if (!bar || document.querySelector("#qb-url-link")) return;

        const link = document.createElement("a");
        link.id = "qb-url-link";
        link.href = "#";
        link.textContent = "qB URL";

        link.onclick = async (e) => {
            e.preventDefault();

            const current = await gmGet(KEY, "http://127.0.0.1:8080");

            const url = prompt(
                "qBittorrent WebUI URL (pl. http://127.0.0.1:8080)",
                current
            );

            if (!url) return;

            await gmSet(KEY, url);
            showToast("qB URL elmentve", "success");
        };

        const wrap = document.createElement("span");
        wrap.innerHTML = " [";
        wrap.appendChild(link);
        wrap.append("]");

        bar.appendChild(document.createTextNode(" "));
        bar.appendChild(wrap);
    }

    /* ---------------- Init ---------------- */

    inject();
    await addQBLink();

    new MutationObserver(inject).observe(document.body, {
        childList: true,
        subtree: true
    });

})();