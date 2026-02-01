// ==UserScript==
// @name         Prohardver – fórum színezés
// @namespace    ph
// @version      4.0.3
// @description  Saját / rád válaszoló / #akció + avatar fókusz + hozzászólás-lánc kiemelés, világos/sötét módban
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
    let activeChainIds = new Set();

    const COLORS = {
        light: {
            SAJAT: "#C7D7E0",
            VALASZ: "#CFE0C3",
            AKCIO: "#FFC0C0",

            FOCUS_AUTHOR: "#FFA966",
            FOCUS_REPLY:  "#F6CEAF",

            CHAIN_BG: "#FFF6C8",
            CHAIN_BORDER: "#FF9800"
        },
        dark: {
            SAJAT: "#2F4A57",
            VALASZ: "#344A3A",
            AKCIO: "#8B0000",

            FOCUS_AUTHOR: "#5B327A",
            FOCUS_REPLY:  "#3A1F4F",

            CHAIN_BG: "#4A4015",
            CHAIN_BORDER: "#FFB300"
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
     * SEGÉDEK
     **********************/
    function getAuthor(msg) {
        return msg.querySelector(".msg-head-author .user-title a")?.textContent?.trim() || "";
    }

    function getRepliedTo(msg) {
        return msg.querySelector(".msg-head-replied .user-title a")?.textContent?.trim() || "";
    }

    function getAllLis() {
        return Array.from(document.querySelectorAll("li.media[data-id]"));
    }

    /**********************
     * LÁNC LOGIKA
     **********************/
    function buildChain(startLi) {
        activeChainIds.clear();

        const all = getAllLis();
        const byId = Object.fromEntries(all.map(li => [li.dataset.id, li]));

        const startId = startLi.dataset.id;
        activeChainIds.add(startId);

        // ⬆ felfelé
        let current = startLi;
        while (current.dataset.rplid) {
            const prev = byId[current.dataset.rplid];
            if (!prev) break;
            activeChainIds.add(prev.dataset.id);
            current = prev;
        }

        // ⬇ lefelé
        function findReplies(parentId) {
            all.forEach(li => {
                if (li.dataset.rplid === parentId && !activeChainIds.has(li.dataset.id)) {
                    activeChainIds.add(li.dataset.id);
                    findReplies(li.dataset.id);
                }
            });
        }

        findReplies(startId);
    }

    /**********************
     * FŐ SZÍNEZÉS
     **********************/
    function recolorAll() {
        const c = getThemeColors();

        document.querySelectorAll(".msg").forEach(msg => {
            const body = msg.querySelector(".msg-body");
            if (!body) return;

            body.style.backgroundColor = "";
            body.style.boxShadow = "";

            const text = body.textContent.toLowerCase();
            const author = getAuthor(msg);
            const replied = getRepliedTo(msg);

            const li = msg.closest("li.media[data-id]");
            const msgId = li?.dataset?.id;

            // 1️⃣ #akció
            if (AKCIO_KEYWORDS.some(k => text.includes(k))) {
                body.style.setProperty("background-color", c.AKCIO, "important");
                return;
            }

            // 2️⃣ Avatar fókusz
            if (selectedUser) {
                if (author === selectedUser) {
                    body.style.backgroundColor = c.FOCUS_AUTHOR;
                    return;
                }
                if (replied === selectedUser) {
                    body.style.backgroundColor = c.FOCUS_REPLY;
                    return;
                }
            }

            // 3️⃣ Lánc kiemelés (OLDALSÁV!)
            if (msgId && activeChainIds.has(msgId)) {
                body.style.backgroundColor = c.CHAIN_BG;
                body.style.boxShadow = `inset 5px 0 0 0 ${c.CHAIN_BORDER}`;
                return;
            }

            // 4️⃣ Saját / válasz
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

        // HA AVATART KATTINTASZ: Töröljük a láncot
        activeChainIds.clear();

        selectedUser = (selectedUser === author) ? null : author;
        recolorAll();
    }

    function attachAvatarHandlers() {
        const selectors = [
            ".msg-user img",           // Desktop/Normál avatar a body-ban
            ".user-face-circle img"    // Mobilos/Fejléc avatar a kör alakú wrapper-ben
        ];

        document.querySelectorAll(selectors.join(", ")).forEach(img => {
            img.style.cursor = "pointer";
            img.removeEventListener("click", onAvatarClick);
            img.addEventListener("click", onAvatarClick);
        });
    }

    /**********************
     * LÁNC LINK
     **********************/
    function attachChainLinks() {
        document.querySelectorAll(".msg-head-options").forEach(opts => {
            if (opts.querySelector(".chain-link")) return;

            const wrapper = document.createElement("span");
            wrapper.className = "chain-link";

            wrapper.style.cursor = "pointer";
            wrapper.style.marginLeft = "8px";
            wrapper.style.display = "inline-flex";
            wrapper.style.alignItems = "center";

            wrapper.innerHTML = '<span class="fas fa-link fa-fw"></span>&nbsp;Lánc';

            wrapper.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();

                const li = opts.closest("li.media[data-id]");
                if (!li) return;

                // HA LÁNCRA KATTINTASZ: Töröljük a kijelölt felhasználót
                selectedUser = null;

                if (activeChainIds.has(li.dataset.id)) {
                    activeChainIds.clear();
                } else {
                    buildChain(li);
                }

                recolorAll();
            });

            opts.prepend(wrapper);
        });
    }

    /**********************
     * INIT
     **********************/
    function init() {
        attachAvatarHandlers();
        attachChainLinks();
        recolorAll();
    }

    const observer = new MutationObserver(init);
    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

    window.matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", recolorAll);

})();
