// ==UserScript==
// @name         Prohardver – msg anchor highlight
// @namespace    ph
// @version      1.0.0
// @description  Kiemeli az aktuális #msg hozzászólást, light/dark mód támogatással
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://itcafe.hu/tema/*
// @match        https://gamepod.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
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

    function highlightHashMsg() {
        updateBodyTheme();

        const hash = window.location.hash;
        let msgId = null;

        if (hash && hash.startsWith("#msg")) {
            msgId = hash.replace("#msg", "");
            lastHashMsgId = msgId;
        } else if (lastHashMsgId) {
            msgId = lastHashMsgId;
        } else {
            return;
        }

        // Eltávolítjuk a korábbi kiemelést
        document.querySelectorAll(".msg-body.hash-highlight").forEach(b => {
            b.classList.remove("hash-highlight");
        });

        // Aktuális hozzászólás
        const body = document.querySelector(`li.media[data-id="${msgId}"] .msg-body`);
        if (!body) return;

        body.classList.add("hash-highlight");
    }

    /**********************
     * INIT
     **********************/
    function init() {
        highlightHashMsg();
    }

    window.addEventListener("hashchange", highlightHashMsg);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", highlightHashMsg);

    const observer = new MutationObserver(highlightHashMsg);
    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

})();
