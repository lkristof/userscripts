// ==UserScript==
// @name         Prohardver Fórum – Thread nézet
// @namespace    https://github.com/lkristof/userscripts
// @version      1.5.0
// @description  Reddit-style thread megjelenítés.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-thread-view.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-thread-view.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const INDENT       = 10;
    const LINE_COLOR   = "#C1BFB6";
    const LINE_OPACITY = 1;
    const LINE_THICK   = 1;
    const STORAGE_KEY  = 'ph_thread_view';
    const STATUS       = { ON: 'enabled', OFF: 'disabled' };

    let threadContainerHeader = null;
    let threadActive = false;
    const buttons = [];

    const style = document.createElement('style');
    style.textContent = `
        li.media {
            transition: transform 300ms ease, opacity 200ms ease;
            will-change: transform;
        }
        li.media.ph-thread {
            position: relative;
        }
        .thread-lines {
            position: absolute;
            top: 0;
            bottom: 0;
            pointer-events: none;
            left: calc(-1 * var(--indent));
        }
        .thread-line-vert {
            position: absolute;
            top: 0;
            bottom: 0;
            width: ${LINE_THICK}px;
            background: ${LINE_COLOR};
            opacity: ${LINE_OPACITY};
            border-radius: ${LINE_THICK}px;
        }
        .thread-line-horiz {
            position: absolute;
            top: 0;
            left: 0;
            width: ${INDENT}px;
            height: 50%;
            border-left: ${LINE_THICK}px solid ${LINE_COLOR};
            border-bottom: ${LINE_THICK}px solid ${LINE_COLOR};
            border-bottom-left-radius: ${INDENT}px;
            opacity: ${LINE_OPACITY};
            box-sizing: border-box;
        }
    `;
    document.head.appendChild(style);

    function saveState(active) {
        localStorage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
    }

    function shouldBeActive() {
        return localStorage.getItem(STORAGE_KEY) === STATUS.ON;
    }

    function renderThreading() {
        if (threadActive) return;
        if (!threadContainerHeader) return;

        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        // Adatgyűjtés
        const allMedia = [...ul.querySelectorAll('li.media')];
        const items = allMedia.filter(li => li.dataset.id);

        if (!items.length) return;

        const postMap = {}, childrenMap = {}, allIds = new Set();
        items.forEach(li => {
            allIds.add(li.dataset.id);
            postMap[li.dataset.id] = li;
        });

        items.forEach(li => {
            const id = li.dataset.id;
            let parent = li.dataset.rplid || null;
            if (parent && !allIds.has(parent)) parent = null;
            if (!childrenMap[parent]) childrenMap[parent] = [];
            childrenMap[parent].push(id);
        });

        // Ürítés és újraépítés
        animateReorder(ul, () => {
            ul.innerHTML = '';
            (childrenMap[null] || []).forEach(id =>
                renderThread(id, 0, [])
            );
        });

        // Rekurzív renderelő
        function renderThread(id, depth, ancestorPath = []) {
            const el = postMap[id];
            if (!el) return;

            el.classList.add('ph-thread');
            const currentIndent = depth * INDENT;
            el.style.setProperty('--indent', currentIndent + 'px');
            el.style.marginLeft = currentIndent + 'px';

            if (depth > 0) {
                let box = el.querySelector('.thread-lines');
                if (!box) {
                    box = document.createElement('div');
                    box.className = 'thread-lines';
                    el.appendChild(box);
                }
                box.innerHTML = '';

                for (let d = 0; d < depth - 1; d++) {
                    if (ancestorPath[d]) continue;
                    const vert = document.createElement('div');
                    vert.className = 'thread-line-vert';
                    vert.style.left = (d * INDENT) + 'px';
                    box.appendChild(vert);
                }

                if (!ancestorPath[depth - 1]) {
                    const vert = document.createElement('div');
                    vert.className = 'thread-line-vert';
                    vert.style.left = ((depth - 1) * INDENT) + 'px';
                    box.appendChild(vert);
                }

                // Könyök az aktuális elemhez
                const elbow = document.createElement('div');
                elbow.className = 'thread-line-horiz';
                elbow.style.left = ((depth - 1) * INDENT) + 'px';
                box.appendChild(elbow);
            }

            ul.appendChild(el);

            const children = childrenMap[id] || [];
            children.forEach((childId, i) => {
                const isLastChild = (i === children.length - 1);
                renderThread(childId, depth + 1, [...ancestorPath, isLastChild]);
            });
        }

        // Indítás a gyökér szintű elemekkel
        (childrenMap[null] || []).forEach(id => renderThread(id, 0, []));

        threadActive = true;
        saveState(true);
    }

    let originalOrder = [];

    function initOriginalOrder() {
        if (!threadContainerHeader) return;
        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        originalOrder = [...ul.querySelectorAll('li.media')];
    }

    function restoreOriginalOrder() {
        if (!threadContainerHeader) return;

        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        // A teljes folyamatot az animateReorder-re bízzuk
        animateReorder(ul, () => {
            // 1. Töröljük a threading-hez kapcsolódó stílusokat és elemeket
            originalOrder.forEach(li => {
                li.classList.remove('ph-thread');
                li.style.marginLeft = '';
                li.style.setProperty('--indent', '0px');
                const box = li.querySelector('.thread-lines');
                if (box) box.remove();
            });

            // 2. Visszahelyezzük őket az eredeti sorrendbe
            ul.innerHTML = '';
            originalOrder.forEach(li => ul.appendChild(li));
        });

        threadActive = false;
        saveState(false);
    }

    function createToggleButton() {
        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.marginLeft = '5px';
        btn.innerHTML = `<span class="fas fa-project-diagram fa-fw"></span> Thread nézet`;

        function updateButtonUI() {
            btn.classList.toggle('btn-primary', threadActive);
            btn.title = threadActive ? 'Thread nézet kikapcsolása' : 'Thread nézet bekapcsolása';
        }

        btn.addEventListener('click', e => {
            e.preventDefault();
            if (threadActive) restoreOriginalOrder();
            else renderThreading();
            updateAllButtons();
        });

        btn._update = updateButtonUI;
        updateButtonUI();

        return btn;
    }

    function updateAllButtons() {
        buttons.forEach(btn => btn._update());
    }

    function init() {
        const headers = document.querySelectorAll('h4.list-message');
        if (!headers.length || buttons.length > 0) return false;

        threadContainerHeader = headers[0];
        initOriginalOrder();

        headers.forEach(header => {
            const btn = createToggleButton();
            buttons.push(btn);
            header.appendChild(btn);
        });

        if (shouldBeActive()) {
            renderThreading();
            updateAllButtons();
        }

        return true;
    }

    function animateReorder(ul, reorderFn) {
        const items = [...ul.querySelectorAll('li.media')];

        // FIRST – pozíció mentése
        const firstRects = new Map();
        items.forEach(el => {
            firstRects.set(el, el.getBoundingClientRect());
            // Ideiglenesen kikapcsoljuk az átmenetet, hogy ne zavarja a mérést
            el.style.transition = 'none';
        });

        // DOM átrendezés (ezt te adod át a reorderFn-ben)
        reorderFn();

        // LAST – új pozíció
        items.forEach(el => {
            const first = firstRects.get(el);
            const last = el.getBoundingClientRect();

            const dx = first.left - last.left;
            const dy = first.top  - last.top;

            if (dx || dy) {
                el.style.transform = `translate(${dx}px, ${dy}px)`;
            }
        });

        // PLAY – kényszerített reflow után visszaengedjük az animációt
        requestAnimationFrame(() => {
            items.forEach(el => {
                // Visszaadjuk a CSS-ben definiált transition-t
                el.style.transition = '';
                el.style.transform = '';
            });
        });
    }

    if (!init()) {
        const observer = new MutationObserver(() => {
            if (init()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
