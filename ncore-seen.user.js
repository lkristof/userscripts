// ==UserScript==
// @name         nCore – Láttam már!
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  Megjelölheted a már látott filmeket (IMDB ID alapján)
// @icon         https://static.ncore.pro/styles/ncore.ico
//
// @match        https://ncore.pro/torrents.php*
// @exclude      https://ncore.pro/torrents.php?action*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-seen.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-seen.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const TORRENT_SELECTOR = '.box_torrent';
    const SEEN_CLASS = 'ncore-seen';

    /* ---- CSS ---- */
    const style = document.createElement('style');
    style.textContent = `
    .box_torrent.${SEEN_CLASS} {
      opacity: 0.5;
    }
  `;
    document.head.appendChild(style);

    /* ---- helpers ---- */
    function getImdbId(row) {
        const link = row.querySelector('.infolink');
        if (!link) return null;

        const match = link.href.match(/tt(\d+)/);
        return match ? match[1] : null;
    }

    function isSeries(row) {
        const categ = row.querySelector('.categ_link');
        return categ && /sorozat/i.test(categ.title);
    }

    function updateRow(row) {
        const imdbId = getImdbId(row);
        if (!imdbId) return;

        row.classList.toggle(
            SEEN_CLASS,
            localStorage.getItem(imdbId) !== null
        );
    }

    function updateAll() {
        document
            .querySelectorAll(TORRENT_SELECTOR)
            .forEach(updateRow);
    }

    function toggleSeen(row) {
        const imdbId = getImdbId(row);
        if (!imdbId) return;

        if (localStorage.getItem(imdbId)) {
            localStorage.removeItem(imdbId);
        } else {
            localStorage.setItem(imdbId, '1');
        }

        updateRow(row);
    }

    /* ---- events ---- */
    document
        .querySelectorAll(TORRENT_SELECTOR)
        .forEach(row => {
            if (isSeries(row)) return;

            row.addEventListener('dblclick', e => {
                e.preventDefault();
                toggleSeen(row);
            });
        });

    /* ---- init ---- */
    updateAll();
})();
