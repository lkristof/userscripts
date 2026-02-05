// ==UserScript==
// @name         Prohardver Fórum – Üzenet hivatkozás kiemelés
// @namespace    ph
// @version      1.1.2
// @description  Kiemeli az aktuális #msg hozzászólást; ha nincs, a legközelebbit.
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    /**********************
     * CSS
     **********************/
    const style = document.createElement("style");
    style.textContent = `
        .hash-highlight {
            transition: background 0.3s, border 0.3s;
        }
        body[data-theme="light"] .hash-highlight {
            background-color: #FFF6C8 !important;
            border: 2px solid #FF9800 !important;
        }
        body[data-theme="dark"] .hash-highlight {
            background-color: #4A4015 !important;
            border: 2px solid #FFB300 !important;
        }
    `;
    document.head.appendChild(style);

    /**********************
     * TÉMA FELISMERÉS
     **********************/
    function updateBodyTheme() {
        const darkLink = document.querySelector('link[href*="dark_base"]');
        let dark = false;

        if (darkLink) {
            const media = darkLink.getAttribute("media");
            if (media === "all") dark = true;
            else if (media === "not all") dark = false;
            else if (media?.includes("prefers-color-scheme")) {
                dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        }

        const btn = document.querySelector(".theme-button span");
        if (btn && btn.classList.contains("fa-sun-bright")) dark = true;

        document.body.setAttribute("data-theme", dark ? "dark" : "light");
    }

    /**********************
     * HASH KIEMELÉS
     **********************/
    let lastHashMsgId = null;
    let lastHash = null;

    function findClosestMsgBody(targetId) {
        const items = [...document.querySelectorAll("li.media[data-id]")];
        if (!items.length) return null;

        let closest = null;
        let minDiff = Infinity;

        for (const li of items) {
            const id = Number(li.dataset.id);
            if (Number.isNaN(id)) continue;

            const diff = Math.abs(id - targetId);
            if (diff < minDiff) {
                minDiff = diff;
                closest = li;
            }
        }

        return closest?.querySelector(".msg-body") || null;
    }

    function highlightHashMsg() {
        updateBodyTheme();

        const hash = window.location.hash;
        let msgId = null;

        if (hash && hash.startsWith("#msg")) {
            msgId = Number(hash.replace("#msg", ""));
            if (!Number.isNaN(msgId)) {
                lastHashMsgId = msgId;
            }
        } else if (lastHashMsgId !== null) {
            msgId = lastHashMsgId;
        } else {
            return;
        }

        // korábbi kiemelés törlése
        document.querySelectorAll(".msg-body.hash-highlight").forEach(b => {
            b.classList.remove("hash-highlight");
        });

        // pontos találat
        let body = document.querySelector(
            `li.media[data-id="${msgId}"] .msg-body`
        );

        // fallback: legközelebbi
        if (!body) {
            body = findClosestMsgBody(msgId);
        }

        if (!body) return;

        body.classList.add("hash-highlight");
    }

    function onHashChange() {
        if (window.location.hash === lastHash) return;
        lastHash = window.location.hash;
        highlightHashMsg();
    }

    /**********************
     * INIT
     **********************/
    function init() {
        lastHash = window.location.hash;
        highlightHashMsg();

        if (lastHash) {
            setTimeout(() => {
                window.location.hash = lastHash;
            }, 0);
        }
    }

    window.addEventListener("hashchange", onHashChange);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

})();
