// ==UserScript==
// @name         nCore – qBittorrent Add
// @namespace    https://github.com/lkristof/userscripts
// @version      1.2.1
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
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    let QB_URL = GM_getValue('qb_url', '');

    const askForQBURL = () => {
        const userInput = window.prompt(
            'Enter qBittorrent WebUI URL (e.g., http://127.0.0.1:8080):',
            QB_URL || 'http://127.0.0.1:8080'
        ) || '';

        try {
            QB_URL = new URL(userInput).origin;
            if (QB_URL) GM_setValue('qb_url', QB_URL);
        } catch(e) {
            console.warn('Invalid URL entered for qBittorrent WebUI');
            QB_URL = '';
        }
    };

    if (!QB_URL) askForQBURL();

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('Set qBittorrent WebUI URL', askForQBURL);
    }

    function sendToQB(dlUrl) {
        if (!QB_URL) {
            showToast("qBittorrent WebUI URL not set!", "error");
            return;
        }

        GM_xmlhttpRequest({
            method: "POST",
            url: QB_URL + "/api/v2/torrents/add",
            data: "urls=" + encodeURIComponent(dlUrl),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },

            onload: function(resp) {
                if (resp.status === 200) {
                    showToast("Torrent sent to qBittorrent!", "success");
                } else {
                    showToast("Failed: " + resp.status, "error");
                }
            },

            onerror: function() {
                showToast("Error sending torrent to qBittorrent", "error");
            }
        });
    }


    const key = $("link[rel=alternate]").attr("href")?.slice(-32) || '';

    const form = $('#kereses_mezo')[0];
    if (form) form.method = 'GET';

    // ============================================================
    // LISTA NÉZET
    // ============================================================
    unsafeWindow.torrent = function(id) {
        const $e = $('#' + id);
        if (!$e.length) return;

        const loadingHtml = `
            <div class="torrent_lenyilo_lehetoseg">
                <div class="lehetosegek">Lehetőségeid:</div>
                <div class="letoltve">
                    <a href="torrents.php?action=download&id=${id}&key=${key}">
                        <img src="data:image/gif;base64,R0lGODlhDwAPAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAAPAA8AAAINlI+py+0Po5y02otnAQA7" class="torr_reszletek_btn">
                    </a>
                </div>
                <div class="letoltve_txt">
                    <a href="torrents.php?action=download&id=${id}&key=${key}">Letöltés</a>
                </div>
            </div>
            <div class="torrent_lenyilo_tartalom">
                <div style="margin:10px 0;text-align:center">
                    <img src="https://static.ncore.pro/styles/ajax.gif" title="Töltés...">
                </div>
            </div>
            <div class="torrent_lenyilo_lab"></div>
        `;

        if (!$e.html() || $e.html() === loadingHtml) {
            $e.html(loadingHtml).toggle(0);

            $.get(`ajax.php?action=torrent_drop&id=${id}`, function(data) {
                const cleanData = data
                    .replace(/<center><div class="banner[\s\S]*?<\/center>/gi, '')
                    .replace(/<div class="hr_stuff"><\/div>/gi, '');

                $e.html(cleanData);

                if (typeof BannerEventHandler !== 'undefined') {
                    BannerEventHandler.init();
                }

                const $imgs = $e.find('.fancy_groups');
                if ($imgs.length && typeof $imgs.fancybox === 'function') {
                    $imgs.fancybox({
                        onStart: typeof disableKeys === 'function' ? disableKeys : undefined,
                        onClosed: typeof enableKeys === 'function' ? enableKeys : undefined,
                        type: 'image'
                    });
                }

                const $dlLink = $e.find('.letoltve_txt a[href*="torrents.php?action=download"]');

                if ($dlLink.length) {
                    const dlUrl = new URL($dlLink.attr('href'), window.location.origin).href;

                    const $separator = $('<span> | </span>');
                    const $qbLink = $('<a href="javascript:void(0);">qBittorrent</a>');

                    $qbLink.on('click', function() {
                        sendToQB(dlUrl);
                    });

                    $dlLink.after($qbLink).after($separator);
                }
            });
        } else {
            $e.toggle(0);
        }
    };

    // ============================================================
    // DETAILS OLDAL
    // ============================================================
    if (window.location.search.includes('action=details')) {
        const params = new URLSearchParams(window.location.search);
        const torrentId = params.get('id');

        if (torrentId) {
            const $container = $('.torrent_reszletek_konyvjelzo');
            if ($container.length && !$container.find('.qbittorrent-add-btn').length) {
                const dlUrl = `${window.location.origin}/torrents.php?action=download&id=${torrentId}&key=${key}`;

                const $qbLink = $(`
                    <a style="font-weight:normal;"
                       href="javascript:void(0);"
                       class="qbittorrent-add-btn"
                       title="Küldés qBittorrentbe">
                       [qBittorrent]
                    </a>
                `);

                $qbLink.on('click', function() {
                    sendToQB(dlUrl);
                });

                $container.append($qbLink);
            }
        }
    }

    // ============================================================
    // STACKELT TOAST RENDSZER
    // ============================================================

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
                zIndex: 99999
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        });

        container.appendChild(toast);

        // animáció be
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // max 5 toast
        if (container.children.length > 5) {
            container.removeChild(container.firstChild);
        }

        // eltűnés 3 mp után
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
})();
