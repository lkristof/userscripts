// ==UserScript==
// @name         PH Fórum színezés (prefers-color-scheme + kulcsszó)
// @namespace    ph
// @version      2.1.0
// @description  Saját és rád válaszoló hozzászólások kiemelése PH light/dark módban, #akció kulcsszó kiemelés, interval nélkül
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://itcafe.hu/tema/*
// @match        https://gamepod.hu/tema/*
// @match        https://logout.hu/tema/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const FELHASZNALO = "lkristóf";

    const COLORS = {
        light: {
            SAJAT:  "#C7D7E0",
            VALASZ: "#CFE0C3",
            AKCIO: "#FFC0C0",
        },
        dark: {
            SAJAT:  "#2F4A57",
            VALASZ: "#344A3A",
            AKCIO: "#8B0000",
        }
    };

    const AKCIO_KEYWORDS = ["#akció", "#akcio"];

    const lower = s => (s || "").toString().trim().toLowerCase();

    function detectDark() {
        const darkLink = document.querySelector('link[href*="dark_base"]');
        return darkLink && (darkLink.media.includes('dark') || darkLink.media === "all");
    }

    function recolorAll(isDark) {
        const { SAJAT, VALASZ, AKCIO } = isDark ? COLORS.dark : COLORS.light;

        document.querySelectorAll(".msg").forEach(msg => {
            const body = msg.querySelector(".msg-body");
            if (!body) return;
            const text = body.textContent.toLowerCase();
            const author =
                  msg.querySelector(".msg-head-author .user-title a")?.textContent || "";
            const reply =
                  msg.querySelector(".msg-head-replied .user-title a")?.textContent || "";

            if (AKCIO_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))) {
                body.style.setProperty("background-color", AKCIO, "important");
            } else if (lower(author) === lower(FELHASZNALO)) {
                body.style.setProperty("background-color", SAJAT, "important");
            } else if (lower(reply) === lower(FELHASZNALO)) {
                body.style.setProperty("background-color", VALASZ, "important");
            } else {
                body.style.removeProperty("background-color");
            }
        });
    }

    function init() {
        recolorAll(detectDark());

        const darkLinks = document.querySelectorAll('link[href*="dark_"]');
        const observer = new MutationObserver(() => {
            recolorAll(detectDark());
        });

        darkLinks.forEach(link => {
            observer.observe(link, { attributes: true, attributeFilter: ['media'] });
        });
    }

    function waitForDarkLinkAndInit() {
        const darkLink = document.querySelector('link[href*="dark_base"]');
        if (darkLink) {
            init();
        } else {
            const observer = new MutationObserver(() => {
                if (document.querySelector('link[href*="dark_base"]')) {
                    observer.disconnect();
                    init();
                }
            });
            observer.observe(document.head, { childList: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", waitForDarkLinkAndInit, { once: true });
    } else {
        waitForDarkLinkAndInit();
    }
})();
