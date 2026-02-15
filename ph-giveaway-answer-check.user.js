// ==UserScript==
// @name         PH! lapcsalád nyereményjáték - helyes válasz ellenőrző
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  PH! lapcsalád nyereményjáték - helyes válasz ellenőrző
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/nyeremenyjatek/*
// @match        https://mobilarena.hu/nyeremenyjatek/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-giveaway-answer-check.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-giveaway-answer-check.user.js
//
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const USER = (() => {
        const el = document.querySelector('.dropdown-menu h6 a[href^="/tag/"]');
        return el ? el.textContent.trim() : "__NINCS_BEJELENTKEZVE__";
    })();

    const EMOJI_CORRECT = "✅";
    const EMOJI_WRONG = "❌";

    const CHECK_BUTTON_HTML = `<span class="fas fa-rotate-right"></span> Válaszok ellenőrzése`;
    const CHECKING_HTML = `<span class="fas fa-spinner fa-spin"></span> Ellenőrzés folyamatban ...`;

    $(".check_answers").html(CHECKING_HTML);
    $(".check_answers").html(CHECK_BUTTON_HTML);

    const questionsElement = $("div.content-body:contains('A játék kérdései:')");

    function createCheckButton(label, iconClass) {
        return $(
            `<a class="check_answers btn btn-forum">
                <span class="${iconClass}"></span> ${label}
            </a>`
        );
    }

    const topButton = createCheckButton("Gyerünk a kérdésekhez és válaszok ellenőrzése", "fas fa-circle-chevron-down");
    const midBottomButton = createCheckButton("Válaszok ellenőrzése", "fas fa-rotate-right");

    $("#center h1:first").after(topButton);
    $(questionsElement).prepend(midBottomButton.clone());
    $(questionsElement).append(midBottomButton.clone());

    function fetchPage(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: resolve
            });
        });
    }

    function scrollToQuestions() {
        $([document.documentElement, document.body]).animate({
            scrollTop: $(questionsElement).offset().top
        }, 500);
    }

    async function checkAnswers() {
        scrollToQuestions();

        const endDateText = $("p:contains('A játék lezárásának időpontja:')").find("b").text();
        const endDate = new Date(endDateText);
        if (new Date() < endDate) {
            alert("A játék még nem ért véget!");
            return;
        }

        $(".check_answers").html(CHECKING_HTML);

        const questionItems = $(questionsElement).find('.off');

        for (let i = 0; i < questionItems.length; i++) {
            const element = $(questionItems[i]);
            const url = element.find("a").attr("href");
            const answerText = element.find("li").text().trim();

            if (!answerText) {
                element.after("<li style='color: blue;'><b>Nem válaszoltál 😩</b></li>");
                continue;
            }

            try {
                const response = await fetchPage(url);
                const tempDoc = $(response.responseText);
                const yourAnswer = tempDoc.find('input[name=qchid]:checked').attr("id");
                const correctAnswers = tempDoc.find(".correct").map((_, el) => $(el).attr("for")).get();
                const emoji = correctAnswers.includes(yourAnswer) ? EMOJI_CORRECT : EMOJI_WRONG;

                element.find("ul li").each(function () {
                    const li = $(this);
                    const bold = li.find("b");
                    if (bold.length) {
                        bold.prepend(`${emoji} `);
                    } else {
                        li.prepend(`${emoji} `);
                    }
                });
                await new Promise(res => setTimeout(res, 1000));

            } catch (err) {
                console.error("Hiba a kérdés ellenőrzése során:", err);
            }
        }
        $(".check_answers").html(CHECK_BUTTON_HTML);

        const allCorrect = [...questionItems].every(el => {
            const li = $(el).find("ul li");
            return li.text().includes(EMOJI_CORRECT);
        });

        if (allCorrect) {
            showEpicFireworks();
        }
    }

    $(".check_answers").click(checkAnswers);

    function highlightCurrentUser(listParagraph) {
        listParagraph.find("a").each(function () {
            const a = $(this);
            if (a.text().trim() === USER) {
                a.css({
                    "font-weight": "bold",
                    "color": "#ffffff",
                    "background-color": "#ff6600",
                    "padding": "4px 6px",
                    "border-radius": "6px",
                    "box-shadow": "0 0 8px rgba(255,102,0,0.7)",
                    "font-size": "1.1em",
                });
            }
        });
    }

    function watchWinnersList() {
        const targetNode = document.body;
        const observerOptions = {
            childList: true,
            subtree: true
        };

        const observer = new MutationObserver((mutations, obs) => {
            const listParagraph = $("p:contains('helyes választ adók listája')");
            if (listParagraph.length) {
                highlightCurrentUser(listParagraph);
                obs.disconnect();
            }
        });

        observer.observe(targetNode, observerOptions);
    }

    function showEpicFireworks(duration = 7000, message = "Gratulálunk! 🎉") {
        // --- Canvas létrehozása tűzijátékhoz ---
        const canvas = document.createElement("canvas");
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "9999";
        document.body.appendChild(canvas);
        const ctx = canvas.getContext("2d");

        // --- Felirat létrehozása ---
        const msgDiv = document.createElement("div");
        msgDiv.textContent = message;
        msgDiv.style.position = "fixed";
        msgDiv.style.top = "50%";
        msgDiv.style.left = "50%";
        msgDiv.style.transform = "translate(-50%, -50%)";
        msgDiv.style.color = "#fff";
        msgDiv.style.fontSize = "3em";
        msgDiv.style.fontWeight = "bold";
        msgDiv.style.textShadow = "2px 2px 10px rgba(0,0,0,0.7)";
        msgDiv.style.pointerEvents = "none";
        msgDiv.style.zIndex = "10000";
        document.body.appendChild(msgDiv);

        // --- Tűzijáték részecskék ---
        const particles = [];
        const colors = ["#ff0000","#00ff00","#0000ff","#ffff00","#ff00ff","#00ffff","#ffffff"];

        function createFirework() {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height / 2;
            for(let i=0;i<50;i++){
                particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random()-0.5)*6,
                    vy: (Math.random()-0.5)*6,
                    alpha: 1,
                    color: colors[Math.floor(Math.random()*colors.length)]
                });
            }
        }

        function update() {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            for(let i=0;i<particles.length;i++){
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.02;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(p.alpha,0);
                ctx.beginPath();
                ctx.arc(p.x,p.y,3,0,2*Math.PI);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            for(let i=particles.length-1;i>=0;i--){
                if(particles[i].alpha <=0) particles.splice(i,1);
            }
        }

        const interval = setInterval(update, 30);
        const fireworkInterval = setInterval(createFirework, 300);

        setTimeout(() => {
            clearInterval(interval);
            clearInterval(fireworkInterval);
            canvas.remove();
            msgDiv.remove();
        }, duration);
    }

    watchWinnersList();
})();
