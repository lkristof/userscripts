// ==UserScript==
// @name         Prohardver Fórum – Topik olvasottság jelölő
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.3
// @description  Topikonként eltárolja a legnagyobb hozzászólás ID-t és a msg-header részeket halványítja.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-mark-seen.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-mark-seen.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const STORAGE_PREFIX = "ph_topic_max_id:";

    // CSS class hozzáadása
    const style = document.createElement("style");
    style.textContent = `
        .ph-seen-header {
            filter: grayscale(100%);
            transition: filter 1s ease;
        }
    `;
    document.head.appendChild(style);

    function getTopicKey() {
        const match = location.pathname.match(/\/tema\/([^/]+)/);
        return match ? STORAGE_PREFIX + match[1] : null;
    }

    function getMaxFromURL() {
        const hashMatch = location.hash.match(/#msg(\d+)/);
        if (hashMatch) {
            return parseInt(hashMatch[1], 10) - 1; // -1, mert a linkelt hozzászólás még "nem olvasott"
        }
        return null;
    }

    function process() {
        const topicKey = getTopicKey();
        if (!topicKey) return;

        // Legnagyobb eddig olvasott ID
        let savedMaxId = parseInt(localStorage.getItem(topicKey) || "0", 10);

        // Mindig vizsgáljuk a #msgNNN-t
        const urlMax = getMaxFromURL();
        if (urlMax && urlMax > savedMaxId) {
            savedMaxId = urlMax;
        }

        const comments = Array.from(document.querySelectorAll("li.media[data-id]"));
        if (!comments.length) return;

        // Oldalon lévő legnagyobb ID
        const currentMaxId = comments.reduce((max, c) => {
            const id = parseInt(c.dataset.id, 10) || 0;
            return Math.max(max, id);
        }, savedMaxId);

        comments.forEach(comment => {
            const id = parseInt(comment.dataset.id, 10);
            if (!id) return;

            const header = comment.querySelector(".msg-header");
            if (!header) return;

            // Halványítás: régebbi hozzászólás header-je halványabb
            if (savedMaxId && id <= savedMaxId) {
                header.classList.add("ph-seen-header");
            }
        });

        // Mentés
        if (currentMaxId > savedMaxId) {
            localStorage.setItem(topicKey, currentMaxId);
        }
    }

    window.addEventListener("load", process);
})();
