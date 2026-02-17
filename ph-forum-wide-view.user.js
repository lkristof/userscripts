// ==UserScript==
// @name         Prohardver Fórum – Széles nézet
// @namespace    https://github.com/lkristof/userscripts
// @version      1.2.5
// @description  Dinamikus széles nézet (ablakméret -20%).
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-wide-view.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-wide-view.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

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

})();
