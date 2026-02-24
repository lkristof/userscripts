// ==UserScript==
// @name         nCore – qBittorrent Add
// @namespace    https://github.com/lkristof/userscripts
// @version      1.2.2
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
// ==/UserScript==

(function () {
    'use strict';

    // qB config
    const QB_URL = ''; // eg: http://127.0.0.1:8080

    const $ = (sel, root = document) => root.querySelector(sel);

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

    function showToast(message, type = 'success') {
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.textContent = message;

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
        }, 3000);
    }

    function sendToQB(dlUrl) {
        GM_xmlhttpRequest({
            method: 'POST',
            url: QB_URL + '/api/v2/torrents/add',
            data: 'urls=' + encodeURIComponent(dlUrl),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            onload: function (resp) {
                if (resp.status === 200) showToast('Torrent sent to qBittorrent!', 'success');
                else showToast('Failed: ' + resp.status, 'error');
            },
            onerror: function () {
                showToast('Error sending torrent to qBittorrent', 'error');
            },
        });
    }

    // Insert qB link next to the download link inside a given container element
    function injectQBLink(rootEl) {
        if (!rootEl) return;

        // already injected?
        if (rootEl.querySelector('.qb-inline-link')) return;

        const dlA = rootEl.querySelector('.letoltve_txt a[href*="torrents.php?action=download"]');
        if (!dlA) return;

        const dlUrl = new URL(dlA.getAttribute('href'), window.location.origin).href;

        const sep = document.createElement('span');
        sep.textContent = ' | ';

        const qbA = document.createElement('a');
        qbA.href = 'javascript:void(0);';
        qbA.textContent = 'qBittorrent';
        qbA.className = 'qb-inline-link';
        qbA.addEventListener('click', () => sendToQB(dlUrl));

        dlA.parentNode.insertBefore(sep, dlA.nextSibling);
        dlA.parentNode.insertBefore(qbA, sep.nextSibling);
    }

    (function init() {
        // Fix search form method to GET
        const form = document.getElementById('kereses_mezo');
        if (form) form.method = 'GET';

        // DETAILS page button (your original, working)
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

        // LIST view: MutationObserver-based injection (works even if torrent() override fails)
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    // Case 1: the added node itself contains the download link area
                    injectQBLink(node);

                    // Case 2: a parent wrapper added; scan inside quickly
                    const candidates = node.querySelectorAll
                        ? node.querySelectorAll('.torrent_lenyilo, .torrent_lenyilo_tartalom, .torrent_lenyilo_lehetoseg, .torrent_lenyilo_lab, .torrent_lenyilo_tartalom *')
                        : [];
                    for (const c of candidates) injectQBLink(c);
                }
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

        // Also do an initial scan in case something is already open
        injectQBLink(document);

    })();
})();