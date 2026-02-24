// ==UserScript==
// @name         Prohardver Fórum – Link átirányító
// @namespace    https://github.com/lkristof/userscripts
// @version      2.0.1
// @description  PH! lapcsalád linkeket az aktuális oldalra irányítja.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://logout.hu/bejegyzes/*
// @match        https://logout.hu/cikk/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-link-redirect.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-link-redirect.user.js
//
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // Konfiguráció
    const phDomains = ["prohardver.hu", "mobilarena.hu", "gamepod.hu", "itcafe.hu", "logout.hu", "fototrend.hu"];
    const forbiddenPaths = ["/fooldal", "/nyeremenyjatek", "/cikk", "/hir", "/teszt"];

    // Segédfüggvény: Eldönti, hogy a linket cserélni kell-e
    function shouldRedirect(urlObj) {
        // 1. Ha nem a PH! családból való, ne bántsuk
        const isPhSite = phDomains.some(d =>
            urlObj.hostname === d || urlObj.hostname.endsWith("." + d)
        );

        if (!isPhSite) return false;

        // 2. Ha már eleve a jó domainen vagyunk, ne bántsuk
        if (urlObj.hostname === location.hostname) return false;

        // 3. Logout specifikus kivétel (csak a fórum témákat irányítjuk át, a cikkeket nem)
        if ((urlObj.hostname === "logout.hu" || urlObj.hostname.endsWith(".logout.hu")) &&
            !urlObj.pathname.startsWith("/tema") &&
            !urlObj.pathname.startsWith("/tag")) {
            return false;
        }

        // 4. Tiltott útvonalak (pl. cikkek, amik nem léteznek a másik domainen)
        if (forbiddenPaths.some(p => urlObj.pathname.startsWith(p))) {
            return false;
        }

        // 5. Ha a főoldalra mutat (nincs útvonal), ne cseréljük
        if (urlObj.pathname === "/" || urlObj.pathname === "") {
            return false;
        }

        return true;
    }

    // A tényleges csere logikája
    function processLinks(rootNode) {
        const links = rootNode.querySelectorAll('a[href^="http"]');

        links.forEach(link => {
            try {
                const url = new URL(link.href);

                if (shouldRedirect(url)) {
                    url.hostname = location.hostname;
                    link.href = url.href;

                    // Opcionális: jelöljük meg, hogy lássuk, mit cseréltünk (debug)
                    // link.style.borderBottom = "2px dotted green";
                }
            } catch (e) {
                // Érvénytelen URL esetén ne omoljon össze
            }
        });
    }

    // 1. Futás az oldal betöltésekor
    processLinks(document.body);

    // 2. MutationObserver a dinamikusan betöltődő kommentekhez (AJAX)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    // Csak elem típusú node-okkal foglalkozunk (pl. div, span), text node-okkal nem
                    if (node.nodeType === 1) {
                        processLinks(node);
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
