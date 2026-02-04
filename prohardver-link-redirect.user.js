// ==UserScript==
// @name         Prohardver Fórum – Link átirányító
// @namespace    ph
// @version      1.0.2
// @description  PH-lapcsalád linkeket az aktuális oldalra irányítja.
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://logout.hu/bejegyzes/*
// @match        https://logout.hu/cikk/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const currentSite = location.hostname
        .replace(/^www\./, '')
        .replace(/^m\./, '');

    function replace_links(elem) {
        const links = document.evaluate(
            './/a[@href]',
            elem,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        const phSites = ["prohardver","mobilarena","gamepod","itcafe","logout","fototrend"];
        const re = new RegExp(`^(https?:\\/\\/)?(www\\.)?(m\\.)?(${phSites.join('|')})\\.hu(\\/.*)$`, "i");

        for (let i = 0; i < links.snapshotLength; i++) {
            const link = links.snapshotItem(i);
            const match = link.href.match(re);
            if (!match) continue;

            const site = match[4];       // pl. logout
            const originalSite = site + ".hu";
            const path = match[5];       // pl. /tema/xyz

            // 🔒 logout.hu → csak /tema kezdetűeket cseréljük
            if (site === "logout" && !path.startsWith("/tema")) {
                continue;
            }

            // csak ha másik site-ra mutat
            if (originalSite !== currentSite) {
                link.href = "https://" + currentSite + path;
            }
        }
    }

    replace_links(document);
})();
