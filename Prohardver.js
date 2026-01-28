// ==UserScript==
// @name         PH Fórum színezés – .msg-body háttérrel
// @namespace    ph
// @version      1.0.0
// @description  Kiemeli a saját és rád válaszoló hozzászólásokat a .msg-body háttér színezésével
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://itcafe.hu/tema/*
// @match        https://gamepod.hu/tema/*
// @match        https://logout.hu/tema/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const FELHASZNALO = "lkristóf";

  // Színek
  const SAJAT = "#c4f0ff";
  const VALASZ = "#d6ffbf";

  // Segéd: string lower/trim
  const lower = s => (s || "").toString().trim().toLowerCase();

  function colorMsgBody(msg, color) {
    const body = msg.querySelector(".msg-body");
    if (body) {
      // !important, hogy semmi ne írja felül
      body.style.setProperty("background-color", color, "important");
    }
  }

  function processOne(msg) {
    if (!(msg instanceof HTMLElement)) return;
    if (msg.dataset._phProcessed === "1") return;

    const authorEl = msg.querySelector(".msg-head-author .user-title a");
    const replyEl  = msg.querySelector(".msg-head-replied .user-title a");

    const author  = authorEl ? authorEl.textContent.trim() : "";
    const replyTo = replyEl  ? replyEl.textContent.trim()  : "";

    if (lower(author) === lower(FELHASZNALO)) {
      colorMsgBody(msg, SAJAT);
    } else if (lower(replyTo) === lower(FELHASZNALO)) {
      colorMsgBody(msg, VALASZ);
    }

    msg.dataset._phProcessed = "1";
  }

  function processAll(root = document) {
    root.querySelectorAll(".msg").forEach(processOne);
  }

  function init() {
    processAll();

    // Dinamikus betöltések figyelése (lapozás, végtelen görgetés, stb.)
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches && n.matches(".msg")) {
            processOne(n);
          } else {
            n.querySelectorAll?.(".msg").forEach(processOne);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();