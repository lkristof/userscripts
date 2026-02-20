// ==UserScript==
// @name         Prohardver Fórum – Új hozzászólás jelölő
// @namespace    https://github.com/lkristof/userscripts
// @version      1.1.1
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

        observer.observe(document.body, {
            attributes: true,
            subtree: true
        });
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
            return parseInt(hashMatch[1], 10) - 1;
        }
        return null;
    }

    function process() {
        const topicKey = getTopicKey();
        if (!topicKey) return;

        // 1. Betöltjük a mentett ID-t. Ha még sose jártunk itt, 0 lesz.
        const storedMaxId = parseInt(localStorage.getItem(topicKey) || "0", 10);
        const urlMax = getMaxFromURL();

        // 2.
        // Ha van #msg az URL-ben, az a bázis.
        // Ha nincs, de van mentett érték, az a bázis.
        // Ha nincs mentett érték sem (első látogatás), a bázis 0 legyen, hogy MINDEN újnak számítson.
        let baseId;
        if (urlMax && urlMax > storedMaxId) {
            baseId = urlMax;
        } else if (storedMaxId > 0) {
            baseId = storedMaxId;
        } else {
            baseId = 0;
        }

        const comments = Array.from(document.querySelectorAll("li.media[data-id]"));
        if (!comments.length) return;

        // 3. Jelölés
        comments.forEach(comment => {
            const id = parseInt(comment.dataset.id, 10);
            const header = comment.querySelector(".msg-header");

            // Ha baseId 0, minden pozitív ID-jú hsz-t megjelöl (első látogatás)
            // Ha baseId > 0, csak a bázis utániakat jelöli
            if (id && header && id > baseId) {
                header.classList.add("ph-new-post-header");
            }
        });

        // 4. Mentés: Frissítjük a tárolt értéket az oldal legfrissebb hozzászólására.
        // Így a következő oldalbetöltéskor ezek már "régiek" lesznek.
        const pageMaxId = comments.reduce((max, c) => {
            const id = parseInt(c.dataset.id, 10) || 0;
            return Math.max(max, id);
        }, storedMaxId);

        if (pageMaxId > storedMaxId) {
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
