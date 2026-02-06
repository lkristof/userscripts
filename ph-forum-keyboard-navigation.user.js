// ==UserScript==
// @name         Prohardver Fórum – Billentyűzetes navigáció
// @namespace    ph
// @version      1.0.0
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

    function getMinMaxPostId(posts) {
        const ids = posts.map(p => parseInt(p.dataset.id, 10));
        return {
            min: Math.min(...ids),
            max: Math.max(...ids),
        };
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

        let currentIndex = getCurrentIndex(posts);
        if (currentIndex === -1) currentIndex = 0;

        // SHIFT + ↑ / ↓ : msg id +/- 1
        if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            const currentId = getMsgIdFromHash();
            if (currentId === null) return;

            const { min, max } = getMinMaxPostId(posts);

            e.preventDefault();
            let newId = currentId + (e.key === 'ArrowUp' ? -1 : 1);
            if (newId < min) newId = min;
            if (newId > max) newId = max;

            setMsgId(newId);
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
