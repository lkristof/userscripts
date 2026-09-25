// ==UserScript==
// @name         nCore – Tools
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  nCore segédek egyben: qBittorrent, de-dereferer, köszönetek elrejtése, látott filmek, 3+ kiemelés.
// @icon         https://static.ncore.pro/styles/ncore.ico
//
// @match        https://ncore.pro/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-tools.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-tools.user.js
//
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(async function () {
    'use strict';

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    const LS_PREFIX = 'ncore_';
    const GM_KEY_QB_URL = 'qb_url';
    const GM_KEY_SETTINGS = 'tools_settings';

    const DEFAULT_SETTINGS = {
        qbittorrent: true,
        dedereferer: true,
        noThanks: true,
        seen: true,
        highlight: true,
    };

    async function gmGet(key, def = '') {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(key, def);
            if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') return await GM.getValue(key, def);
        } catch (_) {}

        try {
            const v = localStorage.getItem(LS_PREFIX + key);
            return v === null ? def : v;
        } catch (_) {
            return def;
        }
    }

    async function gmSet(key, value) {
        try {
            if (typeof GM_setValue === 'function') return GM_setValue(key, value);
            if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') return await GM.setValue(key, value);
        } catch (_) {}

        try {
            localStorage.setItem(LS_PREFIX + key, String(value));
        } catch (_) {}
    }

    async function gmDel(key) {
        try {
            if (typeof GM_deleteValue === 'function') return GM_deleteValue(key);
            if (typeof GM !== 'undefined' && typeof GM.deleteValue === 'function') return await GM.deleteValue(key);
        } catch (_) {}

        try {
            localStorage.removeItem(LS_PREFIX + key);
        } catch (_) {}
    }

    async function loadSettings() {
        const raw = await gmGet(GM_KEY_SETTINGS, '');
        if (!raw) return { ...DEFAULT_SETTINGS };

        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
        } catch (_) {
            return { ...DEFAULT_SETTINGS };
        }
    }

    async function saveSettings(settings) {
        await gmSet(GM_KEY_SETTINGS, JSON.stringify(settings));
    }

    const settings = await loadSettings();
    const $ = (sel, root = document) => root.querySelector(sel);

    // -------------------------------------------------------------------------
    // Toast UI
    // -------------------------------------------------------------------------

    let toastContainer = null;

    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            Object.assign(toastContainer.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: '100001',
            });
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function showToast(message, type = 'success', duration = 3000) {
        const container = getToastContainer();
        const toast = document.createElement('div');

        Object.assign(toast.style, {
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            minWidth: '220px',
            opacity: '0',
            transform: 'translateX(20px)',
            transition: 'all 0.3s ease',
            backgroundColor: type === 'success' ? '#2ecc71' : '#e74c3c',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        });

        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        if (container.children.length > 5) container.removeChild(container.firstChild);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // -------------------------------------------------------------------------
    // qBittorrent URL
    // -------------------------------------------------------------------------

    function normalizeBaseUrl(u) {
        if (!u) return '';
        u = String(u).trim();
        if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
        return u.replace(/\/+$/, '');
    }

    async function getQBUrl() {
        return normalizeBaseUrl(await gmGet(GM_KEY_QB_URL, ''));
    }

    async function setQBUrl(u) {
        const norm = normalizeBaseUrl(u);
        if (norm) await gmSet(GM_KEY_QB_URL, norm);
        else await gmDel(GM_KEY_QB_URL);
        return norm;
    }

    async function promptForQBUrl() {
        const current = await getQBUrl();
        const input = window.prompt(
            'qBittorrent WebUI URL (pl. http://127.0.0.1:8080)',
            current || 'http://127.0.0.1:8080'
        );
        if (input === null) return null;

        const saved = await setQBUrl(input);
        showToast(saved ? 'qBittorrent URL elmentve: ' + saved : 'qBittorrent URL törölve.', saved ? 'success' : 'error');
        await refreshInfosavQBLinkState();
        return saved;
    }

    async function sendToQB(dlUrl) {
        let qb = await getQBUrl();
        if (!qb) {
            showToast('Nincs beállítva qBittorrent URL. Beállítás…', 'error');
            qb = await promptForQBUrl();
            if (!qb) return;
        }

        if (typeof GM_xmlhttpRequest !== 'function') {
            showToast('GM_xmlhttpRequest nem elérhető ebben a userscript környezetben.', 'error', 5000);
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: qb + '/api/v2/torrents/add',
            data: 'urls=' + encodeURIComponent(dlUrl),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            onload(resp) {
                if (resp.status === 200) showToast('Torrent elküldve qBittorrentnek!');
                else showToast('Sikertelen: HTTP ' + resp.status, 'error');
            },
            onerror() {
                showToast('Hiba a qBittorrent felé küldés közben.', 'error');
            },
        });
    }

    // -------------------------------------------------------------------------
    // Beállítások modal
    // -------------------------------------------------------------------------

    const SETTING_LABELS = {
        qbittorrent: 'qBittorrent integráció',
        dedereferer: 'Dereferer linkek eltávolítása',
        noThanks: 'Köszönetek elrejtése',
        seen: '„Láttam már” jelölés dupla kattintással',
        highlight: '3+ pluszos torrentek kiemelése',
    };

    let settingsKeydownHandler = null;

    function closeSettingsModal() {
        document.getElementById('ncore-tools-settings-overlay')?.remove();

        if (settingsKeydownHandler) {
            document.removeEventListener('keydown', settingsKeydownHandler);
            settingsKeydownHandler = null;
        }
    }

    function ensureSettingsModalStyle() {
        if (document.getElementById('ncore-tools-settings-style')) return;

        const style = document.createElement('style');
        style.id = 'ncore-tools-settings-style';
        style.textContent = `
            #ncore-tools-settings-overlay {
                position: fixed;
                inset: 0;
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(12, 13, 14, 0.78);
                font-family: Verdana, Geneva, Arial, Helvetica, sans-serif;
                font-size: 10px;
                color: #adafb2;
            }

            #ncore-tools-settings-panel {
                width: min(500px, 94vw);
                overflow: hidden;
                background: #222326;
                border: 1px solid #35363a;
                border-top: 2px solid #84bd00;
                border-radius: 3px;
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
            }

            #ncore-tools-settings-header {
                position: relative;
                padding: 12px 14px 11px;
                background: #2e2f33;
                border-bottom: 1px solid #333437;
            }

            #ncore-tools-settings-title {
                margin: 0;
                padding: 0 28px 0 0;
                color: #cbCDD0;
                font-size: 14px;
                line-height: 18px;
                font-weight: normal;
            }

            #ncore-tools-settings-subtitle {
                margin-top: 4px;
                color: #777b80;
                font-size: 9px;
                line-height: 13px;
            }

            #ncore-tools-settings-close {
                position: absolute;
                top: 8px;
                right: 9px;
                width: 24px;
                height: 24px;
                padding: 0;
                border: 1px solid transparent;
                border-radius: 3px;
                background: transparent;
                color: #777b80;
                font: bold 17px/20px Arial, sans-serif;
                cursor: pointer;
            }

            #ncore-tools-settings-close:hover {
                border-color: #43454c;
                background: #34363a;
                color: #cbCDD0;
            }

            #ncore-tools-settings-form {
                padding: 8px 10px;
                background: #222326;
            }

            .ncore-tools-setting-row {
                display: flex;
                align-items: center;
                min-height: 31px;
                margin: 0;
                padding: 5px 8px;
                border-top: 1px solid #303135;
                color: #adafb2;
                cursor: pointer;
                user-select: none;
                box-sizing: border-box;
            }

            .ncore-tools-setting-row:first-child {
                border-top: 0;
            }

            .ncore-tools-setting-row:hover {
                background: #2a2b2f;
                color: #cbCDD0;
            }

            .ncore-tools-setting-row input[type="checkbox"] {
                appearance: none;
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                flex: 0 0 14px;
                margin: 0 9px 0 0;
                border: 1px solid #111214;
                border-radius: 2px;
                background: #d5d5d5;
                box-shadow: inset 0 0 0 1px rgba(255,255,255,.16);
                cursor: pointer;
                position: relative;
            }

            .ncore-tools-setting-row input[type="checkbox"]:checked {
                border-color: #658f08;
                background: #84bd00;
            }

            .ncore-tools-setting-row input[type="checkbox"]:checked::after {
                content: '';
                position: absolute;
                left: 3px;
                top: 0px;
                width: 4px;
                height: 8px;
                border: solid #1d1e21;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }

            .ncore-tools-setting-row input[type="checkbox"]:focus-visible {
                outline: 1px solid #84bd00;
                outline-offset: 2px;
            }

            .ncore-tools-setting-label {
                line-height: 16px;
            }

            #ncore-tools-settings-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                padding: 10px 12px;
                background: #2e2f33;
                border-top: 1px solid #333437;
            }

            #ncore-tools-settings-note {
                max-width: 265px;
                color: #777b80;
                font-size: 9px;
                line-height: 13px;
            }

            #ncore-tools-settings-buttons {
                display: flex;
                flex: 0 0 auto;
                gap: 6px;
            }

            .ncore-tools-settings-button {
                min-height: 27px;
                padding: 4px 9px;
                border: 1px solid #222326;
                border-radius: 3px;
                background: #34363a;
                color: #adafb2;
                font-family: Verdana, Geneva, Arial, Helvetica, sans-serif;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
                transition: background .15s ease, color .15s ease, border-color .15s ease;
            }

            .ncore-tools-settings-button:hover {
                border-color: #43454c;
                background: #3d485f;
                color: #fff;
            }

            .ncore-tools-settings-button.primary {
                border-color: #658f08;
                background: #84bd00;
                color: #1d1e21;
            }

            .ncore-tools-settings-button.primary:hover {
                border-color: #8ec900;
                background: #95cf0a;
                color: #111214;
            }

            @media (max-width: 560px) {
                #ncore-tools-settings-overlay {
                    padding: 10px;
                }

                #ncore-tools-settings-footer {
                    align-items: stretch;
                    flex-direction: column;
                }

                #ncore-tools-settings-note {
                    max-width: none;
                }

                #ncore-tools-settings-buttons {
                    justify-content: flex-end;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function openSettingsModal() {
        closeSettingsModal();
        ensureSettingsModalStyle();

        const overlay = document.createElement('div');
        overlay.id = 'ncore-tools-settings-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'ncore-tools-settings-title');

        const panel = document.createElement('div');
        panel.id = 'ncore-tools-settings-panel';

        const header = document.createElement('div');
        header.id = 'ncore-tools-settings-header';

        const title = document.createElement('h2');
        title.id = 'ncore-tools-settings-title';
        title.textContent = 'nCore – Tools beállítások';

        const subtitle = document.createElement('div');
        subtitle.id = 'ncore-tools-settings-subtitle';
        subtitle.textContent = 'A userscript funkcióinak be- és kikapcsolása';

        const close = document.createElement('button');
        close.id = 'ncore-tools-settings-close';
        close.type = 'button';
        close.title = 'Bezárás';
        close.setAttribute('aria-label', 'Bezárás');
        close.textContent = '×';
        close.addEventListener('click', closeSettingsModal);

        header.append(title, subtitle, close);
        panel.appendChild(header);

        const form = document.createElement('div');
        form.id = 'ncore-tools-settings-form';

        for (const [key, labelText] of Object.entries(SETTING_LABELS)) {
            const label = document.createElement('label');
            label.className = 'ncore-tools-setting-row';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.settingKey = key;
            checkbox.checked = Boolean(settings[key]);

            const text = document.createElement('span');
            text.className = 'ncore-tools-setting-label';
            text.textContent = labelText;

            label.append(checkbox, text);
            form.appendChild(label);
        }

        panel.appendChild(form);

        const footer = document.createElement('div');
        footer.id = 'ncore-tools-settings-footer';

        const note = document.createElement('div');
        note.id = 'ncore-tools-settings-note';
        note.textContent = 'A módosítások mentés után, az oldal újratöltésével lépnek életbe.';

        const buttons = document.createElement('div');
        buttons.id = 'ncore-tools-settings-buttons';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'ncore-tools-settings-button';
        cancel.textContent = 'Mégse';
        cancel.addEventListener('click', closeSettingsModal);

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'ncore-tools-settings-button primary';
        save.textContent = 'Mentés és újratöltés';
        save.addEventListener('click', async () => {
            const next = { ...settings };
            form.querySelectorAll('input[data-setting-key]').forEach(input => {
                next[input.dataset.settingKey] = input.checked;
            });
            await saveSettings(next);
            location.reload();
        });

        buttons.append(cancel, save);
        footer.append(note, buttons);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeSettingsModal();
        });

        settingsKeydownHandler = e => {
            if (e.key === 'Escape') closeSettingsModal();
        };
        document.addEventListener('keydown', settingsKeydownHandler);
        close.focus();
    }

    // -------------------------------------------------------------------------
    // Infosáv: [qB URL] [Beállítások]
    // -------------------------------------------------------------------------

    async function refreshInfosavQBLinkState() {
        const a = document.querySelector('#qb-url-link');
        if (!a) return;

        const qb = await getQBUrl();
        if (qb) {
            a.style.color = '#2ecc71';
            a.title = 'Beállítva: ' + qb + '\nKatt: módosítás';
        } else {
            a.style.color = '#e74c3c';
            a.title = 'Nincs beállítva qB URL\nKatt: beállítás';
        }
    }

    function createBracketLink(id, text, title, onClick) {
        const wrapper = document.createElement('span');
        wrapper.appendChild(document.createTextNode(' ['));

        const a = document.createElement('a');
        a.id = id;
        a.href = 'javascript:void(0)';
        a.textContent = text;
        a.title = title;
        a.style.textDecoration = 'none';
        a.style.fontWeight = 'normal';
        a.addEventListener('click', onClick);

        wrapper.appendChild(a);
        wrapper.appendChild(document.createTextNode(']'));
        return wrapper;
    }

    async function ensureInfosavLinks() {
        const infosavAdatok = document.querySelector('#infosav_adatok');
        if (!infosavAdatok) return;

        function findPremiumInsertAfter() {
            const premium = infosavAdatok.querySelector('a.premium[href*="/shop"]');
            if (!premium) return null;

            let node = premium.nextSibling;
            while (node && !(node.nodeType === Node.TEXT_NODE && node.nodeValue.includes(']'))) {
                node = node.nextSibling;
            }
            return node || premium;
        }

        function insertAfter(node, afterNode) {
            const space = document.createTextNode(' ');

            if (afterNode && afterNode.parentNode === infosavAdatok) {
                infosavAdatok.insertBefore(space, afterNode.nextSibling);
                infosavAdatok.insertBefore(node, space.nextSibling);
            } else {
                infosavAdatok.appendChild(space);
                infosavAdatok.appendChild(node);
            }
        }

        let qbLink = document.querySelector('#qb-url-link');
        let settingsLink = document.querySelector('#ncore-tools-settings-link');

        if (settings.qbittorrent && !qbLink) {
            const qbWrapper = createBracketLink(
                'qb-url-link',
                'qB URL',
                'qBittorrent WebUI URL beállítása',
                promptForQBUrl
            );

            if (settingsLink?.parentNode?.parentNode === infosavAdatok) {
                const settingsWrapper = settingsLink.parentNode;
                infosavAdatok.insertBefore(qbWrapper, settingsWrapper);
                infosavAdatok.insertBefore(document.createTextNode(' '), settingsWrapper);
            } else {
                insertAfter(qbWrapper, findPremiumInsertAfter());
            }

            qbLink = document.querySelector('#qb-url-link');
        }

        if (!settingsLink) {
            const settingsWrapper = createBracketLink(
                'ncore-tools-settings-link',
                'Beállítások',
                'nCore – Tools funkciók be/ki kapcsolása',
                openSettingsModal
            );

            const qbWrapper = qbLink?.parentNode;
            insertAfter(
                settingsWrapper,
                qbWrapper?.parentNode === infosavAdatok ? qbWrapper : findPremiumInsertAfter()
            );

            settingsLink = document.querySelector('#ncore-tools-settings-link');
        }

        if (settings.qbittorrent) await refreshInfosavQBLinkState();
    }

    // -------------------------------------------------------------------------
    // 1) De-dereferer
    // -------------------------------------------------------------------------

    function initDedereferer() {
        const DEREFERERS = [
            'https://dereferer.me/?',
            'https://dereferer.link/?',
        ];

        function cleanHref(href) {
            for (const prefix of DEREFERERS) {
                if (href.startsWith(prefix)) return href.slice(prefix.length);
            }
            return href;
        }

        function ensureRel(link) {
            const existing = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
            for (const value of ['nofollow', 'noreferrer']) {
                if (!existing.includes(value)) existing.push(value);
            }
            link.setAttribute('rel', existing.join(' '));
        }

        function processLink(link) {
            const cleaned = cleanHref(link.href);
            if (cleaned !== link.href) {
                link.href = cleaned;
                ensureRel(link);
            }
        }

        function processNode(node) {
            if (node.nodeType !== 1) return;
            if (node.matches?.('a[href]')) processLink(node);
            node.querySelectorAll?.('a[href]').forEach(processLink);
        }

        document.querySelectorAll('a[href]').forEach(processLink);
        new MutationObserver(mutations => {
            for (const mutation of mutations) mutation.addedNodes.forEach(processNode);
        }).observe(document.body, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------------
    // 2) Köszönetek elrejtése
    // -------------------------------------------------------------------------

    function initNoThanks() {
        function removeThanks(root = document) {
            const direct = root.id === 'ncoreKoszonetAjax' ? root : null;
            direct?.remove();
            root.querySelector?.('#ncoreKoszonetAjax')?.remove();
        }

        removeThanks();
        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node instanceof HTMLElement) removeThanks(node);
                });
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------------
    // 3) Láttam már
    // -------------------------------------------------------------------------

    function initSeen() {
        if (!location.pathname.endsWith('/torrents.php') || new URLSearchParams(location.search).has('action')) return;

        const TORRENT_SELECTOR = '.box_torrent';
        const SEEN_CLASS = 'ncore-seen';

        const style = document.createElement('style');
        style.textContent = `
            .box_torrent.${SEEN_CLASS} { opacity: 0.5; }
            body > [id^="borito"] { opacity: 1 !important; }
        `;
        document.head.appendChild(style);

        function getImdbId(row) {
            const link = row.querySelector('.infolink');
            const match = link?.href?.match(/tt(\d+)/);
            return match ? match[1] : null;
        }

        function isSeries(row) {
            const categ = row.querySelector('.categ_link');
            return Boolean(categ && /sorozat/i.test(categ.title));
        }

        function updateRow(row) {
            const imdbId = getImdbId(row);
            if (!imdbId) return;
            row.classList.toggle(SEEN_CLASS, localStorage.getItem(imdbId) !== null);
        }

        function toggleSeen(row) {
            const imdbId = getImdbId(row);
            if (!imdbId) return;

            if (localStorage.getItem(imdbId) !== null) localStorage.removeItem(imdbId);
            else localStorage.setItem(imdbId, '1');

            updateRow(row);
        }

        function bindRow(row) {
            if (!(row instanceof HTMLElement) || row.dataset.ncoreSeenBound === '1') return;
            row.dataset.ncoreSeenBound = '1';
            if (isSeries(row)) return;

            updateRow(row);
            row.addEventListener('dblclick', event => {
                event.preventDefault();
                toggleSeen(row);
            });

            row.querySelectorAll('[id^="borito"]').forEach(cover => document.body.appendChild(cover));
        }

        document.querySelectorAll(TORRENT_SELECTOR).forEach(bindRow);
        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches(TORRENT_SELECTOR)) bindRow(node);
                    node.querySelectorAll?.(TORRENT_SELECTOR).forEach(bindRow);
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------------
    // 4) 3+ pluszos torrentek kiemelése
    // -------------------------------------------------------------------------

    function initHighlight() {
        if (!location.pathname.endsWith('/torrents.php')) return;

        const HIGHLIGHT_BG = '#600A0A';
        const HIGHLIGHT_HOVER_BG = '#8A1515';

        const style = document.createElement('style');
        style.textContent = `
            .ncore-plus-highlight { background: linear-gradient(${HIGHLIGHT_BG}, ${HIGHLIGHT_BG}); }
            .ncore-plus-highlight:hover { background: linear-gradient(${HIGHLIGHT_HOVER_BG}, ${HIGHLIGHT_HOVER_BG}); }
        `;
        document.head.appendChild(style);

        function highlight(box) {
            const plusEl = box.querySelector('.box_d2');
            if (!plusEl) return;

            const plusCount = (plusEl.textContent.match(/\+/g) || []).length;
            const main = box.querySelector('.box_nagy, .box_nagy2');
            if (!main) return;

            main.classList.toggle('ncore-plus-highlight', plusCount >= 3);
        }

        document.querySelectorAll('.box_torrent').forEach(highlight);
        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches('.box_torrent')) highlight(node);
                    node.querySelectorAll?.('.box_torrent').forEach(highlight);
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------------
    // 5) qBittorrent integráció
    // -------------------------------------------------------------------------

    function initQBittorrent() {
        if (!location.pathname.endsWith('/torrents.php')) return;

        function injectQBLink(rootEl) {
            if (!rootEl) return;

            const selector = '.letoltve_txt a[href*="torrents.php?action=download"]';
            const downloadLinks = [];

            if (rootEl.matches?.(selector)) downloadLinks.push(rootEl);
            rootEl.querySelectorAll?.(selector).forEach(link => downloadLinks.push(link));

            for (const dlA of downloadLinks) {
                const parent = dlA.parentNode;
                if (!parent) continue;

                const dlUrl = new URL(dlA.getAttribute('href'), window.location.origin).href;
                const alreadyInjected = Array.from(parent.querySelectorAll?.('.qb-inline-link') || [])
                    .some(link => link.dataset.downloadUrl === dlUrl);

                if (alreadyInjected) continue;

                const sep = document.createElement('span');
                sep.className = 'qb-inline-separator';
                sep.textContent = ' | ';

                const qbA = document.createElement('a');
                qbA.href = 'javascript:void(0);';
                qbA.textContent = 'qBittorrent';
                qbA.className = 'qb-inline-link';
                qbA.dataset.downloadUrl = dlUrl;
                qbA.addEventListener('click', () => sendToQB(dlUrl));

                dlA.parentNode.insertBefore(sep, dlA.nextSibling);
                dlA.parentNode.insertBefore(qbA, sep.nextSibling);
            }
        }

        // Fix search form method to GET.
        const form = document.getElementById('kereses_mezo');
        if (form) form.method = 'GET';

        // Részletező oldal.
        const alt = $('link[rel="alternate"]');
        const key = alt?.getAttribute('href')?.slice(-32) || '';

        if (window.location.search.includes('action=details')) {
            const params = new URLSearchParams(window.location.search);
            const torrentId = params.get('id');
            const container = document.querySelector('.torrent_reszletek_konyvjelzo');

            if (torrentId && container && !container.querySelector('.qbittorrent-add-btn')) {
                const dlUrl = `${window.location.origin}/torrents.php?action=download&id=${torrentId}&key=${key}`;
                const qbLink = document.createElement('a');
                qbLink.style.fontWeight = 'normal';
                qbLink.href = 'javascript:void(0);';
                qbLink.className = 'qbittorrent-add-btn';
                qbLink.title = 'Küldés qBittorrentbe';
                qbLink.textContent = '[qBittorrent]';
                qbLink.addEventListener('click', () => sendToQB(dlUrl));
                container.appendChild(qbLink);
            }
        }

        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    injectQBLink(node);
                    node.querySelectorAll?.('.torrent_lenyilo, .torrent_lenyilo_tartalom, .torrent_lenyilo_lehetoseg, .torrent_lenyilo_lab, .torrent_lenyilo_tartalom *').forEach(injectQBLink);
                }
            }
        }).observe(document.documentElement, { childList: true, subtree: true });

        injectQBLink(document);
    }

    // -------------------------------------------------------------------------
    // Init
    // -------------------------------------------------------------------------

    if (settings.dedereferer) initDedereferer();
    if (settings.noThanks) initNoThanks();
    if (settings.seen) initSeen();
    if (settings.highlight) initHighlight();
    if (settings.qbittorrent) initQBittorrent();

    ensureInfosavLinks();

    const infosav = document.querySelector('#infosav');
    if (infosav) {
        new MutationObserver(() => ensureInfosavLinks())
            .observe(infosav, { childList: true, subtree: true });
    }
})();
