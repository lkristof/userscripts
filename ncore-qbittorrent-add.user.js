// ==UserScript==
// @name         nCore – qBittorrent Add
// @namespace    ncore
// @version      1.1.0
// @description  Override torrent() to add qBittorrent button and remove ads
// @include      https://ncore.pro/torrents.php*
// @exclude      https://ncore.pro/torrents.php?action*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // --- qBittorrent URL init ---
    let QB_URL = GM_getValue('qb_url', '');
    const askForQBURL = () => {
        const userInput = window.prompt('Enter qBittorrent WebUI URL (e.g., http://127.0.0.1:8080):', QB_URL || 'http://127.0.0.1:8080') || '';
        try {
            QB_URL = new URL(userInput).origin;
            if (QB_URL) GM_setValue('qb_url', QB_URL);
        } catch(e) {
            console.warn('Invalid URL entered for qBittorrent WebUI');
            QB_URL = '';
        }
    };

    if (!QB_URL) askForQBURL();

    // --- Menüpont a QB URL módosításához ---
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('Set qBittorrent WebUI URL', askForQBURL);
    }

    const key = $("link[rel=alternate]").attr("href")?.slice(-32) || '';

    const form = $('#kereses_mezo')[0];
    if (form) form.method = 'GET';

    // --- Torrent override ---
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

                // banner + fancybox újrainit
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
                if ($dlLink.length && QB_URL) {
                    const dlUrl = new URL($dlLink.attr('href'), window.location.origin).href;
                    const $separator = $('<span> | </span>');
                    const $qbLink = $('<a href="javascript:void(0);">qBittorrent</a>');

                    $qbLink.on('click', function() {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: QB_URL + "/api/v2/torrents/add",
                            data: "urls=" + encodeURIComponent(dlUrl),
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            onload: function(resp) {
                                alert(resp.status === 200 ? "Torrent sent to qBittorrent!" : "Failed: " + resp.status);
                            },
                            onerror: function() {
                                alert("Error sending torrent to qBittorrent");
                            }
                        });
                    });

                    $dlLink.after($qbLink).after($separator);
                }
            });
        } else {
            $e.toggle(0);
        }
    };
})();
