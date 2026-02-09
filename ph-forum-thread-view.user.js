// ==UserScript==
// @name         Prohardver Fórum – Thread nézet
// @namespace    ph
// @version      1.4.4
// @description  Reddit-style thread megjelenítés.
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const INDENT       = 10;
    const LINE_COLOR   = "#C1BFB6";
    const LINE_OPACITY = 1;
    const LINE_THICK   = 1;
    const PINNED_TEXT  = '(rögzített hozzászólás)';
    const STORAGE_KEY  = 'ph_thread_view';
    const STATUS       = { ON: 'enabled', OFF: 'disabled' };

    let threadContainerHeader = null;
    let threadActive = false;
    const buttons = [];

    const style = document.createElement('style');
    style.textContent = `
    li.media.ph-thread { position: relative; }

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
        if (!threadContainerHeader) return;

        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        const pinned = [...ul.querySelectorAll('li.media')]
            .find(li => li.textContent.includes(PINNED_TEXT));
        const pinnedNext = pinned?.nextSibling;

        const items = [...ul.querySelectorAll('li.media[data-id]')]
            .filter(li => li !== pinned);

        if (!items.length) return;

        const postMap = {}, childrenMap = {}, allIds = new Set();
        items.forEach(li => allIds.add(li.dataset.id));
        items.forEach(li => {
            const id = li.dataset.id;
            let parent = li.dataset.rplid || null;
            if (parent && !allIds.has(parent)) parent = null;
            postMap[id] = li;
            if (!childrenMap[parent]) childrenMap[parent] = [];
            childrenMap[parent].push(id);
        });

        ul.innerHTML = '';
        if (pinned) {
            if (pinnedNext) ul.insertBefore(pinned, pinnedNext);
            else ul.appendChild(pinned);
        }

        function renderThread(id, depth, ancestorPath = []) {
            const el = postMap[id];
            if (!el) return;

            el.classList.add('ph-thread');
            const indent = depth * INDENT;
            el.style.setProperty('--indent', indent + 'px');
            el.style.marginLeft = indent + 'px';

            if (depth === 0) {
                ul.appendChild(el);
                (childrenMap[id] || []).forEach((childId, i, arr) => {
                    renderThread(childId, 1, [i === arr.length - 1]);
                });
                return;
            }

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

            const elbow = document.createElement('div');
            elbow.className = 'thread-line-horiz';
            elbow.style.left = ((depth - 1) * INDENT) + 'px';
            box.appendChild(elbow);

            ul.appendChild(el);

            (childrenMap[id] || []).forEach((childId, i, arr) => {
                renderThread(childId, depth + 1, [...ancestorPath, i === arr.length - 1]);
            });
        }

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

        ul.querySelectorAll('li.media.ph-thread').forEach(li => {
            li.classList.remove('ph-thread');
            li.style.marginLeft = '';
            const box = li.querySelector('.thread-lines');
            if (box) li.removeChild(box);
        });

        originalOrder.forEach(li => ul.appendChild(li));

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
        if (!headers.length) return false;

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

    if (!init()) {
        const observer = new MutationObserver(() => {
            if (init()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

})();
