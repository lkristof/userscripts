// ==UserScript==
// @name         nCore – No thanks
// @namespace    ncore
// @version      1.0.0
// @description  Elrejti az nCore köszönéseket a torrent oldalon
// @match        https://ncore.pro/torrents.php*
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