// ==UserScript==
// @name         Prohardver Fórum – Power Tools
// @namespace    ph
// @version      1.0.7
// @description  PH Fórum extra funkciók, fejlécbe épített beállításokkal
// @match        https://prohardver.hu/*
// @match        https://mobilarena.hu/*
// @match        https://logout.hu/*
// @match        https://fototrend.hu/*
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
        keyboardNavigation: true
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
        @media only screen and (max-width: 991.98px) {
            .ph-power-btn + .dropdown-menu {
                display: none !important;
                position: absolute !important;
                left: 0 !important;
                min-width: 150px;
                max-width: 95vw !important;
            }
            .ph-power-btn + .dropdown-menu.show {
                display: block !important;
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
    
            <div class="dropdown-menu dropdown-menu-right p-2" style="min-width: 240px">
                <h6 class="dropdown-header">PH Power Tools</h6>
    
                ${Object.keys(defaultSettings).map(key => `
                    <a href="javascript:;" 
                       class="btn btn-forum dropdown-item ${draftSettings[key] ? 'btn-primary' : ''}" 
                       data-key="${key}" 
                       style="display: flex; justify-content: space-between; align-items: center; white-space: nowrap; margin-bottom: 4px;">
                        <span>${prettyName(key)}</span>
                        <span class="ph-check">${draftSettings[key] ? '<span class="fas fa-check"></span>' : ''}</span>
                    </a>
                `).join('')}
    
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
            setTimeout(() => toggleBtn.blur(), 50);
        });

        // Dropdown item click
        li.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', e => {
                e.stopPropagation();

                const key = item.dataset.key;
                draftSettings[key] = !draftSettings[key];

                item.classList.toggle('btn-primary', draftSettings[key]);
                item.querySelector('.ph-check').innerHTML = draftSettings[key] ? '<span class="fas fa-check"></span>' : '';

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
    }

    function prettyName(key) {
        return {
            colorize: 'Hozzászólások színezése',
            linkRedirect: 'Link átirányítás',
            msgAnchorHighlight: 'Üzenet kiemelés',
            offHider: 'OFF hozzászólások elrejtése',
            wideView: 'Széles nézet',
            threadView: 'Thread nézet',
            keyboardNavigation: 'Billentyűzetes navigáció'
        }[key] || key;
    }

    /************ MODULE DISPATCH ************/

    if (isTemaPage()) {
        if (savedSettings.colorize) colorize();
        if (savedSettings.linkRedirect) linkRedirect();
        if (savedSettings.msgAnchorHighlight) msgAnchorHighlight();
        if (savedSettings.offHider) offHider();
        if (savedSettings.wideView) wideView();
        if (savedSettings.threadView) threadView();
        if (savedSettings.keyboardNavigation) keyboardNavigation();
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

        function findClosestMsgBody(targetId) {
            const items = [...document.querySelectorAll("li.media[data-id]")];
            if (!items.length) return null;

            let closest = null;
            let minDiff = Infinity;

            for (const li of items) {
                const id = Number(li.dataset.id);
                if (Number.isNaN(id)) continue;

                const diff = Math.abs(id - targetId);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = li;
                }
            }

            return closest?.querySelector(".msg-body") || null;
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
                body = findClosestMsgBody(msgId);
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
        const STATUS = {ON: 'enabled', OFF: 'disabled'};

        let offHidden = localStorage.getItem(STORAGE_KEY) === STATUS.ON;

        // ===== Gomb létrehozása =====
        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.marginLeft = '5px';
        btn.id = 'ph-off-toggle-btn';
        btn.innerHTML = `<span class="fas fa-ban fa-fw"></span> OFF elrejtése`;

        function updateButtonAppearance() {
            if (offHidden) {
                btn.classList.add('btn-primary');
                btn.title = 'OFF hozzászólások megjelenítése';
            } else {
                btn.classList.remove('btn-primary');
                btn.title = 'OFF hozzászólások elrejtése';
            }
        }

        // ===== Beszúrás a headerbe =====
        const header = document.querySelector('h4.list-message');
        if (header) {
            header.appendChild(btn);
        }

        // ===== OFF posztok kiválasztása =====
        const offPosts = document.querySelectorAll('.msg, .topic, .msg-off');
        offPosts.forEach(post => {
            if (post.textContent.includes('[OFF]') || post.classList.contains('msg-off')) {
                post.style.display = offHidden ? 'none' : '';
            }
        });

        function applyVisibility() {
            offPosts.forEach(post => {
                if (post.textContent.includes('[OFF]') || post.classList.contains('msg-off')) {
                    post.style.display = offHidden ? 'none' : '';
                }
            });
        }

        // ===== Toggle =====
        function toggleOff() {
            offHidden = !offHidden;

            localStorage.setItem(STORAGE_KEY, offHidden ? STATUS.ON : STATUS.OFF);

            applyVisibility();
            updateButtonAppearance();
        }

        btn.addEventListener('click', toggleOff);

        // Kezdeti állapot
        updateButtonAppearance();
    }

    function wideView() {
        // ---- Beállítások ----
        const LEFT_PX = 230;
        const RIGHT_PX = 230;
        const GAP_PX = 0;
        const SIDE_MARGIN_RATIO = 0.20;
        const MIN_CENTER_PX = 710;

        const STYLE_ID = 'ph-wide-center-style';
        const ROW_CLASS = 'ph-center-row';

        const STORAGE_KEY = 'ph_wide_view';
        const STATUS = {ON: 'enabled', OFF: 'disabled'};

        // ---- Számítás ----
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
            const {total, center} = calculateLayout();

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

        // ---- Resize kezelés ----
        window.addEventListener('resize', () => {
            if (isActive()) applyLayout();
        });

        // ---- UI ----
        function insertButton() {
            const toolbar = document.querySelector('h4.list-message');
            if (!toolbar) return false;

            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.innerHTML = `<span class="fas fa-expand-arrows-alt fa-fw"></span> Széles nézet`;

            const updateUI = () => {
                btn.title = isActive() ? 'Eredeti szélesség' : 'Szélesebb nézet';
                btn.classList.toggle('btn-primary', isActive());
            };

            btn.addEventListener('click', () => {
                isActive() ? removeLayout() : applyLayout();
                saveState(isActive());
                updateUI();
            });

            toolbar.appendChild(btn);

            if (shouldBeActive()) applyLayout();
            updateUI();

            return true;
        }

        function init() {
            if (insertButton()) return;
            const obs = new MutationObserver(() => insertButton() && obs.disconnect());
            obs.observe(document.documentElement, {childList: true, subtree: true});
        }

        init();
    }

    function threadView() {
        /* ===== Beállítások ===== */
        const INDENT       = 10;
        const LINE_COLOR   = "#C1BFB6";
        const LINE_OPACITY = 1;
        const LINE_THICK   = 1;
        const PINNED_TEXT  = '(rögzített hozzászólás)';
        const STORAGE_KEY  = 'ph_thread_view'; // A kért kulcs
        const STATUS       = { ON: 'enabled', OFF: 'disabled' }; // Új konstans

        let threadContainerHeader = null;
        let threadActive = false;

        /* ===== CSS ===== */
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

        /* ===== Mentés és Betöltés ===== */
        function saveState(active) {
            localStorage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
        }

        function shouldBeActive() {
            return localStorage.getItem(STORAGE_KEY) === STATUS.ON;
        }

        /* ===== Thread render ===== */
        function renderThreading() {
            if (!threadContainerHeader) return;

            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            const pinned = [...ul.querySelectorAll('li.media')]
                .find(li => li.textContent.includes(PINNED_TEXT));
            const pinnedNext = pinned?.nextSibling;

            const items = [...ul.querySelectorAll('li.media[data-id]')]
                .filter(li => li !== pinned);

            if (!items.length) return;

            const postMap = {};
            const childrenMap = {};
            const allIds = new Set();

            items.forEach(li => allIds.add(li.dataset.id));

            items.forEach(li => {
                const id = li.dataset.id;
                let parent = li.dataset.rplid || null;
                if (parent && !allIds.has(parent)) parent = null;

                postMap[id] = li;
                if (!childrenMap[parent]) childrenMap[parent] = [];
                childrenMap[parent].push(id);
            });

            ul.innerHTML = '';
            if (pinned) {
                if (pinnedNext) ul.insertBefore(pinned, pinnedNext);
                else ul.appendChild(pinned);
            }

            function renderThread(id, depth, ancestorPath = []) {
                const el = postMap[id];
                if (!el) return;

                el.classList.add('ph-thread');
                const indent = depth * INDENT;
                el.style.setProperty('--indent', indent + 'px');
                el.style.marginLeft = indent + 'px';

                if (depth === 0) {
                    ul.appendChild(el);
                    (childrenMap[id] || []).forEach((childId, i, arr) => {
                        renderThread(childId, 1, [i === arr.length - 1]);
                    });
                    return;
                }

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

                const elbow = document.createElement('div');
                elbow.className = 'thread-line-horiz';
                elbow.style.left = ((depth - 1) * INDENT) + 'px';
                box.appendChild(elbow);

                ul.appendChild(el);

                (childrenMap[id] || []).forEach((childId, i, arr) => {
                    renderThread(childId, depth + 1, [...ancestorPath, i === arr.length - 1]);
                });
            }

            (childrenMap[null] || []).forEach(id => renderThread(id, 0, []));

            threadActive = true;
            saveState(true);
        }

        let originalOrder = [];

        function initOriginalOrder() {
            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            // Minden li.media elem referencia mentése
            originalOrder = [...ul.querySelectorAll('li.media')];
        }

        /* ===== Reset ===== */
        function restoreOriginalOrder() {
            if (!threadContainerHeader) return;

            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            // Thread-sorok és marginok eltávolítása
            ul.querySelectorAll('li.media.ph-thread').forEach(li => {
                li.classList.remove('ph-thread');
                li.style.marginLeft = '';
                const box = li.querySelector('.thread-lines');
                if (box) li.removeChild(box);
            });

            // Visszaállítjuk az eredeti sorrendet
            originalOrder.forEach(li => ul.appendChild(li));

            threadActive = false;
            saveState(false);
        }

        /* ===== Toggle gomb és inicializálás ===== */
        function init() {
            const container = document.querySelector('h4.list-message');
            if (!container) return false;

            threadContainerHeader = container;
            initOriginalOrder(); // Eredeti sorrend mentése

            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.id = 'ph-thread-toggle';
            btn.innerHTML = `<span class="fas fa-project-diagram fa-fw"></span> Thread nézet`;

            function updateButtonUI() {
                if (threadActive) {
                    btn.classList.add('btn-primary');
                    btn.title = 'Thread nézet kikapcsolása';
                } else {
                    btn.classList.remove('btn-primary');
                    btn.title = 'Thread nézet bekapcsolása';
                }
            }

            btn.addEventListener('click', () => {
                if (threadActive) restoreOriginalOrder();
                else renderThreading();
                updateButtonUI();
            });

            container.appendChild(btn);

            // --- Automatikus aktiválás, ha el volt mentve ---
            if (shouldBeActive()) {
                renderThreading();
                updateButtonUI();
            }

            return true;
        }

        // Indítás
        if (!init()) {
            const observer = new MutationObserver(() => {
                if (init()) observer.disconnect();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
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

        function getMinMaxPostId(posts) {
            const ids = posts.map(p => parseInt(p.dataset.id, 10));
            return {
                min: Math.min(...ids),
                max: Math.max(...ids),
            };
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

            let currentIndex = getCurrentIndex(posts);
            if (currentIndex === -1) currentIndex = 0;

            // SHIFT + ↑ / ↓ : msg id +/- 1
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                const currentId = getMsgIdFromHash();
                if (currentId === null) return;

                const {min, max} = getMinMaxPostId(posts);

                e.preventDefault();
                let newId = currentId + (e.key === 'ArrowUp' ? -1 : 1);
                if (newId < min) newId = min;
                if (newId > max) newId = max;

                setMsgId(newId);
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
})();
