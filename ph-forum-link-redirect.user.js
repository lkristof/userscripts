// ==UserScript==
// @name         Prohardver Fórum – Link átirányító
// @namespace    ph
// @version      1.1.1
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

    const phSites = ["prohardver", "mobilarena", "gamepod", "itcafe", "logout", "fototrend"];
    const forbiddenPaths = [
        "/nyeremenyjatek",
        "/cikk",
        "/hir"
    ];

    const re = new RegExp(
        `^(https?:\\/\\/)?(www\\.)?(m\\.)?(${phSites.join('|')})\\.hu(\\/.*)$`,
        "i"
    );

    function shouldReplace(site, path) {
        // logout.hu → csak fórum témák
        if (site === "logout" && !path.startsWith("/tema") && !path.startsWith("/tag")) {
            return false;
        }

        // tiltott tartalomtípusok
        if (forbiddenPaths.some(p => path.startsWith(p))) {
            return false;
        }

        // ha nincs a / után semmi, ne cseréljük
        return !(path === "/" || path === "");
    }

    function replaceLinks(root) {
        const links = document.evaluate(
            './/a[@href]',
            root,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < links.snapshotLength; i++) {
            const link = links.snapshotItem(i);
            const match = link.href.match(re);
            if (!match) continue;

            const site = match[4];        // pl. logout
            const path = match[5];        // pl. /tema/xyz
            const originalSite = site + ".hu";

            if (!shouldReplace(site, path)) continue;
            if (originalSite === currentSite) continue;

            link.href = "https://" + currentSite + path;
        }
    }

    replaceLinks(document);
})();

