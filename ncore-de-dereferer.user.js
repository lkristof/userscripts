// ==UserScript==
// @name         nCore – De-dereferer
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  Dereferer linkek eltávolítása
// @icon         https://static.ncore.pro/styles/ncore.ico
//
// @match        https://ncore.pro/torrents.php*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-de-dereferer.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-de-dereferer.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DEREFERERS = [
        'https://dereferer.me/?',
        'https://dereferer.link/?'
    ];

    function cleanHref(href) {
        for (const prefix of DEREFERERS) {
            if (href.startsWith(prefix)) {
                return href.slice(prefix.length);
            }
        }
        return href;
    }

    function processLink(link) {
        const cleaned = cleanHref(link.href);
        if (cleaned !== link.href) {
            link.href = cleaned;
        }
    }

    function processNode(node) {
        if (node.nodeType !== 1) return;

        if (node.matches?.('a[href]')) {
            processLink(node);
        }

        node.querySelectorAll?.('a[href]').forEach(processLink);
    }

    // initial run
    document.querySelectorAll('a[href]').forEach(processLink);

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(processNode);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
