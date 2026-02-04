// ==UserScript==
// @name         Prohardver Fórum – Thread nézet
// @namespace    ph
// @version      1.2.0
// @description  Reddit-style thread elrendezés
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ===== Beállítások ===== */
    const INDENT       = 10;
    const LINE_COLOR   = "#C1BFB6";
    const LINE_OPACITY = 1;
    const LINE_THICK   = 1;
    const PINNED_TEXT  = '(rögzített hozzászólás)';

    let threadContainerHeader = null;
    let threadActive = false;
    let originalHTML = '';

    /* ===== CSS ===== */
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

    /* ===== Thread render ===== */
    function renderThreading() {
        if (!threadContainerHeader) return;

        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        if (!threadActive) originalHTML = ul.innerHTML;

        const pinned = [...ul.querySelectorAll('li.media')]
            .find(li => li.textContent.includes(PINNED_TEXT));
        const pinnedNext = pinned?.nextSibling;

        const items = [...ul.querySelectorAll('li.media[data-id]')]
            .filter(li => li !== pinned);

        if (!items.length) return;

        const postMap = {};
        const childrenMap = {};
        const allIds = new Set();

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
    }

    /* ===== Reset ===== */
    function restoreOriginalHTML() {
        if (!threadContainerHeader || !originalHTML) return;

        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        ul.innerHTML = originalHTML;
        threadActive = false;
    }

    /* ===== Enhanced toggle button ===== */
    function addThreadButton() {
        const container = document.querySelector('h4.list-message');
        if (!container) return;

        threadContainerHeader = container;

        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.marginLeft = '5px';
        btn.id = 'ph-thread-toggle';
        btn.innerHTML = `<span class="fas fa-project-diagram fa-fw"></span> Thread nézet`;

        function updateAppearance() {
            if (threadActive) {
                btn.classList.add('btn-primary');
                btn.title = 'Thread nézet kikapcsolása';
            } else {
                btn.classList.remove('btn-primary');
                btn.title = 'Thread nézet bekapcsolása';
            }
        }

        updateAppearance();

        btn.addEventListener('click', () => {
            if (threadActive) restoreOriginalHTML();
            else renderThreading();

            updateAppearance();
        });

        container.appendChild(btn);
    }

    addThreadButton();

})();
