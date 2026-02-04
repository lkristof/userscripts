// ==UserScript==
// @name         Prohardver Fórum - Széles nézet
// @namespace    ph
// @version      1.1.0
// @description  Megszélesíti a fórum nézetet, Full HD felbontás mellett ajánlott
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ---- Testreszabható paraméterek ----
    const LEFT_PX = 260;
    const CENTER_PX = 1100;
    const RIGHT_PX = 260;
    const GAP_PX = 0;
    const STYLE_ID = 'ph-wide-center-style';
    const ROW_CLASS = 'ph-center-row';

    const STORAGE_KEY = 'ph_wide_view';
    const STATUS = { ON: 'enabled', OFF: 'disabled' };

    // ---- Segédfüggvények ----
    const totalWidth = () => LEFT_PX + CENTER_PX + RIGHT_PX + (2 * GAP_PX);

    function buildCSS() {
        const TOTAL = totalWidth();
        return `
      .container, .container-fluid, #container, .site-container {
        max-width: ${TOTAL}px !important;
        width: ${TOTAL}px !important;
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
        min-width: ${LEFT_PX}px !important;
        max-width: ${LEFT_PX}px !important;
        flex: 0 0 ${LEFT_PX}px !important;
      }
      #center {
        width: ${CENTER_PX}px !important;
        min-width: ${CENTER_PX}px !important;
        max-width: ${CENTER_PX}px !important;
        flex: 0 0 ${CENTER_PX}px !important;
        overflow-x: auto !important;
      }
      #right {
        width: ${RIGHT_PX}px !important;
        min-width: ${RIGHT_PX}px !important;
        max-width: ${RIGHT_PX}px !important;
        flex: 0 0 ${RIGHT_PX}px !important;
      }

      #left[class*="col-"]   { flex: 0 0 ${LEFT_PX}px !important;   width: ${LEFT_PX}px !important; }
      #center[class*="col-"] { flex: 0 0 ${CENTER_PX}px !important; width: ${CENTER_PX}px !important; }
      #right[class*="col-"]  { flex: 0 0 ${RIGHT_PX}px !important;  width: ${RIGHT_PX}px !important; }
    `;
    }

    function getCenterRow() {
        const center = document.querySelector('#center');
        return center ? center.closest('.row') : null;
    }

    function saveState(active) {
        localStorage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
    }

    function shouldBeActive() {
        return localStorage.getItem(STORAGE_KEY) === STATUS.ON;
    }

    function applyLayout() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = buildCSS();
            document.documentElement.appendChild(style);
        }
        const row = getCenterRow();
        if (row && !row.classList.contains(ROW_CLASS)) {
            row.classList.add(ROW_CLASS);
        }
    }

    function removeLayout() {
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
        const row = getCenterRow();
        if (row && row.classList.contains(ROW_CLASS)) {
            row.classList.remove(ROW_CLASS);
        }
    }

    function isActive() {
        return !!document.getElementById(STYLE_ID);
    }

    function insertButton() {
        const toolbar = document.querySelector('h4.list-message');
        const center = document.querySelector('#center');
        if (!toolbar || !center) return false;

        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.userSelect = 'none';
        btn.style.marginLeft = '5px';

        const spanIcon = document.createElement('span');
        spanIcon.className = 'fas fa-expand-arrows-alt fa-fw';
        btn.appendChild(spanIcon);
        btn.appendChild(document.createTextNode(' Széles nézet'));

        const updateUI = () => {
            btn.title = isActive() ? 'Eredeti szélesség' : 'Szélesebb nézet';
            if (isActive()) btn.classList.add('btn-primary');
            else btn.classList.remove('btn-primary');
        };

        btn.addEventListener('click', () => {
            if (isActive()) {
                removeLayout();
                saveState(false);
            } else {
                applyLayout();
                saveState(true);
            }
            updateUI();
        });

        toolbar.appendChild(btn);

        // --- Kezdeti állapot aktiválása, ha mentve volt ---
        if (shouldBeActive()) {
            applyLayout();
        }
        updateUI();

        return true;
    }

    function init() {
        return insertButton();
    }

    if (!init()) {
        const obs = new MutationObserver(() => {
            if (init()) obs.disconnect();
        });
        obs.observe(document.documentElement, {childList: true, subtree: true});
    }
})();
