// ==UserScript==
// @name         Prohardver Fórum – Új hozzászólás jelölő
// @namespace    https://github.com/lkristof/userscripts
// @version      1.1.2
// @description  Topikonként megjegyzi az utoljára olvasott hozzászólást és vizuálisan jelöli az új hozzászólások fejlécét.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-mark-new-posts.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-mark-new-posts.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const STORAGE_PREFIX = "ph_topic_max_id:";

    /* =========================
       COLOR HANDLING
    ========================== */

    function detectLinkColor() {
        const sample = document.querySelector('.msg-head-options a');
        return sample
            ? window.getComputedStyle(sample).color
            : "#4a90e2";
    }

    function updateMarkColor() {
        const color = detectLinkColor();
        document.documentElement.style.setProperty('--ph-mark-color', color);
    }

    function initStyle() {
        const style = document.createElement("style");
        style.textContent = `
            .ph-new-post-header {
                box-shadow: var(--ph-mark-color) 5px 0 0 0 inset !important;
                transition: box-shadow 1s ease;
            }
        `;
        document.head.appendChild(style);
    }

    function observeThemeChanges() {
        const observer = new MutationObserver(() => {
            setTimeout(updateMarkColor, 80);
        });
        observer.observe(document.body, { attributes: true, subtree: true });
    }

    /* =========================
       MAIN LOGIC
    ========================== */

    function getTopicKey() {
        const match = location.pathname.match(/\/tema\/([^/]+)/);
        return match ? STORAGE_PREFIX + match[1] : null;
    }

    function getMaxFromURL() {
        const hashMatch = location.hash.match(/#msg(\d+)/);
        if (hashMatch) {
            // Ha #msg100 van az URL-ben, akkor a 99-est tekintjük az utolsó "réginek"
            return parseInt(hashMatch[1], 10) - 1;
        }
        return null;
    }

    function process() {
        const topicKey = getTopicKey();
        if (!topicKey) return;

        const rawStored = localStorage.getItem(topicKey);
        const urlMax = getMaxFromURL();
        const comments = Array.from(document.querySelectorAll("li.media[data-id]"));

        if (!comments.length) return;

        const pageMaxId = comments.reduce((max, c) => {
            const id = parseInt(c.dataset.id, 10) || 0;
            return Math.max(max, id);
        }, 0);

        let baseId;

        if (rawStored !== null) {
            // 1. Van mentett adatunk: azt használjuk bázisnak
            baseId = parseInt(rawStored, 10);
        } else if (urlMax !== null) {
            // 2. Nincs mentett adat, DE van #msg az URL-ben: az URL-ből jövő ID a bázis
            baseId = urlMax;
        } else {
            // 3. Se mentett adat, se URL paraméter: első sima megnyitás, nem jelölünk semmit
            localStorage.setItem(topicKey, pageMaxId);
            return;
        }

        // Jelölés
        comments.forEach(comment => {
            const id = parseInt(comment.dataset.id, 10);
            const header = comment.querySelector(".msg-header");

            if (id && header && id > baseId) {
                header.classList.add("ph-new-post-header");
            }
        });

        // Mentés frissítése: mindig a legnagyobbat jegyezzük meg
        if (pageMaxId > (parseInt(rawStored, 10) || 0)) {
            localStorage.setItem(topicKey, pageMaxId);
        }
    }

    /* =========================
       INIT
    ========================== */

    initStyle();
    updateMarkColor();
    observeThemeChanges();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", process, { once: true });
    } else {
        process();
    }
})();
