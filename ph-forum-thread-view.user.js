// ==UserScript==
// @name         Prohardver Fórum – Thread nézet
// @namespace    ph
// @version      1.4.1
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

    /* ===== Beállítások ===== */
    const INDENT       = 10;
    const LINE_COLOR   = "#C1BFB6";
    const LINE_OPACITY = 1;
    const LINE_THICK   = 1;
    const PINNED_TEXT  = '(rögzített hozzászólás)';
    const STORAGE_KEY  = 'ph_thread_view'; // A kért kulcs
    const STATUS       = { ON: 'enabled', OFF: 'disabled' }; // Új konstans

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

    /* ===== Mentés és Betöltés ===== */
    function saveState(active) {
        localStorage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
    }

    function shouldBeActive() {
        return localStorage.getItem(STORAGE_KEY) === STATUS.ON;
    }

    /* ===== Thread render ===== */
    function renderThreading() {
        if (!threadContainerHeader) return;

        let ul = threadContainerHeader.nextElementSibling;
        while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
            ul = ul.nextElementSibling;
        }
        if (!ul) return;

        // Csak akkor mentsük el az eredetit, ha még nem aktív a nézet
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
        saveState(true);
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
        saveState(false);
    }

    /* ===== Toggle gomb és inicializálás ===== */
    function init() {
        const container = document.querySelector('h4.list-message');
        if (!container) return false;

        threadContainerHeader = container;

        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.marginLeft = '5px';
        btn.id = 'ph-thread-toggle';
        btn.innerHTML = `<span class="fas fa-project-diagram fa-fw"></span> Thread nézet`;

        function updateButtonUI() {
            if (threadActive) {
                btn.classList.add('btn-primary');
                btn.title = 'Thread nézet kikapcsolása';
            } else {
                btn.classList.remove('btn-primary');
                btn.title = 'Thread nézet bekapcsolása';
            }
        }

        btn.addEventListener('click', () => {
            if (threadActive) restoreOriginalHTML();
            else renderThreading();
            updateButtonUI();
        });

        container.appendChild(btn);

        // --- Automatikus aktiválás, ha el volt mentve ---
        if (shouldBeActive()) {
            renderThreading();
            updateButtonUI();
        }

        initKeyboardNavigation();

        return true;
    }

    /* ===== Billentyűzetes navigáció ===== */
    function initKeyboardNavigation() {
        function getMinMaxPostId() {
            const posts = getPosts();
            const ids = posts.map(p => parseInt(p.dataset.id, 10));
            const min = Math.min(...ids);
            const max = Math.max(...ids);
            return { min, max };
        }

        function getPosts() {
            return [...document.querySelectorAll('li.media[data-id]')];
        }

        function getCurrentIndex(posts) {
            const hash = location.hash.replace('#msg', '');
            return posts.findIndex(li => li.dataset.id === hash);
        }

        function jumpToIndex(posts, index) {
            if (index < 0 || index >= posts.length) return;
            location.hash = '#msg' + posts[index].dataset.id;
        }

        function getMsgIdFromHash() {
            const m = location.hash.match(/^#msg(\d+)$/);
            return m ? parseInt(m[1], 10) : null;
        }

        function setMsgId(id) {
            if (id < 0) return;
            location.hash = '#msg' + id;
        }

        document.addEventListener('keydown', (e) => {
            // --- ha layer-gallery aktív, nincs navigáció ---
            const gallery = document.querySelector('.layer-gallery');
            if (gallery) return;

            const active = document.activeElement;
            if (
                !active ||
                active.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
            ) return;

            const posts = getPosts();
            if (!posts.length) return;

            let currentIndex = getCurrentIndex(posts);
            if (currentIndex === -1) currentIndex = 0;

            const current = posts[currentIndex];
            const currentId = current.dataset.id;

            /* ===== SHIFT: thread logika ===== */
            // --- SHIFT + ↑ / ↓ : URL msg id +/- 1 ---
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                const currentId = getMsgIdFromHash();
                if (currentId === null) return;

                const { min, max } = getMinMaxPostId();

                e.preventDefault();

                let newId = currentId + (e.key === 'ArrowUp' ? -1 : 1);

                // határok ellenőrzése
                if (newId < min) newId = min;
                if (newId > max) newId = max;

                setMsgId(newId);
                return;
            }


            /* ===== ALAP: lineáris navigáció ===== */
            switch (e.key) {
                case 'ArrowUp': // előző komment
                    e.preventDefault();
                    jumpToIndex(posts, Math.max(0, currentIndex - 1));
                    break;

                case 'ArrowDown': // következő komment
                    e.preventDefault();
                    jumpToIndex(posts, Math.min(posts.length - 1, currentIndex + 1));
                    break;

                case 'ArrowLeft': // első
                    e.preventDefault();
                    jumpToIndex(posts, 0);
                    break;

                case 'ArrowRight': // utolsó
                    e.preventDefault();
                    jumpToIndex(posts, posts.length - 1);
                    break;
            }
        });
    }

    // Indítás
    if (!init()) {
        const observer = new MutationObserver(() => {
            if (init()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

})();
