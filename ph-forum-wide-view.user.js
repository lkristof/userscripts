// ==UserScript==
// @name         Prohardver Fórum - Széles nézet
// @namespace    ph
// @version      1.2.1
// @description  Dinamikus széles nézet: képernyőszélesség -20%
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ---- Beállítások ----
    const LEFT_PX = 230;
    const RIGHT_PX = 230;
    const GAP_PX = 0;
    const SIDE_MARGIN_RATIO = 0.20;
    const MIN_CENTER_PX = 710;

    const STYLE_ID = 'ph-wide-center-style';
    const ROW_CLASS = 'ph-center-row';

    const STORAGE_KEY = 'ph_wide_view';
    const STATUS = { ON: 'enabled', OFF: 'disabled' };

    // ---- Számítás ----
    function calculateLayout() {
        const viewport = window.innerWidth;
        const usable = Math.floor(viewport * (1 - SIDE_MARGIN_RATIO));
        const center = Math.max(
            MIN_CENTER_PX,
            usable - LEFT_PX - RIGHT_PX - (2 * GAP_PX)
        );

        return {
            total: LEFT_PX + center + RIGHT_PX + (2 * GAP_PX),
            center
        };
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
            overflow-x: auto !important;
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
        obs.observe(document.documentElement, { childList: true, subtree: true });
    }

    init();
})();
