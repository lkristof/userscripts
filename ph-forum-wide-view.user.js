// ==UserScript==
// @name         Prohardver Fórum - Széles nézet
// @namespace    ph
// @version      1.0.0
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

    // ---- Segédfüggvények ----
    const totalWidth = () => LEFT_PX + CENTER_PX + RIGHT_PX + (2 * GAP_PX);

    function buildCSS() {
        const TOTAL = totalWidth();
        return `
      /* A fő wrapper pontosan akkora legyen, mint a három oszlop együtt – és legyen középen */
      .container, .container-fluid, #container, .site-container {
        max-width: ${TOTAL}px !important;
        width: ${TOTAL}px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      /* Csak azt a sort igazítjuk középre, amelyik a #center-t tartalmazza */
      .${ROW_CLASS} {
        display: flex !important;
        flex-wrap: nowrap !important;
        justify-content: center !important; /* vízszintesen középre */
        gap: ${GAP_PX}px !important;
        margin-left: 0 !important;  /* bootstrap negatív margók kiiktatása ennél a sornál */
        margin-right: 0 !important;
      }

      /* Fix pixeles szélességek */
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
        overflow-x: auto !important; /* ha valami szélesebb, ne törjön, hanem görgessen vízszintesen */
      }
      #right {
        width: ${RIGHT_PX}px !important;
        min-width: ${RIGHT_PX}px !important;
        max-width: ${RIGHT_PX}px !important;
        flex: 0 0 ${RIGHT_PX}px !important;
      }

      /* Ha col-* osztályok százalékot kényszerítenek, írjuk felül csak ezeken az elemeken */
      #left[class*="col-"]   { flex: 0 0 ${LEFT_PX}px !important;   width: ${LEFT_PX}px !important; }
      #center[class*="col-"] { flex: 0 0 ${CENTER_PX}px !important; width: ${CENTER_PX}px !important; }
      #right[class*="col-"]  { flex: 0 0 ${RIGHT_PX}px !important;  width: ${RIGHT_PX}px !important; }
    `;
    }

    function getCenterRow() {
        const center = document.querySelector('#center');
        return center ? center.closest('.row') : null;
    }

    function applyLayout() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = buildCSS();
            document.documentElement.appendChild(style);
        } else {
            const style = document.getElementById(STYLE_ID);
            style.textContent = buildCSS();
        }

        const row = getCenterRow();
        if (row && !row.classList.contains(ROW_CLASS)) {
            row.classList.add(ROW_CLASS);
        }
    }

    function removeLayout() {
        // 1) Stílus eltávolítása
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();

        // 2) Címke levétele a soról
        const row = getCenterRow();
        if (row && row.classList.contains(ROW_CLASS)) {
            row.classList.remove(ROW_CLASS);
        }
    }

    function isActive() {
        return !!document.getElementById(STYLE_ID);
    }

    // ---- Gomb beszúrása a megadott gombsorba ----
    function insertButton() {
        const toolbar = document.querySelector('h4.list-message');
        if (!toolbar) return false;

        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.userSelect = 'none';

        const spanIcon = document.createElement('span');
        spanIcon.className = 'fas fa-expand-arrows-alt fa-fw'; // egy „széthúzás” ikon
        btn.appendChild(spanIcon);
        btn.appendChild(document.createTextNode(' Széles nézet'));

        const setLabel = () => {
            btn.title = isActive()
                ? 'Vissza az eredeti szélességre'
                : 'Szélesebb nézet bekapcsolása';
            if (isActive()) {
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-primary');
            }
        };
        setLabel();

        btn.addEventListener('click', () => {
            if (isActive()) {
                removeLayout();
            } else {
                applyLayout();
            }
            setLabel();
        });

        toolbar.appendChild(btn);
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
