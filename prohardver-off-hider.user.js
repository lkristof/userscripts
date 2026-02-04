// ==UserScript==
// @name         Prohardver - OFF elrejtő
// @namespace    ph
// @version      1.1.0
// @description  Elrejti az OFF hozzászólásokat
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let offHidden = false;

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
        applyVisibility();
        updateButtonAppearance();
    }

    btn.addEventListener('click', toggleOff);

    // Kezdeti állapot
    updateButtonAppearance();

})();
