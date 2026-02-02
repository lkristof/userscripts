// ==UserScript==
// @name         Prohardver - OFF elrejtő
// @namespace    ph
// @version      1.0.0
// @description  Elrejti az OFF hozzászólásokat a Prohardver fórumon
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let offHidden = false; // true = alapból elrejtve, false = alapból látható

    // Gomb létrehozása
    const btn = document.createElement('a');
    btn.href = 'javascript:;';
    btn.className = 'btn btn-forum';
    btn.style.marginLeft = '5px';
    btn.innerHTML = `<span class="fas fa-ban"></span> ${offHidden ? 'OFF mutatása' : 'OFF elrejtése'}`;

    // Gomb beszúrása a thread fejlécbe
    const header = document.querySelector('h4.list-message');
    if (header) header.appendChild(btn);

    // OFF posztok kezdeti állapota
    const offPosts = document.querySelectorAll('.msg, .topic, .msg-off');
    offPosts.forEach(post => {
        if(post.textContent.includes('[OFF]') || post.classList.contains('msg-off')) {
            post.style.display = offHidden ? 'none' : '';
        }
    });

    // Toggle funkció
    function toggleOff() {
        offHidden = !offHidden;
        offPosts.forEach(post => {
            if(post.textContent.includes('[OFF]') || post.classList.contains('msg-off')) {
                post.style.display = offHidden ? 'none' : '';
            }
        });
        btn.innerHTML = `<span class="fas fa-ban"></span> ${offHidden ? 'OFF mutatása' : 'OFF elrejtése'}`;
    }

    btn.addEventListener('click', toggleOff);

})();