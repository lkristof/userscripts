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
    function toast(msg, color = "#2ecc71") {
        const t = document.createElement("div");

        Object.assign(t.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: color,
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "6px",
            fontWeight: "bold",
            zIndex: 99999,
            boxShadow: "0 3px 10px rgba(0,0,0,.3)"
        });

        t.textContent = msg;
        document.body.appendChild(t);

        setTimeout(() => t.remove(), 2500);
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
                toast("Torrent elküldve qBittorrentbe");
            },
            onerror: function () {
                toast("Hiba qBittorrent küldésnél", "#e74c3c");
            }
        });

        toast("Torrent elküldve qBittorrentbe");
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
            toast("qB URL elmentve");
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