// ==UserScript==
// @name         Prohardver Fórum – OFF hozzászólások elrejtése
// @namespace    https://github.com/lkristof/userscripts
// @version      1.3.0
// @description  Elrejti az OFF jelölésű hozzászólásokat.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-off-hider.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-off-hider.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');
    style.innerHTML = `
        .off-post-animate {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
            overflow: hidden !important;
            display: block !important;
        }
        .off-post-hidden {
            opacity: 0 !important;
            max-height: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            border-top-width: 0 !important;
            border-bottom-width: 0 !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);

    const STORAGE_KEY = "ph_hide_off";
    const STATUS = { ON: 'enabled', OFF: 'disabled' };

    let offHidden = localStorage.getItem(STORAGE_KEY) === STATUS.ON;
    const buttons = [];

    function getOffPosts() {
        return Array.from(document.querySelectorAll('.msg, .topic, .msg-off')).filter(post =>
            post.textContent.includes('[OFF]') || post.classList.contains('msg-off')
        );
    }

    function applyVisibility(isInitial = false) {
        getOffPosts().forEach(post => {
            if (offHidden) {
                if (isInitial) {
                    post.style.display = 'none';
                    post.classList.add('off-post-hidden');
                } else {
                    // Elrejtés animációval
                    post.style.maxHeight = post.scrollHeight + "px";
                    post.classList.add('off-post-animate');
                    requestAnimationFrame(() => {
                        post.classList.add('off-post-hidden');
                    });
                }
            } else {
                // Megjelenítés animációval
                if (isInitial) {
                    post.style.display = '';
                    post.classList.remove('off-post-hidden');
                } else {
                    if (post.style.display === 'none') {
                        post.style.display = '';
                    }
                    post.classList.add('off-post-animate');
                    // Kiszámoljuk a célmagasságot
                    const targetHeight = post.scrollHeight;

                    requestAnimationFrame(() => {
                        post.classList.remove('off-post-hidden');
                        post.style.maxHeight = targetHeight + "px";
                    });

                    // Tisztítás az animáció végén
                    setTimeout(() => {
                        if (!offHidden) {
                            post.classList.remove('off-post-animate');
                            post.style.maxHeight = '';
                        }
                    }, 500);
                }
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

    applyVisibility(true);
    updateAllButtons();
})();
