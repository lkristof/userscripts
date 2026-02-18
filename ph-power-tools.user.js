// ==UserScript==
// @name         Prohardver Fórum – Power Tools
// @namespace    https://github.com/lkristof/userscripts
// @version      1.4.0
// @description  PH Fórum extra funkciók, fejlécbe épített beállításokkal
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/*
// @match        https://mobilarena.hu/*
// @match        https://logout.hu/*
// @match        https://fototrend.hu/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /************ CONFIG ************/

    const STORAGE_KEY = 'ph_forum_settings';

    const defaultSettings = {
        colorize: true,
        linkRedirect: true,
        msgAnchorHighlight: true,
        offHider: true,
        wideView: true,
        threadView: true,
        keyboardNavigation: true,
        hideUsers: true,
        markSeenPosts: false
    };

    const settingGroups = {
        appearance: {
            label: 'Megjelenés',
            keys: ['colorize', 'markSeenPosts', 'wideView', 'threadView'],
            defaultOpen: true
        },
        filtering: {
            label: 'Szűrés',
            keys: ['offHider', 'hideUsers'],
        },
        interaction: {
            label: 'Interakció',
            keys: ['linkRedirect', 'msgAnchorHighlight', 'keyboardNavigation']
        }
    };

    const savedSettings = {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    };

    let draftSettings = {...savedSettings};

    function isTemaPage() {
        return /^\/tema\//.test(location.pathname);
    }

    /************ STYLE ************/

    const style = document.createElement('style');
    style.textContent = `
        .ph-acc-header {
            font-weight: 600;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s ease;
        }
        .ph-acc-header:hover {
            background: color-mix(in srgb, currentColor 8%, transparent);
        }
        .ph-acc-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.5s ease;
        }
        .ph-acc-body .dropdown-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
            padding: 4px 10px;
        }
        .ph-power-menu {
            min-width: 260px;
            max-height: 70vh;
            overflow-y: auto;
        }
        @media only screen and (max-width: 991.98px) {
            .ph-power-btn + .dropdown-menu {
                display: none !important;
                position: absolute !important;
                left: 0 !important;
            }
            .ph-power-btn + .dropdown-menu.show {
                display: block !important;
            }
            .ph-acc-body .dropdown-item {
                padding: 10px 10px;
            }
        }
    `;

    document.head.appendChild(style);

    /************ HEADER INJECT ************/

    waitForHeader(insertSettingsDropdown);

    function waitForHeader(cb) {
        const el = document.querySelector('#header-sticky .navbar-buttons');
        if (el) return cb(el);

        const obs = new MutationObserver(() => {
            const el = document.querySelector('#header-sticky .navbar-buttons');
            if (el) {
                obs.disconnect();
                cb(el);
            }
        });
        obs.observe(document.body, {childList: true, subtree: true});
    }

    function insertSettingsDropdown(container) {
        const li = document.createElement('li');
        li.className = 'dropdown';

        li.innerHTML = `
            <a href="javascript:;" class="btn dropdown-toggle ph-power-btn"
                data-toggle="dropdown"
                title="PH Power Tools beállítások">
                <span class="fas fa-sliders-h"></span>
            </a>
            <div class="dropdown-menu dropdown-menu-right p-2 ph-power-menu">
                <h6 class="dropdown-header">PH Power Tools</h6>
                <div class="ph-accordion">
                    ${Object.entries(settingGroups).map(([groupKey, group], index) => `
                        <div class="ph-acc-group">
                            <div class="ph-acc-header" data-group="${groupKey}">
                                ${group.label}
                                <i class="ph-acc-arrow fas ${group.defaultOpen ? 'fa-caret-down' : 'fa-caret-right'} fa-fw"></i>
                            </div>
                            <div class="ph-acc-body ${group.defaultOpen ? 'open' : ''}">
                                ${group.keys.map(key => `
                                    <a href="javascript:;" 
                                        class="btn btn-forum dropdown-item ${draftSettings[key] ? 'btn-primary' : ''}" 
                                        data-key="${key}">
                                        <span>${prettyName(key)}</span>
                                        <span class="ph-toggle-state">${draftSettings[key] ? '<span class="fas fa-toggle-on"></span>' : '<span class="fas fa-toggle-off"></span>'}</span>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="dropdown-divider"></div>
                <button class="btn btn-sm btn-primary btn-block ph-apply-btn" disabled>
                    Alkalmaz
                </button>
            </div>
        `;

        container.prepend(li);

        const toggleBtn = li.querySelector('.ph-power-btn');
        const applyBtn = li.querySelector('.ph-apply-btn');

        toggleBtn.addEventListener('click', () => {
            setTimeout(() => {
                toggleBtn.blur();

                li.querySelectorAll('.ph-acc-body.open').forEach(body => {
                    body.style.maxHeight = body.scrollHeight + "px";
                });
            }, 50);
        });

        // Dropdown item click
        li.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', e => {
                e.stopPropagation();

                const key = item.dataset.key;
                draftSettings[key] = !draftSettings[key];

                item.classList.toggle('btn-primary', draftSettings[key]);
                item.querySelector('.ph-toggle-state').innerHTML = draftSettings[key] ? '<span class="fas fa-toggle-on"></span>' : '<span class="fas fa-toggle-off"></span>';

                applyBtn.disabled =
                    JSON.stringify(draftSettings) === JSON.stringify(savedSettings);
            });
        });

        const menu = li.querySelector('.dropdown-menu');
        menu.addEventListener('click', e => e.stopPropagation());

        applyBtn.addEventListener('click', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draftSettings));
            li.querySelector('.dropdown-toggle').click();
            location.reload();
        });

        // Accordion toggle (animated)
        li.querySelectorAll('.ph-acc-header').forEach(header => {
            header.addEventListener('click', (e) => {

                e.stopPropagation(); // fontos a dropdown miatt

                const allBodies = li.querySelectorAll('.ph-acc-body');
                const allArrows = li.querySelectorAll('.ph-acc-arrow');

                const body = header.nextElementSibling;
                const arrow = header.querySelector('.ph-acc-arrow');

                const isOpen = body.classList.contains('open');

                // close all
                allBodies.forEach(b => {
                    b.style.maxHeight = null;
                    b.classList.remove('open');
                });

                allArrows.forEach(a => {
                    a.classList.remove('fa-caret-down');
                    a.classList.add('fa-caret-right');
                });

                // open clicked if it wasn't open
                if (!isOpen) {
                    body.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + "px";
                    arrow.classList.remove('fa-caret-right');
                    arrow.classList.add('fa-caret-down');
                }
            });
        });
    }

    function prettyName(key) {
        return {
            colorize: 'Hozzászólások színezése',
            linkRedirect: 'Link átirányítás',
            msgAnchorHighlight: 'Üzenet kiemelés',
            offHider: 'OFF hozzászólások elrejtése',
            wideView: 'Széles nézet',
            threadView: 'Thread nézet',
            keyboardNavigation: 'Billentyűzetes navigáció',
            hideUsers: 'Felhasználók elrejtése',
            markSeenPosts: 'Olvasottság jelölése'
        }[key] || key;
    }

    /************ MODULE DISPATCH ************/

    if (isTemaPage()) {
        if (savedSettings.colorize) colorize();
        if (savedSettings.markSeenPosts) markSeenPosts();
        if (savedSettings.linkRedirect) linkRedirect();
        if (savedSettings.msgAnchorHighlight) msgAnchorHighlight();
        if (savedSettings.offHider) offHider();
        if (savedSettings.wideView) wideView();
        if (savedSettings.threadView) threadView();
        if (savedSettings.keyboardNavigation) keyboardNavigation();
        if (savedSettings.hideUsers) hideUsers();
    }

    /************ MODULE STUBS ************/

    function colorize() {
        /**********************
         * BEÁLLÍTÁSOK
         **********************/
        const FELHASZNALO = (() => {
            const el = document.querySelector('.dropdown-menu h6 a[href^="/tag/"]');
            return el ? el.textContent.trim() : "__NINCS_BEJELENTKEZVE__";
        })();
        const AKCIO_KEYWORDS = ["#akció", "#akcio"];

        let selectedUser = null;
        let activeChainIds = new Set();

        const COLORS = {
            light: {
                SAJAT: "#C7D7E0",
                VALASZ: "#CFE0C3",
                AKCIO: "#FFC0C0",

                FOCUS_AUTHOR: "#FFA966",
                FOCUS_REPLY: "#F6CEAF",

                CHAIN_BG: "#FFF6C8",
                CHAIN_BORDER: "#FF9800"
            },
            dark: {
                SAJAT: "#2F4A57",
                VALASZ: "#344A3A",
                AKCIO: "#8B0000",

                FOCUS_AUTHOR: "#5B327A",
                FOCUS_REPLY: "#3A1F4F",

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
                    body.style.setProperty("background-color", c.AKCIO);
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
        observer.observe(document.body, {childList: true, subtree: true});

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, {once: true});
        } else {
            init();
        }

        window.matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", recolorAll);
    }

    function linkRedirect() {
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
    }

    function msgAnchorHighlight() {
        /**********************
         * CSS
         **********************/
        const style = document.createElement("style");
        style.textContent = `
            body[data-theme="light"] .hash-highlight {
                background-color: #FFF6C8 !important;
            }
            body[data-theme="dark"] .hash-highlight {
                background-color: #4A4015 !important;
            }
            html {
                scroll-behavior: smooth;
            }
        `;
        document.head.appendChild(style);

        /**********************
         * TÉMA FELISMERÉS
         **********************/
        function updateBodyTheme() {
            const darkLink = document.querySelector('link[href*="dark_base"]');
            let dark = false;

            if (darkLink) {
                const media = darkLink.getAttribute("media");
                if (media === "all") dark = true;
                else if (media === "not all") dark = false;
                else if (media?.includes("prefers-color-scheme")) {
                    dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                }
            }

            const btn = document.querySelector(".theme-button span");
            if (btn && btn.classList.contains("fa-sun-bright")) dark = true;

            document.body.setAttribute("data-theme", dark ? "dark" : "light");
        }

        /**********************
         * HASH KIEMELÉS
         **********************/
        let lastHashMsgId = null;
        let lastHash = null;

        function getPosts() {
            return [...document.querySelectorAll('li.media[data-id]')];
        }

        function findClosestPost(posts, targetId) {
            let closest = null;
            let minDiff = Infinity;

            posts.forEach(li => {
                const id = parseInt(li.dataset.id, 10);
                if (Number.isNaN(id)) return;

                const diff = Math.abs(id - targetId);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = li;
                }
            });

            return closest;
        }

        function highlightHashMsg() {
            updateBodyTheme();

            const hash = window.location.hash;
            let msgId = null;

            if (hash && hash.startsWith("#msg")) {
                msgId = Number(hash.replace("#msg", ""));
                if (!Number.isNaN(msgId)) {
                    lastHashMsgId = msgId;
                }
            } else if (lastHashMsgId !== null) {
                msgId = lastHashMsgId;
            } else {
                return;
            }

            document.querySelectorAll(".msg-body.hash-highlight")
                .forEach(b => b.classList.remove("hash-highlight"));

            let body = document.querySelector(
                `li.media[data-id="${msgId}"] .msg-body`
            );

            if (!body) {
                body = findClosestPost(getPosts(), msgId)?.querySelector('.msg-body');
            }

            if (!body) return;
            body.classList.add("hash-highlight");
        }

        function onHashChange() {
            if (window.location.hash === lastHash) return;
            lastHash = window.location.hash;
            highlightHashMsg();
        }

        /**********************
         * DUPLA KATT: kijelölés
         **********************/
        document.addEventListener("dblclick", (e) => {
            const header = e.target.closest(".msg-header");
            if (!header) return;

            const li = header.closest("li.media[data-id]");
            if (!li) return;

            const id = li.dataset.id;
            if (!id) return;

            e.preventDefault();
            location.hash = "#msg" + id;
        });

        /**********************
         * INIT
         **********************/
        function init() {
            lastHash = window.location.hash;
            highlightHashMsg();

            if (lastHash) {
                setTimeout(() => {
                    window.location.hash = lastHash;
                }, 0);
            }
        }

        window.addEventListener("hashchange", onHashChange);

        const observer = new MutationObserver(init);
        observer.observe(document.body, { childList: true, subtree: true });

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
            init();
        }
    }

    function offHider() {
        const STORAGE_KEY = "ph_hide_off";
        const STATUS = { ON: 'enabled', OFF: 'disabled' };

        let offHidden = localStorage.getItem(STORAGE_KEY) === STATUS.ON;
        const buttons = [];

        function getOffPosts() {
            return document.querySelectorAll('.msg, .topic, .msg-off');
        }

        function applyVisibility() {
            getOffPosts().forEach(post => {
                if (
                    post.textContent.includes('[OFF]') ||
                    post.classList.contains('msg-off')
                ) {
                    post.style.display = offHidden ? 'none' : '';
                }
            });
        }

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.innerHTML = `<span class="fas fa-ban fa-fw"></span> OFF elrejtése`;

            function updateAppearance() {
                btn.classList.toggle('btn-primary', offHidden);
                btn.title = offHidden
                    ? 'OFF hozzászólások megjelenítése'
                    : 'OFF hozzászólások elrejtése';
            }

            btn.addEventListener('click', () => {
                offHidden = !offHidden;
                localStorage.setItem(
                    STORAGE_KEY,
                    offHidden ? STATUS.ON : STATUS.OFF
                );
                applyVisibility();
                updateAllButtons();
            });

            btn._update = updateAppearance;
            updateAppearance();

            return btn;
        }

        function updateAllButtons() {
            buttons.forEach(btn => btn._update());
        }

        document.querySelectorAll('h4.list-message').forEach(header => {
            const btn = createToggleButton();
            buttons.push(btn);
            header.appendChild(btn);
        });

        applyVisibility();
        updateAllButtons();
    }

    function wideView() {
        const LEFT_PX = 230;
        const RIGHT_PX = 230;
        const GAP_PX = 0;
        const SIDE_MARGIN_RATIO = 0.20;
        const MIN_CENTER_PX = 710;

        const STYLE_ID = 'ph-wide-center-style';
        const ROW_CLASS = 'ph-center-row';
        const STORAGE_KEY = 'ph_wide_view';

        const STATUS = { ON: 'enabled', OFF: 'disabled' };
        const buttons = [];

        function calculateLayout() {
            const viewport = window.innerWidth;
            const usable = viewport * (1 - getSideMarginRatio());
            const center = Math.max(
                MIN_CENTER_PX,
                usable - LEFT_PX - RIGHT_PX - (2 * GAP_PX)
            );

            return {
                total: LEFT_PX + center + RIGHT_PX + (2 * GAP_PX),
                center
            };
        }

        function getSideMarginRatio() {
            const w = window.innerWidth;
            if (w < 1400) return 0.10;
            if (w < 1800) return 0.15;
            return SIDE_MARGIN_RATIO;
        }

        function buildCSS() {
            const { total, center } = calculateLayout();

            return `
                .container, .container-fluid, #container, .site-container {
                    max-width: ${total}px !important;
                    width: ${total}px !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                }
                .${ROW_CLASS} {
                    display: flex !important;
                    flex-wrap: nowrap !important;
                    justify-content: center !important;
                    gap: ${GAP_PX}px !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                }
                #left {
                    width: ${LEFT_PX}px !important;
                    flex: 0 0 ${LEFT_PX}px !important;
                }
                #center {
                    width: ${center}px !important;
                    flex: 0 0 ${center}px !important;
                }
                #right {
                    width: ${RIGHT_PX}px !important;
                    flex: 0 0 ${RIGHT_PX}px !important;
                }
            `;
        }

        function applyLayout() {
            let style = document.getElementById(STYLE_ID);
            if (!style) {
                style = document.createElement('style');
                style.id = STYLE_ID;
                document.documentElement.appendChild(style);
            }
            style.textContent = buildCSS();

            const center = document.querySelector('#center');
            const row = center?.closest('.row');
            if (row) row.classList.add(ROW_CLASS);
        }

        function removeLayout() {
            document.getElementById(STYLE_ID)?.remove();
            const center = document.querySelector('#center');
            const row = center?.closest('.row');
            row?.classList.remove(ROW_CLASS);
        }

        function isActive() {
            return !!document.getElementById(STYLE_ID);
        }

        function saveState(active) {
            localStorage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
        }

        function shouldBeActive() {
            return localStorage.getItem(STORAGE_KEY) === STATUS.ON;
        }

        window.addEventListener('resize', () => {
            if (isActive()) applyLayout();
        });

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.innerHTML = `<span class="fas fa-expand-arrows-alt fa-fw"></span> Széles nézet`;

            function updateUI() {
                btn.title = isActive() ? 'Eredeti szélesség' : 'Szélesebb nézet';
                btn.classList.toggle('btn-primary', isActive());
            }

            btn.addEventListener('click', e => {
                e.preventDefault();
                isActive() ? removeLayout() : applyLayout();
                saveState(isActive());
                updateAllButtons();
            });

            btn._update = updateUI;
            updateUI();
            return btn;
        }

        function updateAllButtons() { buttons.forEach(btn => btn._update()); }

        function init() {
            const headers = document.querySelectorAll('h4.list-message');
            if (!headers.length) return false;

            headers.forEach(header => {
                const btn = createToggleButton();
                buttons.push(btn);
                header.appendChild(btn);
            });

            if (shouldBeActive()) {
                applyLayout();
                updateAllButtons();
            }

            return true;
        }

        if (!init()) {
            const observer = new MutationObserver(() => {
                if (init()) observer.disconnect();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    function threadView() {
        const INDENT       = 10;
        const LINE_COLOR   = "#C1BFB6";
        const LINE_OPACITY = 1;
        const LINE_THICK   = 1;
        const STORAGE_KEY  = 'ph_thread_view';
        const STATUS       = { ON: 'enabled', OFF: 'disabled' };

        let threadContainerHeader = null;
        let threadActive = false;
        const buttons = [];

        const style = document.createElement('style');
        style.textContent = `
            li.media.ph-thread { position: relative; }
        
            .thread-lines {
                position: absolute;
                top: 0;
                bottom: 0;
                pointer-events: none;
                left: calc(-1 * var(--indent));
            }
        
            .thread-line-vert {
                position: absolute;
                top: 0;
                bottom: 0;
                width: ${LINE_THICK}px;
                background: ${LINE_COLOR};
                opacity: ${LINE_OPACITY};
                border-radius: ${LINE_THICK}px;
            }
        
            .thread-line-horiz {
                position: absolute;
                top: 0;
                left: 0;
                width: ${INDENT}px;
                height: 50%;
                border-left: ${LINE_THICK}px solid ${LINE_COLOR};
                border-bottom: ${LINE_THICK}px solid ${LINE_COLOR};
                border-bottom-left-radius: ${INDENT}px;
                opacity: ${LINE_OPACITY};
                box-sizing: border-box;
            }
        `;
        document.head.appendChild(style);

        function saveState(active) {
            localStorage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
        }

        function shouldBeActive() {
            return localStorage.getItem(STORAGE_KEY) === STATUS.ON;
        }

        function renderThreading() {
            if (threadActive) return;
            if (!threadContainerHeader) return;

            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            // Adatgyűjtés
            const allMedia = [...ul.querySelectorAll('li.media')];
            const items = allMedia.filter(li => li.dataset.id);

            if (!items.length) return;

            const postMap = {}, childrenMap = {}, allIds = new Set();
            items.forEach(li => {
                allIds.add(li.dataset.id);
                postMap[li.dataset.id] = li;
            });

            items.forEach(li => {
                const id = li.dataset.id;
                let parent = li.dataset.rplid || null;
                if (parent && !allIds.has(parent)) parent = null;
                if (!childrenMap[parent]) childrenMap[parent] = [];
                childrenMap[parent].push(id);
            });

            // Ürítés és újraépítés
            ul.innerHTML = '';

            // Rekurzív renderelő
            function renderThread(id, depth, ancestorPath = []) {
                const el = postMap[id];
                if (!el) return;

                el.classList.add('ph-thread');
                const currentIndent = depth * INDENT;
                el.style.setProperty('--indent', currentIndent + 'px');
                el.style.marginLeft = currentIndent + 'px';

                if (depth > 0) {
                    let box = el.querySelector('.thread-lines');
                    if (!box) {
                        box = document.createElement('div');
                        box.className = 'thread-lines';
                        el.appendChild(box);
                    }
                    box.innerHTML = '';

                    for (let d = 0; d < depth - 1; d++) {
                        if (ancestorPath[d]) continue;
                        const vert = document.createElement('div');
                        vert.className = 'thread-line-vert';
                        vert.style.left = (d * INDENT) + 'px';
                        box.appendChild(vert);
                    }

                    if (!ancestorPath[depth - 1]) {
                        const vert = document.createElement('div');
                        vert.className = 'thread-line-vert';
                        vert.style.left = ((depth - 1) * INDENT) + 'px';
                        box.appendChild(vert);
                    }

                    // Könyök az aktuális elemhez
                    const elbow = document.createElement('div');
                    elbow.className = 'thread-line-horiz';
                    elbow.style.left = ((depth - 1) * INDENT) + 'px';
                    box.appendChild(elbow);
                }

                ul.appendChild(el);

                const children = childrenMap[id] || [];
                children.forEach((childId, i) => {
                    const isLastChild = (i === children.length - 1);
                    renderThread(childId, depth + 1, [...ancestorPath, isLastChild]);
                });
            }

            // Indítás a gyökér szintű elemekkel
            (childrenMap[null] || []).forEach(id => renderThread(id, 0, []));

            threadActive = true;
            saveState(true);
        }

        let originalOrder = [];

        function initOriginalOrder() {
            if (!threadContainerHeader) return;
            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            originalOrder = [...ul.querySelectorAll('li.media')];
        }

        function restoreOriginalOrder() {
            if (!threadContainerHeader) return;

            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            ul.querySelectorAll('li.media.ph-thread').forEach(li => {
                li.classList.remove('ph-thread');
                li.style.marginLeft = '';
                const box = li.querySelector('.thread-lines');
                if (box) box.remove();
            });

            ul.innerHTML = '';
            originalOrder.forEach(li => ul.appendChild(li));

            threadActive = false;
            saveState(false);
        }

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.innerHTML = `<span class="fas fa-project-diagram fa-fw"></span> Thread nézet`;

            function updateButtonUI() {
                btn.classList.toggle('btn-primary', threadActive);
                btn.title = threadActive ? 'Thread nézet kikapcsolása' : 'Thread nézet bekapcsolása';
            }

            btn.addEventListener('click', e => {
                e.preventDefault();
                if (threadActive) restoreOriginalOrder();
                else renderThreading();
                updateAllButtons();
            });

            btn._update = updateButtonUI;
            updateButtonUI();

            return btn;
        }

        function updateAllButtons() {
            buttons.forEach(btn => btn._update());
        }

        function init() {
            const headers = document.querySelectorAll('h4.list-message');
            if (!headers.length || buttons.length > 0) return false;

            threadContainerHeader = headers[0];
            initOriginalOrder();

            headers.forEach(header => {
                const btn = createToggleButton();
                buttons.push(btn);
                header.appendChild(btn);
            });

            if (shouldBeActive()) {
                renderThreading();
                updateAllButtons();
            }

            return true;
        }

        if (!init()) {
            const observer = new MutationObserver(() => {
                if (init()) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    function keyboardNavigation() {
        function getPosts() {
            return [...document.querySelectorAll('li.media[data-id]')];
        }

        function getCurrentIndex(posts) {
            const hash = location.hash.replace('#msg', '');
            return posts.findIndex(li => li.dataset.id === hash);
        }

        function jumpToIndex(posts, index) {
            if (index < 0 || index >= posts.length) return;
            location.hash = '#msg' + posts[index].dataset.id;
        }

        function getMsgIdFromHash() {
            const m = location.hash.match(/^#msg(\d+)$/);
            return m ? parseInt(m[1], 10) : null;
        }

        function setMsgId(id) {
            if (id < 0) return;
            location.hash = '#msg' + id;
        }

        function findClosestPost(posts, targetId) {
            let closest = null;
            let minDiff = Infinity;

            posts.forEach(li => {
                const id = parseInt(li.dataset.id, 10);
                if (Number.isNaN(id)) return;

                const diff = Math.abs(id - targetId);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = li;
                }
            });

            return closest;
        }

        function getSortedPostIds(posts) {
            return posts
                .map(p => parseInt(p.dataset.id, 10))
                .filter(id => !Number.isNaN(id))
                .sort((a, b) => a - b);
        }

        function getCurrentIdIndex(sortedIds) {
            const currentId = getMsgIdFromHash();
            if (currentId === null) return -1;
            const idx = sortedIds.indexOf(currentId);
            return idx;
        }

        function getSafeCurrentIndex(posts) {
            let index = getCurrentIndex(posts);
            if (index !== -1) return index;

            const hashId = getMsgIdFromHash();
            if (hashId === null) return 0;

            const closest = findClosestPost(posts, hashId);
            return closest ? posts.indexOf(closest) : 0;
        }

        document.addEventListener('keydown', (e) => {
            // gallery / input védelem
            if (document.querySelector('.layer-gallery')) return;

            const active = document.activeElement;
            if (
                active &&
                (active.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))
            ) return;

            const posts = getPosts();
            if (!posts.length) return;

            let currentIndex = getSafeCurrentIndex(posts);

            // SHIFT + ↑ / ↓ : következő létező msgId (ID sorrendben)
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();

                const sortedIds = getSortedPostIds(posts);
                if (!sortedIds.length) return;

                let idx = getCurrentIdIndex(sortedIds);

                // ha törölt msg-en állunk → legközelebbi ID
                if (idx === -1) {
                    const hashId = getMsgIdFromHash();
                    if (hashId === null) return;

                    let closestDiff = Infinity;
                    sortedIds.forEach((id, i) => {
                        const diff = Math.abs(id - hashId);
                        if (diff < closestDiff) {
                            closestDiff = diff;
                            idx = i;
                        }
                    });
                }

                const delta = e.key === 'ArrowUp' ? -1 : 1;
                const newIndex = idx + delta;

                if (newIndex < 0 || newIndex >= sortedIds.length) return;

                setMsgId(sortedIds[newIndex]);
                return;
            }

            // alap navigáció
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    jumpToIndex(posts, Math.max(0, currentIndex - 1));
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    jumpToIndex(posts, Math.min(posts.length - 1, currentIndex + 1));
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    jumpToIndex(posts, 0);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    jumpToIndex(posts, posts.length - 1);
                    break;
            }
        });
    }

    function hideUsers() {
        const STORAGE_KEY = "ph_hidden_users";
        let hiddenUsers;
        try {
            hiddenUsers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            hiddenUsers = [];
        }

        // ===== TÉMA FELISMERÉS =====
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

        function getHiddenBarColors() {
            const dark = detectDark();
            if (dark) {
                return { base: "rgb(20 19 15)",hover: "rgba(255,255,255,0.15)", color: "white" };
            } else {
                return { base: "rgba(0,0,0,0.8)", hover: "rgba(0,0,0,0.7)", color: "white" };
            }
        }

        function applyHiddenBarStyle() {
            const { base, hover, color } = getHiddenBarColors();
            let styleEl = document.querySelector("#ph-hidden-bar-style");
            if (!styleEl) {
                styleEl = document.createElement("style");
                styleEl.id = "ph-hidden-bar-style";
                document.head.appendChild(styleEl);
            }

            styleEl.textContent = `
                .hidden-bar {
                    background: ${base};
                    color: ${color};
                    font-size: 13px;
                    padding: 4px 8px;
                    cursor: pointer;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    text-align: center;
                    transition: background 0.2s ease;
                }
                .hidden-bar:hover {
                    background: ${hover};
                }
                .ph-collapsible { overflow: hidden; transition: max-height 0.4s ease; }
            `;
        }

        applyHiddenBarStyle();
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHiddenBarStyle);

        // ===== SEGÉDFÜGGVÉNYEK =====
        function getAuthor(msg) {
            return msg.querySelector(".msg-head-author .user-title a")?.textContent?.trim() || "";
        }

        function getPosts() {
            return Array.from(document.querySelectorAll("li.media[data-id]"));
        }

        function updateHiddenComments() {
            const { base, hover, color } = getHiddenBarColors();

            getPosts().forEach(li => {
                const msg = li.querySelector(".msg");
                if (!msg) return;
                const author = getAuthor(msg);
                const isHidden = hiddenUsers.includes(author);
                let bar = li.querySelector(".hidden-bar");

                if (isHidden) {
                    if (!bar) {
                        msg.dataset.collapsed = "true";
                        msg.classList.add("ph-collapsible");
                        msg.style.maxHeight = "0px";

                        bar = document.createElement("div");
                        bar.className = "hidden-bar";
                        bar.textContent = `Rejtett – ${author}`;

                        bar.addEventListener("click", () => {
                            const collapsed = msg.dataset.collapsed === "true";
                            if (collapsed) {
                                const fullHeight = msg.scrollHeight;
                                msg.style.maxHeight = fullHeight + "px";
                                msg.addEventListener("transitionend", function onEnd(e) {
                                    if (e.propertyName === "max-height") {
                                        msg.style.maxHeight = "none";
                                        msg.removeEventListener("transitionend", onEnd);
                                    }
                                });
                                msg.dataset.collapsed = "false";
                                bar.textContent = `Elrejtés – ${author}`;
                            } else {
                                msg.style.maxHeight = msg.scrollHeight + "px";
                                msg.offsetHeight;
                                msg.style.maxHeight = "0px";
                                msg.dataset.collapsed = "true";
                                bar.textContent = `Rejtett – ${author}`;
                            }
                        });

                        li.prepend(bar);
                    }
                } else {
                    if (bar) bar.remove();
                    msg.style.maxHeight = "";
                    delete msg.dataset.collapsed;
                }
            });
        }

        // ===== Gomb a szerkesztőhöz =====
        const editButtons = [];
        function createToggleButton(header) {
            if (header.dataset.userHideAdded) return;
            const editBtn = document.createElement("a");
            editBtn.href = "javascript:;";
            editBtn.className = "btn btn-forum";
            editBtn.style.marginLeft = "5px";
            editBtn.title = "Rejtett felhasználók szerkesztése";

            function refreshButton(btn) {
                const count = hiddenUsers.length;
                btn.innerHTML = count > 0
                    ? `<span class="fas fa-eye-slash fa-fw"></span> Rejtettek (${count})`
                    : "<span class=\"fas fa-eye-slash fa-fw\"></span> Rejtettek";
                btn.classList.toggle("btn-primary", count > 0);
            }

            editBtn.addEventListener("click", () => {
                openEditor(() => {
                    editButtons.forEach(refreshButton);
                });
            });
            header.appendChild(editBtn);
            header.dataset.userHideAdded = "true";

            refreshButton(editBtn);
            editButtons.push(editBtn);
        }

        // ===== Dual-list szerkesztő =====
        function openEditor(onSave) {
            const buttonPlaceholder = document.querySelector(".list-message");
            if (!buttonPlaceholder) return;
            const btnForum = buttonPlaceholder.querySelector(".btn-forum");
            const btnPrimary = buttonPlaceholder.querySelector(".btn-primary");
            const btnForumColor = btnForum ? getComputedStyle(btnForum).color : "white";
            const btnForumBackgroundColor = btnForum ? getComputedStyle(btnForum).backgroundColor : "#007bff";
            const btnPrimaryColor = btnPrimary ? getComputedStyle(btnPrimary).backgroundColor : "black";
            const bg = buttonPlaceholder ? getComputedStyle(buttonPlaceholder).backgroundColor : "white";
            const color = buttonPlaceholder ? getComputedStyle(buttonPlaceholder).color : "black";

            let style = document.querySelector("#ph-dual-list-style");
            if (!style) {
                style = document.createElement("style");
                style.id = "ph-dual-list-style";
                document.head.appendChild(style);
            }
            style.textContent = `
                .ph-editor-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center; }
                .ph-editor-panel { background: ${bg}; padding: 20px; border-radius: 5px; min-width: 400px; max-width: 600px; color: ${color}; }
                .dual-list-container { display: flex; gap: 10px; margin-top: 10px; }
                .dual-list { flex: 1; border: 1px solid #fff; min-height: 141px; max-height: 273px; padding: 5px; background: ${bg}; overflow-y: auto; }
                .dual-list-item { padding: 4px 6px; cursor: pointer; border-radius: 3px; margin: 2px 0; background: ${btnForumBackgroundColor}; color: ${btnForumColor}; border: 1px solid #fff; }
                .dual-list-item.selected { background: ${btnPrimaryColor}; color: white; border-color: white; }
                .dual-list-buttons { display: flex; flex-direction: column; justify-content: center; gap: 5px; }
                .dual-list-buttons button { width: 36px; height: 36px; font-weight: bold; border-radius: 3px; cursor: pointer; }
                .editor-buttons { margin-top: 10px; display: flex; gap: 5px; justify-content: flex-end; }
            `;

            const overlay = document.createElement("div");
            overlay.className = "ph-editor-overlay";

            const panel = document.createElement("div");
            panel.className = "ph-editor-panel";

            const title = document.createElement("h3");
            title.textContent = "Rejtett felhasználók szerkesztése";

            // ===== Lista konténerek =====
            const container = document.createElement("div");
            container.className = "dual-list-container";

            const leftList = document.createElement("div");
            leftList.className = "dual-list";

            const rightList = document.createElement("div");
            rightList.className = "dual-list";

            const buttonsDiv = document.createElement("div");
            buttonsDiv.className = "dual-list-buttons";

            const btnRight = document.createElement("button");
            btnRight.className = "btn btn-forum btn-sm fas fa-arrow-right fa-fw";
            const btnLeft = document.createElement("button");
            btnLeft.className = "btn btn-forum btn-sm fas fa-arrow-left fa-fw";

            buttonsDiv.append(btnRight, btnLeft);
            container.append(leftList, buttonsDiv, rightList);

            panel.append(title, container);

            // ===== Gombok mentés / mégse =====
            const editorButtonsDiv = document.createElement("div");
            editorButtonsDiv.className = "editor-buttons";

            const saveBtn = document.createElement("button");
            saveBtn.textContent = "Mentés";
            saveBtn.className = "btn btn-forum btn-primary";

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Mégse";
            cancelBtn.className = "btn btn-forum";

            editorButtonsDiv.append(saveBtn, cancelBtn);
            panel.append(editorButtonsDiv);

            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            // ===== Ideiglenes lista a szerkesztéshez =====
            let tempHiddenUsers = [...hiddenUsers];

            // ===== Kitöltjük a listákat =====
            function refreshLists() {
                leftList.innerHTML = "";
                rightList.innerHTML = "";

                const domAuthors = Array.from(new Set(getPosts().map(li => getAuthor(li))))
                    .filter(a => !tempHiddenUsers.includes(a))
                    .sort((a,b) => a.localeCompare(b));

                domAuthors.forEach(user => {
                    const div = document.createElement("div");
                    div.className = "dual-list-item";
                    div.textContent = user;
                    div.addEventListener("click", () => div.classList.toggle("selected"));
                    leftList.appendChild(div);
                });

                tempHiddenUsers.forEach(user => {
                    const div = document.createElement("div");
                    div.className = "dual-list-item";
                    div.textContent = user;
                    div.addEventListener("click", () => div.classList.toggle("selected"));
                    rightList.appendChild(div);
                });
            }

            refreshLists();

            // ===== Nyilak – csak a temp listát módosítják =====
            btnRight.addEventListener("click", () => {
                Array.from(leftList.querySelectorAll(".dual-list-item.selected")).forEach(div => {
                    div.classList.remove("selected");
                    if (!tempHiddenUsers.includes(div.textContent)) tempHiddenUsers.push(div.textContent);
                });
                refreshLists();
            });

            btnLeft.addEventListener("click", () => {
                Array.from(rightList.querySelectorAll(".dual-list-item.selected")).forEach(div => {
                    div.classList.remove("selected");
                    tempHiddenUsers = tempHiddenUsers.filter(u => u !== div.textContent);
                });
                refreshLists();
            });

            // ===== Mentés – csak itt frissítjük a valódi hiddenUsers-t =====
            saveBtn.addEventListener("click", () => {
                hiddenUsers = Array.from(new Set(tempHiddenUsers));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenUsers));
                updateHiddenComments();
                closeEditor();
                if (onSave) onSave();
            });

            // ===== Mégse – bezár, temp változás elvész =====
            cancelBtn.addEventListener("click", closeEditor);

            function escListener(e) {
                if (e.key === "Escape") {
                    closeEditor();
                }
            }

            document.addEventListener("keydown", escListener);

            function closeEditor() {
                document.removeEventListener("keydown", escListener);
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }

            // ===== Háttérre kattintás = Mégse =====
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    closeEditor();
                }
            });
        }

        // ===== Init =====
        function init() {
            applyHiddenBarStyle();
            document.querySelectorAll("h4.list-message").forEach(createToggleButton);
            updateHiddenComments();
        }

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes.length) {
                    init();
                    break;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
            init();
        }
    }

    function markSeenPosts() {
        const STORAGE_PREFIX = "ph_topic_max_id:";

        // CSS class hozzáadása
        const style = document.createElement("style");
        style.textContent = `
            .ph-seen-header {
                filter: grayscale(100%);
                transition: filter 1s ease;
            }
        `;
        document.head.appendChild(style);

        function getTopicKey() {
            const match = location.pathname.match(/\/tema\/([^/]+)/);
            return match ? STORAGE_PREFIX + match[1] : null;
        }

        function getMaxFromURL() {
            const hashMatch = location.hash.match(/#msg(\d+)/);
            if (hashMatch) {
                return parseInt(hashMatch[1], 10) - 1; // -1, mert a linkelt hozzászólás még "nem olvasott"
            }
            return null;
        }

        function process() {
            const topicKey = getTopicKey();
            if (!topicKey) return;

            // Legnagyobb eddig olvasott ID
            let savedMaxId = parseInt(localStorage.getItem(topicKey) || "0", 10);

            // Mindig vizsgáljuk a #msgNNN-t
            const urlMax = getMaxFromURL();
            if (urlMax && urlMax > savedMaxId) {
                savedMaxId = urlMax;
            }

            const comments = Array.from(document.querySelectorAll("li.media[data-id]"));
            if (!comments.length) return;

            // Oldalon lévő legnagyobb ID
            const currentMaxId = comments.reduce((max, c) => {
                const id = parseInt(c.dataset.id, 10) || 0;
                return Math.max(max, id);
            }, savedMaxId);

            comments.forEach(comment => {
                const id = parseInt(comment.dataset.id, 10);
                if (!id) return;

                const header = comment.querySelector(".msg-header");
                if (!header) return;

                // Halványítás: régebbi hozzászólás header-je halványabb
                if (savedMaxId && id <= savedMaxId) {
                    header.classList.add("ph-seen-header");
                }
            });

            // Mentés
            if (currentMaxId > savedMaxId) {
                localStorage.setItem(topicKey, currentMaxId);
            }
        }

        window.addEventListener("load", process);
    }
})();
