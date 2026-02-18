// ==UserScript==
// @name         nCore – No thanks
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.1
// @description  Elrejti az nCore köszönéseket a torrent oldalon.
// @icon         https://static.ncore.pro/styles/ncore.ico
//
// @match        https://ncore.pro/torrents.php*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-no-thanks.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-no-thanks.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const thanks = document.getElementById("ncoreKoszonetAjax");
    if (thanks) {
        thanks.remove();
    }
})();