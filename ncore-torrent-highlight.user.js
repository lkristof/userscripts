// ==UserScript==
// @name         nCore – 3+ pluszos torrentek kiemelése
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.2
// @description  3 vagy több + jel esetén kiszínezi a torrent sort
// @icon         https://static.ncore.pro/styles/ncore.ico
//
// @match        https://ncore.pro/torrents.php*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-torrent-highlight.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-torrent-highlight.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const HIGHLIGHT_BG = "#600A0A"; // ténylegesen használt szín

    function highlight(box) {
        const plusEl = box.querySelector(".box_d2");
        if (!plusEl) return;

        const plusCount = (plusEl.textContent.match(/\+/g) || []).length;

        if (plusCount >= 3) {
            const main = box.querySelector(".box_nagy, .box_nagy2");
            if (!main) return;

            main.style.setProperty(
                "background",
                `linear-gradient(${HIGHLIGHT_BG}, ${HIGHLIGHT_BG})`,
                "important"
            );
        }
    }

    function scan(root = document) {
        root.querySelectorAll(".box_torrent").forEach(highlight);
    }

    function init() {
        scan();

        new MutationObserver(muts => {
            for (const m of muts) {
                for (const n of m.addedNodes) {
                    if (!(n instanceof HTMLElement)) continue;
                    if (n.matches(".box_torrent")) {
                        highlight(n);
                    } else {
                        n.querySelectorAll?.(".box_torrent").forEach(highlight);
                    }
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    init();
})();
