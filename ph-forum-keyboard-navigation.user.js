// ==UserScript==
// @name         Prohardver Fórum – Billentyűzetes navigáció
// @namespace    ph
// @version      1.0.2
// @description  Hozzászólások közti navigáció billentyűzettel
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

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

    function findClosestPost(posts, targetId) {
        let closest = null;
        let minDiff = Infinity;

        posts.forEach(li => {
            const id = parseInt(li.dataset.id, 10);
            if (Number.isNaN(id)) return;

            const diff = Math.abs(id - targetId);
            if (diff < minDiff) {
                minDiff = diff;
                closest = li;
            }
        });

        return closest;
    }

    function getSortedPostIds(posts) {
        return posts
            .map(p => parseInt(p.dataset.id, 10))
            .filter(id => !Number.isNaN(id))
            .sort((a, b) => a - b);
    }

    function getCurrentIdIndex(sortedIds) {
        const currentId = getMsgIdFromHash();
        if (currentId === null) return -1;
        const idx = sortedIds.indexOf(currentId);
        return idx;
    }

    function getSafeCurrentIndex(posts) {
        let index = getCurrentIndex(posts);
        if (index !== -1) return index;

        const hashId = getMsgIdFromHash();
        if (hashId === null) return 0;

        const closest = findClosestPost(posts, hashId);
        return closest ? posts.indexOf(closest) : 0;
    }

    document.addEventListener('keydown', (e) => {
        // gallery / input védelem
        if (document.querySelector('.layer-gallery')) return;

        const active = document.activeElement;
        if (
            active &&
            (active.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))
        ) return;

        const posts = getPosts();
        if (!posts.length) return;

        let currentIndex = getSafeCurrentIndex(posts);

        // SHIFT + ↑ / ↓ : következő létező msgId (ID sorrendben)
        if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();

            const sortedIds = getSortedPostIds(posts);
            if (!sortedIds.length) return;

            let idx = getCurrentIdIndex(sortedIds);

            // ha törölt msg-en állunk → legközelebbi ID
            if (idx === -1) {
                const hashId = getMsgIdFromHash();
                if (hashId === null) return;

                let closestDiff = Infinity;
                sortedIds.forEach((id, i) => {
                    const diff = Math.abs(id - hashId);
                    if (diff < closestDiff) {
                        closestDiff = diff;
                        idx = i;
                    }
                });
            }

            const delta = e.key === 'ArrowUp' ? -1 : 1;
            const newIndex = idx + delta;

            if (newIndex < 0 || newIndex >= sortedIds.length) return;

            setMsgId(sortedIds[newIndex]);
            return;
        }

        // alap navigáció
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                jumpToIndex(posts, Math.max(0, currentIndex - 1));
                break;

            case 'ArrowDown':
                e.preventDefault();
                jumpToIndex(posts, Math.min(posts.length - 1, currentIndex + 1));
                break;

            case 'ArrowLeft':
                e.preventDefault();
                jumpToIndex(posts, 0);
                break;

            case 'ArrowRight':
                e.preventDefault();
                jumpToIndex(posts, posts.length - 1);
                break;
        }
    });
})();
