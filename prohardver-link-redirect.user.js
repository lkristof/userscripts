// ==UserScript==
// @name         Prohardver - link átirányító
// @namespace    ph
// @version      1.0.0
// @description  A PH-lapcsalád fórumhivatkozásait a jelenlegi oldalra irányítja át
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://logout.hu/bejegyzes/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Aktuális site meghatározása (pl. mobilarena.hu)
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
        const re = new RegExp(`(https?:\/\/)?(www\\.)?(m\\.)?(${phSites.join('|')})\\.hu(\/.+)`, "i");


        // Kizárt prefixek
        const excludedPrefixes = [
            "https://logout.hu/blog/",
            "https://logout.hu/bejegyzes/"
        ];

        for (let i = 0; i < links.snapshotLength; i++) {
            const link = links.snapshotItem(i);

            // Ha a link bármelyik kizárt prefixszel kezdődik → skip
            if (excludedPrefixes.some(prefix => link.href.startsWith(prefix))) {
                continue;
            }

            const match = link.href.match(re);

            if (match) {
                const originalSite = match[4] + ".hu";
                const path = match[5];

                // csak ha másik site-ra mutat
                if (originalSite !== currentSite) {
                    link.href = "https://" + currentSite + path;
                }
            }
        }
    }

    replace_links(document);
})();
