// ==UserScript==
// @name         SteamGifts – Pontszám szűrő
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  Beállítható minimum pontszám alapján szűri a SteamGifts giveaway-eket
// @icon         https://cdn.steamgifts.com/img/favicon.ico
//
// @match        https://www.steamgifts.com/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/steamgifts/steamgifts-filter.users.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/steamgifts/steamgifts-filter.users.js
//
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'steamgifts_min_points';
    const DEFAULT_MIN_POINTS = 25;

    let minPoints = parseInt(
        localStorage.getItem(STORAGE_KEY) || DEFAULT_MIN_POINTS,
        10
    );

    function getGiveawayPoints(row) {
        if (row.dataset.giveawayPoints !== undefined) {
            return parseInt(row.dataset.giveawayPoints, 10);
        }

        const pointsEls = row.querySelectorAll('.giveaway__heading__thin');
        let points = null;

        pointsEls.forEach((el) => {
            const match = el.textContent.trim().match(/^\((\d+)\s*P\)$/i);

            if (match) {
                points = parseInt(match[1], 10);
            }
        });

        if (points !== null) {
            row.dataset.giveawayPoints = points;
        }

        return points;
    }

    function filterGiveaways() {
        const rows = document.querySelectorAll('.giveaway__row-outer-wrap');

        rows.forEach((row) => {
            const points = getGiveawayPoints(row);

            // Ha nincs pontérték, maradjon látható
            if (points === null) {
                row.style.display = '';
                return;
            }

            // Csak szűrés, nincs kiemelés
            if (points >= minPoints) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        updateCounter();
    }

    function updateCounter() {
        const counter = document.getElementById('sg-filter-counter');

        if (!counter) return;

        const rows = document.querySelectorAll('.giveaway__row-outer-wrap');

        let visible = 0;

        rows.forEach((row) => {
            if (row.style.display !== 'none') {
                visible++;
            }
        });

        counter.textContent = `Látható giveaway: ${visible}`;
    }

    function createMenu() {
        if (document.getElementById('sg-points-filter-menu')) {
            return;
        }

        const menu = document.createElement('div');

        menu.id = 'sg-points-filter-menu';

        menu.innerHTML = `
            <div class="sg-filter-title">
                Giveaway szűrő
            </div>

            <div class="sg-filter-row">
                <label for="sg-min-points">
                    Minimum pont:
                </label>

                <input
                    id="sg-min-points"
                    type="number"
                    min="0"
                    max="9999"
                    step="1"
                    value="${minPoints}"
                >
            </div>

            <div class="sg-filter-buttons">
                <button id="sg-filter-apply">
                    Alkalmaz
                </button>

                <button id="sg-filter-reset">
                    Reset
                </button>
            </div>

            <div id="sg-filter-counter">
                Látható giveaway: -
            </div>
        `;

        document.body.appendChild(menu);

        const style = document.createElement('style');

        style.textContent = `
            #sg-points-filter-menu {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 99999;
                width: 220px;
                padding: 14px;
                background: #2f3540;
                color: #ffffff;
                border: 1px solid #4a515d;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.35);
                font-family: Arial, sans-serif;
                font-size: 13px;
            }

            #sg-points-filter-menu .sg-filter-title {
                font-weight: bold;
                font-size: 15px;
                margin-bottom: 12px;
            }

            #sg-points-filter-menu .sg-filter-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            #sg-points-filter-menu input {
                width: 65px;
                padding: 5px;
                border-radius: 4px;
                border: 1px solid #666;
                background: #ffffff;
                color: #222;
                text-align: center;
            }

            #sg-points-filter-menu .sg-filter-buttons {
                display: flex;
                gap: 6px;
                margin-bottom: 10px;
            }

            #sg-points-filter-menu button {
                flex: 1;
                padding: 6px;
                border: 0;
                border-radius: 4px;
                cursor: pointer;
                background: #4a515d;
                color: #fff;
                font-weight: bold;
            }

            #sg-points-filter-menu button:hover {
                filter: brightness(1.15);
            }

            #sg-filter-counter {
                font-size: 11px;
                color: #c9c9c9;
                text-align: center;
            }
        `;

        document.head.appendChild(style);

        const input = document.getElementById('sg-min-points');
        const applyButton = document.getElementById('sg-filter-apply');
        const resetButton = document.getElementById('sg-filter-reset');

        function applyValue() {
            let value = parseInt(input.value, 10);

            if (isNaN(value) || value < 0) {
                value = DEFAULT_MIN_POINTS;
            }

            minPoints = value;
            input.value = minPoints;

            localStorage.setItem(STORAGE_KEY, minPoints);

            filterGiveaways();
        }

        applyButton.addEventListener('click', applyValue);

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                applyValue();
                input.blur();
            }
        });

        input.addEventListener('change', applyValue);

        resetButton.addEventListener('click', () => {
            minPoints = DEFAULT_MIN_POINTS;
            input.value = DEFAULT_MIN_POINTS;

            localStorage.setItem(
                STORAGE_KEY,
                DEFAULT_MIN_POINTS
            );

            filterGiveaways();
        });
    }

    createMenu();
    filterGiveaways();

    const container =
        document.querySelector('.page__inner-wrap') || document.body;

    let observerTimeout = null;

    const observer = new MutationObserver(() => {
        clearTimeout(observerTimeout);

        observerTimeout = setTimeout(() => {
            filterGiveaways();
        }, 100);
    });

    observer.observe(container, {
        childList: true,
        subtree: true
    });
})();