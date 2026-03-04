// ==UserScript==
// @name         nCore – qBittorrent Add
// @namespace    https://github.com/lkristof/userscripts
// @version      1.3.0
// @description  Override torrent() to add qBittorrent button and remove ads.
// @icon         https://static.ncore.pro/styles/ncore.ico
//
// @include      https://ncore.pro/torrents.php*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-qbittorrent-add.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-qbittorrent-add.user.js
//
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(async function () {
    'use strict';

    // --- GM storage ---
    const GM_KEY_QB_URL = 'qb_url';
    const LS_PREFIX = 'ncore_';

    const $ = (sel, root = document) => root.querySelector(sel);

    // ---- Toast UI ----
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
                zIndex: 99999,
            });
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function showToast(message, type = 'success', duration = 3000) {
        const container = getToastContainer();

        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position: 'relative',
            overflow: 'hidden',
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

        const text = document.createElement('div');
        text.textContent = message;

        const bar = document.createElement('div');
        Object.assign(bar.style, {
            position: 'absolute',
            left: '0',
            bottom: '0',
            height: '3px',
            width: '100%',
            background: 'rgba(255,255,255,0.9)',
            transformOrigin: 'left',
            transform: 'scaleX(1)',
        });

        const animName = `toastBar_${Math.random().toString(16).slice(2)}`;
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ${animName} {
              from { transform: scaleX(1); }
              to   { transform: scaleX(0); }
            }`;
        document.head.appendChild(style);

        bar.style.animation = `${animName} ${duration}ms linear forwards`;

        toast.appendChild(text);
        toast.appendChild(bar);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        if (container.children.length > 5) container.removeChild(container.firstChild);

        let remaining = duration;
        let start = Date.now();
        let timeout;

        function removeToast() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 300);
        }

        function startTimer(time) {
            start = Date.now();
            timeout = setTimeout(removeToast, Math.max(0, time));
        }

        startTimer(remaining);

        toast.addEventListener('mouseenter', () => {
            bar.style.animationPlayState = 'paused';
            clearTimeout(timeout);
            const elapsed = Date.now() - start;
            remaining -= elapsed;
        });

        toast.addEventListener('mouseleave', () => {
            bar.style.animationPlayState = 'running';
            startTimer(remaining);
        });
    }

    // ---- GM adapter (GM_getValue vs GM.getValue vs localStorage) ----
    async function gmGet(key, def = '') {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(key, def);
            if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') return await GM.getValue(key, def);
        } catch (e) {
            // ignore -> fallback
        }
        try {
            const v = localStorage.getItem(LS_PREFIX + key);
            return v === null ? def : v;
        } catch (e) {
            return def;
        }
    }

    async function gmSet(key, value) {
        try {
            if (typeof GM_setValue === 'function') return GM_setValue(key, value);
            if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') return await GM.setValue(key, value);
        } catch (e) {
            // ignore -> fallback
        }
        try {
            localStorage.setItem(LS_PREFIX + key, String(value));
        } catch (e) {}
    }

    async function gmDel(key) {
        try {
            if (typeof GM_deleteValue === 'function') return GM_deleteValue(key);
            if (typeof GM !== 'undefined' && typeof GM.deleteValue === 'function') return await GM.deleteValue(key);
        } catch (e) {
            // ignore -> fallback
        }
        try {
            localStorage.removeItem(LS_PREFIX + key);
        } catch (e) {}
    }

    // ---- qB URL helpers ----
    function normalizeBaseUrl(u) {
        if (!u) return '';
        u = String(u).trim();
        if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
        u = u.replace(/\/+$/, '');
        return u;
    }

    async function getQBUrl() {
        return normalizeBaseUrl(await gmGet(GM_KEY_QB_URL, ''));
    }

    async function setQBUrl(u) {
        const norm = normalizeBaseUrl(u);
        await gmSet(GM_KEY_QB_URL, norm);
        return norm;
    }

    async function clearQBUrl() {
        await gmDel(GM_KEY_QB_URL);
    }

    async function promptForQBUrl() {
        const current = await getQBUrl();
        const input = window.prompt(
            'qBittorrent WebUI URL (pl. http://127.0.0.1:8080)',
            current || 'http://127.0.0.1:8080'
        );
        if (input === null) return null;

        const saved = await setQBUrl(input);
        if (saved) showToast('qBittorrent URL elmentve: ' + saved, 'success');
        else showToast('qBittorrent URL üres/törölve.', 'error');

        await refreshInfosavQBLinkState();
        return saved;
    }

    // ---- qB request ----
    async function sendToQB(dlUrl) {
        let qb = await getQBUrl();

        if (!qb) {
            showToast('Nincs beállítva qBittorrent URL. Beállítás…', 'error');
            qb = await promptForQBUrl();
            if (!qb) return;
        }

        if (typeof GM_xmlhttpRequest !== 'function') {
            showToast('GM_xmlhttpRequest nem elérhető ebben a userscript környezetben (iOS).', 'error', 5000);
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: qb + '/api/v2/torrents/add',
            data: 'urls=' + encodeURIComponent(dlUrl),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            onload: function (resp) {
                if (resp.status === 200) showToast('Torrent elküldve qBittorrentnek!', 'success');
                else showToast('Sikertelen: HTTP ' + resp.status, 'error');
            },
            onerror: function () {
                showToast('Hiba a qBittorrent felé küldés közben', 'error');
            },
        });
    }

    // ---- Inject qB link next to download link ----
    function injectQBLink(rootEl) {
        if (!rootEl) return;
        if (rootEl.querySelector && rootEl.querySelector('.qb-inline-link')) return;

        const dlA = rootEl.querySelector
            ? rootEl.querySelector('.letoltve_txt a[href*="torrents.php?action=download"]')
            : null;
        if (!dlA) return;

        const dlUrl = new URL(dlA.getAttribute('href'), window.location.origin).href;

        const sep = document.createElement('span');
        sep.textContent = ' | ';

        const qbA = document.createElement('a');
        qbA.href = 'javascript:void(0);';
        qbA.textContent = 'qBittorrent';
        qbA.className = 'qb-inline-link';
        qbA.addEventListener('click', () => {
            // async wrapper, de handler marad sync-safe
            sendToQB(dlUrl);
        });

        dlA.parentNode.insertBefore(sep, dlA.nextSibling);
        dlA.parentNode.insertBefore(qbA, sep.nextSibling);
    }

    // ---- Infosáv: [Prémium] után [qB URL] ----
    async function ensureInfosavQBLink() {
        const infosavAdatok = document.querySelector('#infosav_adatok');
        if (!infosavAdatok) return;

        if (document.querySelector('#qb-url-link')) {
            await refreshInfosavQBLinkState();
            return;
        }

        const qbLink = document.createElement('a');
        qbLink.id = 'qb-url-link';
        qbLink.href = 'javascript:void(0)';
        qbLink.textContent = 'qB URL';
        qbLink.style.textDecoration = 'none';
        qbLink.style.fontWeight = 'normal';
        qbLink.addEventListener('click', () => {
            promptForQBUrl();
        });

        const wrapper = document.createElement('span');
        // pontosan ilyen legyen: ... [Prémium] [qB URL]
        wrapper.appendChild(document.createTextNode(' ['));
        wrapper.appendChild(qbLink);
        wrapper.appendChild(document.createTextNode(']'));

        const premium = infosavAdatok.querySelector('a.premium[href*="/shop"]');

        if (premium) {
            // Keressük meg a premium blokk záró "]" szöveg-node-ot
            let n = premium.nextSibling;
            while (n && !(n.nodeType === Node.TEXT_NODE && n.nodeValue.includes(']'))) {
                n = n.nextSibling;
            }

            if (n && n.parentNode === infosavAdatok) {
                // Kell egy space a két blokk közé
                const space = document.createTextNode(' ');
                // a "]" szöveg-node UTÁN szúrunk:
                // insertBefore wrapper-t a n utáni node elé
                infosavAdatok.insertBefore(space, n.nextSibling);
                infosavAdatok.insertBefore(wrapper, space.nextSibling);
            } else {
                // fallback
                infosavAdatok.appendChild(document.createTextNode(' '));
                infosavAdatok.appendChild(wrapper);
            }
        } else {
            infosavAdatok.appendChild(document.createTextNode(' '));
            infosavAdatok.appendChild(wrapper);
        }

        await refreshInfosavQBLinkState();
    }

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

    // ---- init ----
    (function init() {
        // Fix search form method to GET
        const form = document.getElementById('kereses_mezo');
        if (form) form.method = 'GET';

        // infosáv link beszúrás (async)
        ensureInfosavQBLink();

        // DETAILS page button
        const alt = $('link[rel="alternate"]');
        const key = alt?.getAttribute('href')?.slice(-32) || '';

        if (window.location.search.includes('action=details')) {
            const params = new URLSearchParams(window.location.search);
            const torrentId = params.get('id');

            if (torrentId) {
                const container = document.querySelector('.torrent_reszletek_konyvjelzo');
                if (container && !container.querySelector('.qbittorrent-add-btn')) {
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
        }

        // LIST view: MutationObserver-based injection
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    injectQBLink(node);

                    const candidates = node.querySelectorAll
                        ? node.querySelectorAll(
                            '.torrent_lenyilo, .torrent_lenyilo_tartalom, .torrent_lenyilo_lehetoseg, .torrent_lenyilo_lab, .torrent_lenyilo_tartalom *'
                        )
                        : [];
                    for (const c of candidates) injectQBLink(c);
                }
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

        // initial scan
        injectQBLink(document);

        // infosáv re-render esetén újra
        const infosav = document.querySelector('#infosav');
        if (infosav) {
            const infosavObserver = new MutationObserver(() => {
                ensureInfosavQBLink();
            });
            infosavObserver.observe(infosav, { childList: true, subtree: true });
        }
    })();
})();