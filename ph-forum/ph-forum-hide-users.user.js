// ==UserScript==
// @name         Prohardver Fórum – Felhasználó elrejtése
// @namespace    https://github.com/lkristof/userscripts
// @version      1.2.0
// @description  Megadott felhasználók hozzászólásait elrejti.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://mobilarena.hu/tema/*
// @match        https://logout.hu/tema/*
// @match        https://fototrend.hu/tema/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-hide-users.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-hide-users.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const STORAGE_KEY = "ph_hidden_users";
    let hiddenUsers;
    const dropdownRefreshers = [];
    try {
        hiddenUsers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        hiddenUsers = [];
    }

    // ===== TÉMA FELISMERÉS =====
    function detectDark() {
        const darkLink = document.querySelector('link[href*="dark_base"]');
        if (darkLink) {
            const media = darkLink.getAttribute("media");
            if (media === "all") return true;
            if (media === "not all") return false;
            if (media?.includes("prefers-color-scheme")) {
                return window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        }
        const btn = document.querySelector(".theme-button span");
        if (btn) return btn.classList.contains("fa-sun-bright");
        return false;
    }

    function getHiddenBarColors() {
        const dark = detectDark();
        if (dark) {
            return { base: "rgb(20 19 15)",hover: "rgba(255,255,255,0.15)", color: "white" };
        } else {
            return { base: "rgba(0,0,0,0.8)", hover: "rgba(0,0,0,0.7)", color: "white" };
        }
    }

    function applyHiddenBarStyle() {
        const { base, hover, color } = getHiddenBarColors();
        let styleEl = document.querySelector("#ph-hidden-bar-style");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "ph-hidden-bar-style";
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            .hidden-bar {
                background: ${base};
                color: ${color};
                font-size: 13px;
                padding: 4px 8px;
                cursor: pointer;
                position: sticky;
                top: 0;
                z-index: 105;
                text-align: center;
                transition: background 0.2s ease;
            }
            .hidden-bar:hover {
                background: ${hover};
            }
            .ph-collapsible {
                transition: max-height 0.4s ease;
            }
            .ph-collapsible[data-collapsed="true"] {
                overflow: hidden;
            }
        `;
    }

    applyHiddenBarStyle();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHiddenBarStyle);

    // ===== SEGÉDFÜGGVÉNYEK =====
    function getAuthor(msg) {
        return msg.querySelector(".msg-head-author .user-title a")?.textContent?.trim() || "";
    }

    function getPosts() {
        return Array.from(document.querySelectorAll("li.media[data-id]"));
    }

    function updateHiddenComments() {
        const { base, hover, color } = getHiddenBarColors();

        getPosts().forEach(li => {
            injectDropdownToggle(li);
            const msg = li.querySelector(".msg");
            if (!msg) return;
            const author = getAuthor(msg);
            const isHidden = hiddenUsers.includes(author);
            let bar = li.querySelector(".hidden-bar");

            if (isHidden) {
                if (!bar) {
                    msg.dataset.collapsed = "true";
                    msg.classList.add("ph-collapsible");
                    msg.style.maxHeight = "0px";

                    bar = document.createElement("div");
                    bar.className = "hidden-bar";
                    bar.textContent = `Rejtett – ${author}`;

                    bar.addEventListener("click", () => {
                        const collapsed = msg.dataset.collapsed === "true";
                        if (collapsed) {
                            const fullHeight = msg.scrollHeight;
                            msg.style.maxHeight = fullHeight + "px";
                            msg.addEventListener("transitionend", function onEnd(e) {
                                if (e.propertyName === "max-height") {
                                    msg.style.maxHeight = "none";
                                    msg.removeEventListener("transitionend", onEnd);
                                }
                            });
                            msg.dataset.collapsed = "false";
                            bar.textContent = `Elrejtés – ${author}`;
                        } else {
                            msg.style.maxHeight = msg.scrollHeight + "px";
                            msg.offsetHeight;
                            msg.style.maxHeight = "0px";
                            msg.dataset.collapsed = "true";
                            bar.textContent = `Rejtett – ${author}`;
                        }
                    });

                    li.prepend(bar);
                }
            } else {
                if (bar) bar.remove();
                msg.style.maxHeight = "";
                delete msg.dataset.collapsed;
            }
        });
    }

    function toggleUserHidden(author) {
        if (!author) return;

        if (hiddenUsers.includes(author)) {
            hiddenUsers = hiddenUsers.filter(u => u !== author);
        } else {
            hiddenUsers.push(author);
        }

        hiddenUsers = Array.from(new Set(hiddenUsers));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenUsers));

        // 1. Elrejtjük/megjelenítjük a kommenteket
        updateHiddenComments();

        // 2. Frissítjük az ÖSSZES eddigi dropdown menü szövegét
        dropdownRefreshers.forEach(refresh => refresh());

        // 3. fejléc gomb frissítése
        editButtons.forEach(btn => {
            const count = hiddenUsers.length;
            btn.innerHTML = count > 0
                ? `<span class="fas fa-eye-slash fa-fw"></span> Rejtettek (${count})`
                : `<span class="fas fa-eye-slash fa-fw"></span> Rejtettek`;
            btn.classList.toggle("btn-primary", count > 0);
        });
    }
    
    function injectDropdownToggle(li) {
        const msg = li.querySelector(".msg");
        if (!msg) return;

        const author = getAuthor(msg);
        if (!author) return;

        const dropdown = li.querySelector(".dropdown-menu");
        if (!dropdown) return;

        if (dropdown.querySelector(".ph-hide-user-toggle")) return;

        const divider = document.createElement("div");
        divider.className = "dropdown-divider";

        const a = document.createElement("a");
        a.className = "dropdown-item ph-hide-user-toggle";
        a.href = "javascript:;";

        function refreshText() {
            // Megkeressük az aktuális szerzőt (mert a gomb szövege attól függ, ő rejtett-e)
            const currentAuthor = getAuthor(li.querySelector(".msg"));
            const hidden = hiddenUsers.includes(currentAuthor);
            a.innerHTML = hidden
                ? `<span class="fas fa-eye fa-fw"></span> Felhasználó feloldása`
                : `<span class="fas fa-eye-slash fa-fw"></span> Felhasználó elrejtése`;
        }

        refreshText();

        // Elmentjük a listába, hogy később kívülről is frissíthessük
        dropdownRefreshers.push(refreshText);

        a.addEventListener("click", e => {
            e.preventDefault();
            toggleUserHidden(author);
        });

        dropdown.append(divider, a);
    }

    // ===== Gomb a szerkesztőhöz =====
    const editButtons = [];
    function createToggleButton(header) {
        if (header.dataset.userHideAdded) return;
        const editBtn = document.createElement("a");
        editBtn.href = "javascript:;";
        editBtn.className = "btn btn-forum";
        editBtn.style.marginLeft = "5px";
        editBtn.title = "Rejtett felhasználók szerkesztése";

        function refreshButton(btn) {
            const count = hiddenUsers.length;
            btn.innerHTML = count > 0
                ? `<span class="fas fa-eye-slash fa-fw"></span> Rejtettek (${count})`
                : "<span class=\"fas fa-eye-slash fa-fw\"></span> Rejtettek";
            btn.classList.toggle("btn-primary", count > 0);
        }

        editBtn.addEventListener("click", () => {
            openEditor(() => {
                editButtons.forEach(refreshButton);
            });
        });
        header.appendChild(editBtn);
        header.dataset.userHideAdded = "true";

        refreshButton(editBtn);
        editButtons.push(editBtn);
    }

    // ===== Dual-list szerkesztő =====
    function openEditor(onSave) {
        const buttonPlaceholder = document.querySelector(".list-message");
        if (!buttonPlaceholder) return;
        const btnForum = buttonPlaceholder.querySelector(".btn-forum");
        const btnPrimary = buttonPlaceholder.querySelector(".btn-primary");
        const btnForumColor = btnForum ? getComputedStyle(btnForum).color : "white";
        const btnForumBackgroundColor = btnForum ? getComputedStyle(btnForum).backgroundColor : "#007bff";
        const btnPrimaryColor = btnPrimary ? getComputedStyle(btnPrimary).backgroundColor : "black";
        const bg = buttonPlaceholder ? getComputedStyle(buttonPlaceholder).backgroundColor : "white";
        const color = buttonPlaceholder ? getComputedStyle(buttonPlaceholder).color : "black";

        let style = document.querySelector("#ph-dual-list-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "ph-dual-list-style";
            document.head.appendChild(style);
        }
        style.textContent = `
            .ph-editor-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center; }
            .ph-editor-panel { background: ${bg}; padding: 20px; border-radius: 5px; min-width: 400px; max-width: 600px; color: ${color}; }
            .dual-list-container { display: flex; gap: 10px; margin-top: 10px; }
            .dual-list { flex: 1; border: 1px solid #fff; min-height: 141px; max-height: 273px; padding: 5px; background: ${bg}; overflow-y: auto; }
            .dual-list-item { padding: 4px 6px; cursor: pointer; border-radius: 3px; margin: 2px 0; background: ${btnForumBackgroundColor}; color: ${btnForumColor}; border: 1px solid #fff; }
            .dual-list-item.selected { background: ${btnPrimaryColor}; color: white; border-color: white; }
            .dual-list-buttons { display: flex; flex-direction: column; justify-content: center; gap: 5px; }
            .dual-list-buttons button { width: 36px; height: 36px; font-weight: bold; border-radius: 3px; cursor: pointer; }
            .editor-buttons { margin-top: 10px; display: flex; gap: 5px; justify-content: flex-end; }
        `;

        const overlay = document.createElement("div");
        overlay.className = "ph-editor-overlay";

        const panel = document.createElement("div");
        panel.className = "ph-editor-panel";

        const title = document.createElement("h3");
        title.textContent = "Rejtett felhasználók szerkesztése";

        // ===== Lista konténerek =====
        const container = document.createElement("div");
        container.className = "dual-list-container";

        const leftList = document.createElement("div");
        leftList.className = "dual-list";

        const rightList = document.createElement("div");
        rightList.className = "dual-list";

        const buttonsDiv = document.createElement("div");
        buttonsDiv.className = "dual-list-buttons";

        const btnRight = document.createElement("button");
        btnRight.className = "btn btn-forum btn-sm fas fa-arrow-right fa-fw";
        const btnLeft = document.createElement("button");
        btnLeft.className = "btn btn-forum btn-sm fas fa-arrow-left fa-fw";

        buttonsDiv.append(btnRight, btnLeft);
        container.append(leftList, buttonsDiv, rightList);

        panel.append(title, container);

        // ===== Gombok mentés / mégse =====
        const editorButtonsDiv = document.createElement("div");
        editorButtonsDiv.className = "editor-buttons";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Mentés";
        saveBtn.className = "btn btn-forum btn-primary";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Mégse";
        cancelBtn.className = "btn btn-forum";

        editorButtonsDiv.append(saveBtn, cancelBtn);
        panel.append(editorButtonsDiv);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // ===== Ideiglenes lista a szerkesztéshez =====
        let tempHiddenUsers = [...hiddenUsers];

        // ===== Kitöltjük a listákat =====
        function refreshLists() {
            leftList.innerHTML = "";
            rightList.innerHTML = "";

            const domAuthors = Array.from(new Set(getPosts().map(li => getAuthor(li))))
                .filter(a => !tempHiddenUsers.includes(a))
                .sort((a,b) => a.localeCompare(b));

            domAuthors.forEach(user => {
                const div = document.createElement("div");
                div.className = "dual-list-item";
                div.textContent = user;
                div.addEventListener("click", () => div.classList.toggle("selected"));
                leftList.appendChild(div);
            });

            tempHiddenUsers.forEach(user => {
                const div = document.createElement("div");
                div.className = "dual-list-item";
                div.textContent = user;
                div.addEventListener("click", () => div.classList.toggle("selected"));
                rightList.appendChild(div);
            });
        }

        refreshLists();

        // ===== Nyilak – csak a temp listát módosítják =====
        btnRight.addEventListener("click", () => {
            Array.from(leftList.querySelectorAll(".dual-list-item.selected")).forEach(div => {
                div.classList.remove("selected");
                if (!tempHiddenUsers.includes(div.textContent)) tempHiddenUsers.push(div.textContent);
            });
            refreshLists();
        });

        btnLeft.addEventListener("click", () => {
            Array.from(rightList.querySelectorAll(".dual-list-item.selected")).forEach(div => {
                div.classList.remove("selected");
                tempHiddenUsers = tempHiddenUsers.filter(u => u !== div.textContent);
            });
            refreshLists();
        });

        // ===== Mentés – csak itt frissítjük a valódi hiddenUsers-t =====
        saveBtn.addEventListener("click", () => {
            hiddenUsers = Array.from(new Set(tempHiddenUsers));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenUsers));
            updateHiddenComments();
            dropdownRefreshers.forEach(refresh => refresh());
            closeEditor();
            if (onSave) onSave();
        });

        // ===== Mégse – bezár, temp változás elvész =====
        cancelBtn.addEventListener("click", closeEditor);

        function escListener(e) {
            if (e.key === "Escape") {
                closeEditor();
            }
        }

        document.addEventListener("keydown", escListener);

        function closeEditor() {
            document.removeEventListener("keydown", escListener);
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }

        // ===== Háttérre kattintás = Mégse =====
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeEditor();
            }
        });
    }

    // ===== Init =====
    function init() {
        applyHiddenBarStyle();
        document.querySelectorAll("h4.list-message").forEach(createToggleButton);
        updateHiddenComments();
    }

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes.length) {
                init();
                break;
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
