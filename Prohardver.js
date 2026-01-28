// ==UserScript==
// @name         PH Fórum színezés (dark/light link observer)
// @namespace    ph
// @version      1.1.0
// @description  Saját és rád válaszoló hozzászólások kiemelése PH light/dark módban
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
        },
        dark: {
            SAJAT:  "#2F4A57",
            VALASZ: "#344A3A",
        }
    };

    const lower = s => (s || "").toString().trim().toLowerCase();

    function colorMsgBody(msg, color) {
        const body = msg.querySelector(".msg-body");
        if (body) {
            body.style.setProperty("background-color", color, "important");
        }
    }

    function recolorAll(isDark) {
        const { SAJAT, VALASZ } = isDark ? COLORS.dark : COLORS.light;

        document.querySelectorAll(".msg").forEach(msg => {
            const author =
                  msg.querySelector(".msg-head-author .user-title a")?.textContent || "";
            const reply =
                  msg.querySelector(".msg-head-replied .user-title a")?.textContent || "";

            if (lower(author) === lower(FELHASZNALO)) {
                colorMsgBody(msg, SAJAT);
            } else if (lower(reply) === lower(FELHASZNALO)) {
                colorMsgBody(msg, VALASZ);
            }
        });
    }

    // ---------------------------------------------------
    // Téma felismerése a link media attribútum alapján
    // ---------------------------------------------------

    function detectDark() {
        const darkLink = document.querySelector('link[href*="dark_base"]');
        return darkLink && (darkLink.media.includes('dark') || darkLink.media === "all");
    }

    function init() {
        // Első színezés
        recolorAll(detectDark());

        // Observer minden dark_ linkre
        const darkLinks = document.querySelectorAll('link[href*="dark_"]');
        const observer = new MutationObserver(() => {
            recolorAll(detectDark());
        });

        darkLinks.forEach(link => {
            observer.observe(link, { attributes: true, attributeFilter: ['media'] });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
