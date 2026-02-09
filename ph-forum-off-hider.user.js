// ==UserScript==
// @name         Prohardver Fórum – OFF hozzászólások elrejtése
// @namespace    ph
// @version      1.2.2
// @description  Elrejti az OFF jelölésű hozzászólásokat.
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = "ph_hide_off";
    const STATUS = { ON: 'enabled', OFF: 'disabled' };

    let offHidden = localStorage.getItem(STORAGE_KEY) === STATUS.ON;
    const buttons = [];

    function getOffPosts() {
        return document.querySelectorAll('.msg, .topic, .msg-off');
    }

    function applyVisibility() {
        getOffPosts().forEach(post => {
            if (
                post.textContent.includes('[OFF]') ||
                post.classList.contains('msg-off')
            ) {
                post.style.display = offHidden ? 'none' : '';
            }
        });
    }

    function createToggleButton() {
        const btn = document.createElement('a');
        btn.href = 'javascript:;';
        btn.className = 'btn btn-forum';
        btn.style.marginLeft = '5px';
        btn.innerHTML = `<span class="fas fa-ban fa-fw"></span> OFF elrejtése`;

        function updateAppearance() {
            btn.classList.toggle('btn-primary', offHidden);
            btn.title = offHidden
                ? 'OFF hozzászólások megjelenítése'
                : 'OFF hozzászólások elrejtése';
        }

        btn.addEventListener('click', () => {
            offHidden = !offHidden;
            localStorage.setItem(
                STORAGE_KEY,
                offHidden ? STATUS.ON : STATUS.OFF
            );
            applyVisibility();
            updateAllButtons();
        });

        btn._update = updateAppearance;
        updateAppearance();

        return btn;
    }

    function updateAllButtons() {
        buttons.forEach(btn => btn._update());
    }

    document.querySelectorAll('h4.list-message').forEach(header => {
        const btn = createToggleButton();
        buttons.push(btn);
        header.appendChild(btn);
    });

    applyVisibility();
    updateAllButtons();

})();
