// ==UserScript==
// @name         Prohardver – fórum színezés
// @namespace    ph
// @version      3.0.0
// @description  Saját / rád válaszoló / #akció kiemelés + avatar kattintásos user fókusz, light/dark módban
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://itcafe.hu/tema/*
// @match        https://gamepod.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    /**********************
     * BEÁLLÍTÁSOK
     **********************/
    const FELHASZNALO = "lkristóf";
    const AKCIO_KEYWORDS = ["#akció", "#akcio"];

    let selectedUser = null;

    const COLORS = {
        light: {
            SAJAT: "#C7D7E0",
            VALASZ: "#CFE0C3",
            AKCIO: "#FFC0C0",

            FOCUS_AUTHOR: "#FFF3A0",
            FOCUS_REPLY:  "#FFF9D6",
            FOCUS_BORDER: "#FF9800"
        },
        dark: {
            SAJAT: "#2F4A57",
            VALASZ: "#344A3A",
            AKCIO: "#8B0000",

            FOCUS_AUTHOR: "#4A4215",
            FOCUS_REPLY:  "#3A3312",
            FOCUS_BORDER: "#FFB300"
        }
    };

    const lower = s => (s || "").toString().trim().toLowerCase();

    /**********************
     * TÉMA FELISMERÉS
     **********************/
    function detectDark() {
        const darkLink = document.querySelector('link[href*="dark_base"]');
        if (darkLink) {
            const media = darkLink.getAttribute("media");
            if (media === "all") return true;
            if (media === "not all") return false;
            if (media?.includes("prefers-color-scheme")) {
                return window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        }

        const btn = document.querySelector(".theme-button span");
        if (btn) return btn.classList.contains("fa-sun-bright");

        return false;
    }

    function getThemeColors() {
        return detectDark() ? COLORS.dark : COLORS.light;
    }

    /**********************
     * SEGÉD: USER INFÓ
     **********************/
    function getAuthor(msg) {
        return msg.querySelector(".msg-head-author .user-title a")?.textContent?.trim() || "";
    }

    function getRepliedTo(msg) {
        return msg.querySelector(".msg-head-replied .user-title a")?.textContent?.trim() || "";
    }

    /**********************
     * FŐ SZÍNEZŐ LOGIKA
     **********************/
    function recolorAll() {
        const c = getThemeColors();

        document.querySelectorAll(".msg").forEach(msg => {
            const body = msg.querySelector(".msg-body");
            if (!body) return;

            body.style.backgroundColor = "";
            body.style.borderLeft = "";

            const text = body.textContent.toLowerCase();
            const author = getAuthor(msg);
            const replied = getRepliedTo(msg);

            // 1️⃣ #akció – mindig nyer
            if (AKCIO_KEYWORDS.some(k => text.includes(k))) {
                body.style.setProperty("background-color", c.AKCIO, "important");
                return;
            }

            // 2️⃣ Avatar fókusz
            if (selectedUser) {
                if (author === selectedUser) {
                    body.style.backgroundColor = c.FOCUS_AUTHOR;
                    body.style.borderLeft = `6px solid ${c.FOCUS_BORDER}`;
                    return;
                }
                if (replied === selectedUser) {
                    body.style.backgroundColor = c.FOCUS_REPLY;
                    body.style.borderLeft = `4px solid ${c.FOCUS_BORDER}`;
                    return;
                }
            }

            // 3️⃣ Saját / válasz
            if (lower(author) === lower(FELHASZNALO)) {
                body.style.backgroundColor = c.SAJAT;
            } else if (lower(replied) === lower(FELHASZNALO)) {
                body.style.backgroundColor = c.VALASZ;
            }
        });
    }

    /**********************
     * AVATAR KATTINTÁS
     **********************/
    function onAvatarClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const msg = e.target.closest(".msg");
        if (!msg) return;

        const author = getAuthor(msg);
        if (!author) return;

        selectedUser = (selectedUser === author) ? null : author;
        recolorAll();
    }

    function attachAvatarHandlers() {
        document.querySelectorAll(".msg-user img").forEach(img => {
            img.style.cursor = "pointer";
            img.removeEventListener("click", onAvatarClick);
            img.addEventListener("click", onAvatarClick);
        });
    }

    /**********************
     * INIT + OBSERVEREK
     **********************/
    function init() {
        attachAvatarHandlers();
        recolorAll();
    }

    const observer = new MutationObserver(() => {
        attachAvatarHandlers();
        recolorAll();
    });

    function waitForThemeAndInit() {
        if (document.querySelector('link[href*="dark_base"]')) {
            init();
        } else {
            const o = new MutationObserver(() => {
                if (document.querySelector('link[href*="dark_base"]')) {
                    o.disconnect();
                    init();
                }
            });
            o.observe(document.head, { childList: true });
        }
    }

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", waitForThemeAndInit, { once: true });
    } else {
        waitForThemeAndInit();
    }

    window.matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", recolorAll);

})();
