// ==UserScript==
// @name         Prohardver Fórum – OFF hozzászólások elrejtése
// @namespace    ph
// @version      1.2.1
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

    // ===== Gomb létrehozása =====
    const btn = document.createElement('a');
    btn.href = 'javascript:;';
    btn.className = 'btn btn-forum';
    btn.style.marginLeft = '5px';
    btn.id = 'ph-off-toggle-btn';
    btn.innerHTML = `<span class="fas fa-ban fa-fw"></span> OFF elrejtése`;

    function updateButtonAppearance() {
        if (offHidden) {
            btn.classList.add('btn-primary');
            btn.title = 'OFF hozzászólások megjelenítése';
        } else {
            btn.classList.remove('btn-primary');
            btn.title = 'OFF hozzászólások elrejtése';
        }
    }

    // ===== Beszúrás a headerbe =====
    const header = document.querySelector('h4.list-message');
    if (header) {
        header.appendChild(btn);
    }

    // ===== OFF posztok kiválasztása =====
    const offPosts = document.querySelectorAll('.msg, .topic, .msg-off');
    offPosts.forEach(post => {
        if (post.textContent.includes('[OFF]') || post.classList.contains('msg-off')) {
            post.style.display = offHidden ? 'none' : '';
        }
    });

    function applyVisibility() {
        offPosts.forEach(post => {
            if (post.textContent.includes('[OFF]') || post.classList.contains('msg-off')) {
                post.style.display = offHidden ? 'none' : '';
            }
        });
    }

    // ===== Toggle =====
    function toggleOff() {
        offHidden = !offHidden;

        localStorage.setItem(STORAGE_KEY, offHidden ? STATUS.ON : STATUS.OFF);

        applyVisibility();
        updateButtonAppearance();
    }

    btn.addEventListener('click', toggleOff);

    // Kezdeti állapot
    updateButtonAppearance();

})();
