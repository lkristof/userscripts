// ==UserScript==
// @name         Prohardver Fórum – kek.sh külső képfeltöltés
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  Képfeltöltés kek.sh-re; galéria 2 füllel: Grid (nagy bélyegkép + hover gombok) + Lista; beszúrás/link/törlés; opcionális GitHub Gist autosync + LocalStorage fallback
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/*
// @match        https://mobilarena.hu/*
// @match        https://logout.hu/*
// @match        https://fototrend.hu/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-keksh-upload.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-keksh-upload.user.js
//
// @grant        GM_xmlhttpRequest
// @connect      kek.sh
// @connect      api.github.com
// ==/UserScript==

(function () {
    'use strict';

    /* ================= CONFIG ================= */

    const GIST_TOKEN = ""; // GitHub token
    const GIST_ID = ""; // Gist ID
    const GIST_FILENAME = "ph_kek_gallery.json";
    const ENABLE_GIST_SYNC = !!(GIST_TOKEN && GIST_ID);
    const KEK_API_KEY = "IDE_IRD_AZ_API_KULCSODAT"; // kek.sh API key

    // LocalStorage kulcs (fallback / offline / token nélkül):
    const LS_KEY = "ph_kek_gallery";
    const MAX_ITEMS = 120;

    // Gist sync
    const AUTOSYNC_DELAY = 1500;

    // UI
    const GALLERY_MAX_HEIGHT_PX = 420;
    const GRID_THUMB_SIZE_PX = 120;

    /* ================= STATE ================= */

    let memoryCache = [];
    let syncTimer = null;
    let gistAvailable = false;
    let syncState = "local"; // local | gist | error

    /* ================= GM REQUEST ================= */

    function gmRequest(opts) {
        return GM_xmlhttpRequest(opts);
    }

    function safeJsonParse(str, fallback) {
        try { return JSON.parse(str); } catch { return fallback; }
    }

    /* ================= LOCAL STORAGE ================= */

    function lsLoad() {
        const arr = safeJsonParse(localStorage.getItem(LS_KEY), []);
        return Array.isArray(arr) ? arr : [];
    }

    function lsSave(data) {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
    }

    /* ================= GIST API ================= */

    function gistRequest(method, body = null, urlOverride = null) {
        return new Promise((resolve, reject) => {
            const url = urlOverride || `https://api.github.com/gists/${GIST_ID}`;

            const headers = {
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json"
            };
            headers["Authorization"] = `token ${GIST_TOKEN}`;

            gmRequest({
                method,
                url,
                headers,
                data: body ? JSON.stringify(body) : undefined,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        if ((res.responseHeaders || "").toLowerCase().includes("application/json")) {
                            resolve(safeJsonParse(res.responseText, {}));
                        } else {
                            resolve(res.responseText);
                        }
                    } else reject(res);
                },
                onerror: reject
            });
        });
    }

    async function pullFromGist() {
        const gist = await gistRequest("GET");
        const file = gist?.files?.[GIST_FILENAME];
        if (!file) return [];

        // GitHub API: nagy fájlnál "truncated": true + raw_url
        if (file.truncated && file.raw_url) {
            const raw = await gistRequest("GET", null, file.raw_url);
            const parsed = safeJsonParse(raw, []);
            return Array.isArray(parsed) ? parsed : [];
        }

        const parsed = safeJsonParse(file.content || "[]", []);
        return Array.isArray(parsed) ? parsed : [];
    }

    async function pushToGist() {
        await gistRequest("PATCH", {
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(memoryCache, null, 2)
                }
            }
        });
    }

    /* ================= STORAGE LAYER (Gist + LS fallback) ================= */

    async function initStorage() {
        if (!ENABLE_GIST_SYNC) {
            memoryCache = lsLoad();
            syncState = "local";
            return;
        }

        try {
            const local = lsLoad();
            const remote = await pullFromGist();

            memoryCache = mergeGalleries(remote, local); // remote az alap, local csak hozzáadódik
            lsSave(memoryCache);

            gistAvailable = true;
            syncState = "gist";

            if (memoryCache.length !== remote.length) {
                debounceSync();
            }
        } catch {
            // ha nem megy a gist: fallback local-ra
            memoryCache = lsLoad();
            gistAvailable = false;
            syncState = "error";
        }
    }

    function mergeGalleries(primary, secondary) {
        const seen = new Set(primary.map(x => x.url));
        const out = [...primary];

        for (const it of secondary) {
            if (!it?.url) continue;
            if (seen.has(it.url)) continue;
            seen.add(it.url);
            out.push(it);
        }

        // opcionális: createdAt szerint rendezés, ha van
        out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        return out;
    }

    function debounceSync() {
        if (!gistAvailable) return;

        clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
            try {
                await pushToGist();
                syncState = "gist";
            } catch {
                syncState = "error";
                gistAvailable = false;
            }
            updateSyncBadge();
        }, AUTOSYNC_DELAY);
    }

    function loadGallery() {
        return memoryCache;
    }

    function saveGallery(data) {
        memoryCache = Array.isArray(data) ? data : [];
        // limit
        if (memoryCache.length > MAX_ITEMS) memoryCache.length = MAX_ITEMS;

        lsSave(memoryCache);
        debounceSync();
    }

    function addToGallery(item) {
        if (!item?.url) return;

        if (memoryCache.some(x => x.url === item.url)) return;

        memoryCache.unshift(item);
        if (memoryCache.length > MAX_ITEMS) memoryCache.length = MAX_ITEMS;

        saveGallery(memoryCache);
    }

    function removeFromGallery(url) {
        memoryCache = memoryCache.filter(x => x.url !== url);
        saveGallery(memoryCache);
    }

    function clearGallery() {
        memoryCache = [];
        saveGallery(memoryCache);
    }

    /* ================= HELPERS (editor/HTML) ================= */

    function buildImageUrlFromApi(json) {
        if (json?.filename) return "https://i.kek.sh/" + json.filename;
        if (json?.url) return json.url;
        if (json?.data?.url) return json.data.url;
        if (json?.file?.url) return json.file.url;
        if (json?.token) return `https://kek.sh/${json.token}`;
        return null;
    }

    function findEditorNear(node) {
        const root = node?.closest?.(".msg-editor-wrapper") || document;
        return root.querySelector(".rtif-content[contenteditable='true']");
    }

    function insertHtml(editor, html) {
        if (!editor) return false;
        editor.focus();
        document.execCommand("insertHTML", false, html);
        return true;
    }

    function escapeHtml(text) {
        return String(text)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function buildLinkHtml(url) {
        const safeUrl = escapeHtml(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener">[kép]</a>`;
    }

    /* ================= UI ================= */

    function injectCssOnce() {
        if (document.getElementById("ph-kek-style")) return;

        const style = document.createElement("style");
        style.id = "ph-kek-style";
        style.textContent = `
        #ph-kek-upload .ph-kek-cell { position: relative; }
        #ph-kek-upload .ph-kek-overlay { opacity: 0; pointer-events: none; }
        #ph-kek-upload .ph-kek-cell:hover .ph-kek-overlay {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        #ph-kek-upload .ph-kek-overlay button.btn {
            padding: 2px 6px;
            line-height: 1.1;
            font-size: 11px;
        }
        #ph-kek-upload #ph-kek-sync-badge {
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 10px;
            background: rgba(0,0,0,0.06);
        }
        #ph-kek-sync-badge:empty {
            display: none;
        }
    `;
        document.head.appendChild(style);
    }

    function updateSyncBadge() {
        const el = document.getElementById("ph-kek-sync-badge");
        if (!el) return;

        if (syncState === "gist") {
            el.textContent = "☁️ Cloud";
            el.style.color = "green";
        } else if (syncState === "error") {
            el.textContent = "⚠ Sync error";
            el.style.color = "red";
        } else {
            el.textContent = "💾 Local";
            el.style.color = "gray";
        }
    }

    function setActiveTab(wrapper, tab) {
        const btnGrid = wrapper.querySelector("#ph-kek-tab-grid");
        const btnList = wrapper.querySelector("#ph-kek-tab-list");
        const viewGrid = wrapper.querySelector("#ph-kek-view-grid");
        const viewList = wrapper.querySelector("#ph-kek-view-list");

        wrapper.dataset.activeTab = tab;

        if (tab === "grid") {
            btnGrid.classList.add("btn-secondary");
            btnGrid.classList.remove("btn-light");
            btnList.classList.add("btn-light");
            btnList.classList.remove("btn-secondary");
            viewGrid.style.display = "block";
            viewList.style.display = "none";
        } else {
            btnList.classList.add("btn-secondary");
            btnList.classList.remove("btn-light");
            btnGrid.classList.add("btn-light");
            btnGrid.classList.remove("btn-secondary");
            viewList.style.display = "block";
            viewGrid.style.display = "none";
        }
    }

    function renderGallery(wrapper) {
        if (!wrapper) return;

        const items = loadGallery();

        const emptyGrid = wrapper.querySelector("#ph-kek-empty-grid");
        const emptyList = wrapper.querySelector("#ph-kek-empty-list");
        const gridEl = wrapper.querySelector("#ph-kek-grid");
        const listEl = wrapper.querySelector("#ph-kek-list");

        gridEl.innerHTML = "";
        listEl.innerHTML = "";

        if (!items.length) {
            emptyGrid.style.display = "block";
            emptyList.style.display = "block";
            return;
        }
        emptyGrid.style.display = "none";
        emptyList.style.display = "none";

        // GRID
        for (const it of items) {
            const cell = document.createElement("div");
            cell.className = "ph-kek-cell";
            cell.style.width = `${GRID_THUMB_SIZE_PX}px`;
            cell.style.height = `${GRID_THUMB_SIZE_PX}px`;
            cell.style.borderRadius = "8px";
            cell.style.overflow = "hidden";
            cell.style.border = "1px solid rgba(0,0,0,0.15)";
            cell.style.background = "rgba(0,0,0,0.02)";

            const a = document.createElement("a");
            a.href = it.url;
            a.target = "_blank";
            a.rel = "noopener";
            a.title = "Megnyitás új lapon";
            a.style.display = "block";
            a.style.width = "100%";
            a.style.height = "100%";
            a.style.position = "absolute";
            a.style.inset = "0";
            a.style.zIndex = "1";

            const img = document.createElement("img");
            img.src = it.url;
            img.alt = it.filename || "";
            img.loading = "lazy";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            a.appendChild(img);

            const overlay = document.createElement("div");
            overlay.className = "ph-kek-overlay";
            overlay.style.position = "absolute";
            overlay.style.left = "0";
            overlay.style.right = "0";
            overlay.style.bottom = "0";
            overlay.style.padding = "8px";
            overlay.style.display = "flex";
            overlay.style.gap = "8px";
            overlay.style.justifyContent = "center";
            overlay.style.background = "rgba(0,0,0,0.55)";
            overlay.style.transition = "opacity 120ms ease";
            overlay.style.zIndex = "2";

            const makeMiniBtn = (action, title, innerHtml, className) => {
                const b = document.createElement("button");
                b.type = "button";
                b.className = className;
                b.dataset.action = action;
                b.dataset.url = it.url;
                b.title = title;
                b.innerHTML = innerHtml;
                return b;
            };

            const btnImg = makeMiniBtn(
                "insert-image",
                "Kép beszúrás",
                `<span class="fas fa-image"></span>`,
                "btn btn-light btn-xs"
            );
            const btnLink = makeMiniBtn(
                "insert-link",
                "Link beszúrás ([kép])",
                `<span class="fas fa-link"></span>`,
                "btn btn-light btn-xs"
            );
            const btnDel = makeMiniBtn(
                "delete",
                "Törlés",
                `<span class="fas fa-trash"></span>`,
                "btn btn-light btn-xs"
            );

            overlay.appendChild(btnImg);
            overlay.appendChild(btnLink);
            overlay.appendChild(btnDel);

            cell.appendChild(a);
            cell.appendChild(overlay);
            gridEl.appendChild(cell);
        }

        // LISTA
        for (const it of items) {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.padding = "6px 0";
            row.style.borderTop = "1px solid rgba(0,0,0,0.08)";

            const thumbLink = document.createElement("a");
            thumbLink.href = it.url;
            thumbLink.target = "_blank";
            thumbLink.rel = "noopener";
            thumbLink.title = "Megnyitás új lapon";

            const thumb = document.createElement("img");
            thumb.src = it.url;
            thumb.alt = it.filename || "";
            thumb.loading = "lazy";
            thumb.style.width = "56px";
            thumb.style.height = "56px";
            thumb.style.objectFit = "cover";
            thumb.style.borderRadius = "4px";
            thumb.style.border = "1px solid rgba(0,0,0,0.15)";
            thumbLink.appendChild(thumb);

            const meta = document.createElement("div");
            meta.style.flex = "1";
            meta.style.minWidth = "0";

            const title = document.createElement("div");
            title.textContent = it.originalName || it.filename || it.url.split("/").pop();
            title.style.fontSize = "12px";
            title.style.fontWeight = "600";
            title.style.whiteSpace = "nowrap";
            title.style.overflow = "hidden";
            title.style.textOverflow = "ellipsis";
            title.title = it.url;

            const urlLine = document.createElement("div");
            urlLine.textContent = it.url;
            urlLine.style.fontSize = "11px";
            urlLine.style.color = "#666";
            urlLine.style.whiteSpace = "nowrap";
            urlLine.style.overflow = "hidden";
            urlLine.style.textOverflow = "ellipsis";
            urlLine.title = it.url;

            meta.appendChild(title);
            meta.appendChild(urlLine);

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "6px";
            actions.style.flexWrap = "wrap";
            actions.style.justifyContent = "flex-end";

            const btnInsertImg = document.createElement("button");
            btnInsertImg.type = "button";
            btnInsertImg.className = "btn btn-light btn-xs my-1";
            btnInsertImg.dataset.action = "insert-image";
            btnInsertImg.dataset.url = it.url;
            btnInsertImg.innerHTML = `
            <span class="fas fa-image"></span>
            <span class="d-none d-md-inline-block">Beszúrás</span>
        `;

            const btnInsertLink = document.createElement("button");
            btnInsertLink.type = "button";
            btnInsertLink.className = "btn btn-light btn-xs my-1";
            btnInsertLink.dataset.action = "insert-link";
            btnInsertLink.dataset.url = it.url;
            btnInsertLink.innerHTML = `
            <span class="fas fa-link"></span>
            <span class="d-none d-md-inline-block">Link beszúrás</span>
        `;

            const btnDel = document.createElement("button");
            btnDel.type = "button";
            btnDel.className = "btn btn-light btn-xs my-1";
            btnDel.dataset.action = "delete";
            btnDel.dataset.url = it.url;
            btnDel.innerHTML = `
            <span class="fas fa-trash"></span>
            <span class="d-none d-md-inline-block">Törlés</span>
        `;

            actions.appendChild(btnInsertImg);
            actions.appendChild(btnInsertLink);
            actions.appendChild(btnDel);

            row.appendChild(thumbLink);
            row.appendChild(meta);
            row.appendChild(actions);

            listEl.appendChild(row);
        }
    }

    function ensureUi(target) {
        if (!target) return null;
        if (target.querySelector("#ph-kek-upload")) return target.querySelector("#ph-kek-upload");

        injectCssOnce();

        const wrapper = document.createElement("div");
        wrapper.id = "ph-kek-upload";
        wrapper.style.marginTop = "20px";
        wrapper.style.paddingTop = "15px";
        wrapper.style.borderTop = "1px dashed #aaa";
        wrapper.dataset.activeTab = "grid";

        wrapper.innerHTML = `
        <h6 style="margin-bottom:10px;">Külső feltöltés (kek.sh)</h6>

        <div id="ph-kek-upload-row" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <input type="file" id="ph-kek-file" accept="image/*" style="flex: 1 1 260px; min-width: 220px;">
            <button id="ph-kek-upload-btn" class="btn btn-secondary btn-sm" type="button" style="flex: 0 0 auto;">
                Feltöltés
            </button>
            <span id="ph-kek-status" style="flex: 1 1 200px; min-width: 180px; font-size:0.8rem;"></span>
        </div>

        <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #aaa;">
            <div id="ph-kek-gallery-head" style="position: sticky; top: 0; z-index: 2;
                        padding: 6px 0; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <h6 style="margin:0;">Képeim (kek.sh)</h6>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" id="ph-kek-tab-grid" class="btn btn-secondary btn-sm">Rács</button>
                        <button type="button" id="ph-kek-tab-list" class="btn btn-light btn-sm">Lista</button>
                    </div>
                </div>

                <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                    <div style="display: flex;align-items: center;">
                        <span id="ph-kek-sync-badge"></span>
                    </div>
                    ${ENABLE_GIST_SYNC ? `<button id="ph-kek-sync-now" class="btn btn-light btn-sm">Szinkronizálás</button>` : ``}
                    <button type="button" class="btn btn-light btn-sm" id="ph-kek-clear">Mind törlése</button>
                </div>
            </div>

            <div id="ph-kek-view-grid">
                <div id="ph-kek-empty-grid" style="font-size:12px; color:#666; display:none;">
                    Nincs elmentett kép. Feltöltés után itt fognak megjelenni.
                </div>
                <div id="ph-kek-grid"
                     style="display:flex; flex-wrap:wrap; gap:12px;
                            max-height:${GALLERY_MAX_HEIGHT_PX}px; overflow-y:auto;
                            padding-right:6px;">
                </div>
            </div>

            <div id="ph-kek-view-list" style="display:none;">
                <div id="ph-kek-empty-list" style="font-size:12px; color:#666; display:none;">
                    Nincs elmentett kép. Feltöltés után itt fognak megjelenni.
                </div>
                <div id="ph-kek-list"
                     style="max-height:${GALLERY_MAX_HEIGHT_PX}px; overflow-y:auto; padding-right:6px;">
                </div>
            </div>
        </div>
    `;

        target.appendChild(wrapper);

        // initial
        wrapper.querySelector("#ph-kek-tab-grid").addEventListener("click", () => setActiveTab(wrapper, "grid"));
        wrapper.querySelector("#ph-kek-tab-list").addEventListener("click", () => setActiveTab(wrapper, "list"));
        setActiveTab(wrapper, "grid");
        renderGallery(wrapper);
        updateSyncBadge();

        return wrapper;
    }

    function setStatus(wrapperOrDoc, text) {
        const status = (wrapperOrDoc instanceof HTMLElement)
            ? wrapperOrDoc.querySelector("#ph-kek-status")
            : document.getElementById("ph-kek-status");
        if (status) status.textContent = text || "";
    }

    function getWrapperFromEvent(e) {
        return e.target?.closest?.("#ph-kek-upload") || document.getElementById("ph-kek-upload");
    }

    /* ================= UPLOAD ================= */

    function handleUpload(e) {
        const wrapper = getWrapperFromEvent(e);
        const fileInput = wrapper?.querySelector("#ph-kek-file");

        if (!fileInput?.files?.length) {
            alert("Nincs kiválasztott fájl.");
            return;
        }

        if (!KEK_API_KEY || KEK_API_KEY.includes("IDE_IRD")) {
            alert("Nincs beállítva API kulcs a scriptben.");
            return;
        }

        const file = fileInput.files[0];
        setStatus(wrapper, "Feltöltés...");

        const formData = new FormData();
        formData.append("file", file);

        gmRequest({
            method: "POST",
            url: "https://kek.sh/api/v1/posts",
            headers: { "x-kek-auth": KEK_API_KEY },
            data: formData,
            onload: function (res) {
                if (res.status < 200 || res.status >= 300) {
                    setStatus(wrapper, `❌ HTTP ${res.status}`);
                    return;
                }

                const json = safeJsonParse(res.responseText, null);
                if (!json) {
                    setStatus(wrapper, "❌ JSON parse hiba");
                    return;
                }

                const url = buildImageUrlFromApi(json);
                if (!url) {
                    setStatus(wrapper, "❌ Nem sikerült URL-t találni");
                    return;
                }

                addToGallery({
                    url,
                    filename: json.filename,
                    originalName: file.name,
                    createdAt: json.createdAt || new Date().toISOString(),
                    size: json.size || file.size || null
                });

                setStatus(wrapper, "✔ Feltöltve (elmentve)");
                renderGallery(wrapper);
                updateSyncBadge();
                fileInput.value = "";
            },
            onerror: function () {
                setStatus(wrapper, "❌ Feltöltési hiba");
            }
        });
    }

    /* ================= EVENTS ================= */

    // Delegált kattintások: upload, clear, overlay gombok, lista gombok + gist sync
    document.addEventListener("click", async (e) => {
        const wrapper = getWrapperFromEvent(e);
        if (!wrapper) return;

        const uploadBtn = e.target?.closest?.("#ph-kek-upload-btn");
        const clearBtn = e.target?.closest?.("#ph-kek-clear");
        const tabGrid = e.target?.closest?.("#ph-kek-tab-grid");
        const tabList = e.target?.closest?.("#ph-kek-tab-list");
        const syncNowBtn = e.target?.closest?.("#ph-kek-sync-now");

        const actionBtn = e.target?.closest?.("#ph-kek-upload button[data-action], #ph-kek-grid button[data-action], #ph-kek-list button[data-action]");

        if (uploadBtn) {
            e.preventDefault();
            e.stopPropagation();
            handleUpload(e);
            return;
        }

        if (clearBtn) {
            e.preventDefault();
            e.stopPropagation();
            clearGallery();
            renderGallery(wrapper);
            setStatus(wrapper, "🗑️ Galéria törölve");
            updateSyncBadge();
            return;
        }

        if (tabGrid) {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab(wrapper, "grid");
            return;
        }

        if (tabList) {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab(wrapper, "list");
            return;
        }

        if (syncNowBtn) {
            e.preventDefault();
            e.stopPropagation();

            try {
                gistAvailable = true; // próbáljuk meg
                const wrapper = getWrapperFromEvent(e);
                const data = await pullFromGist();
                memoryCache = Array.isArray(data) ? data : [];
                lsSave(memoryCache);
                renderGallery(wrapper);
                syncState = "gist";
                gistAvailable = true;
                updateSyncBadge();
                setStatus(wrapper, "☁ Frissítve");
            } catch {
                syncState = "error";
                gistAvailable = false;
                setStatus(wrapper, "⚠ Gist sync hiba");
            }
            updateSyncBadge();
            return;
        }

        if (actionBtn) {
            e.preventDefault();
            e.stopPropagation();

            const action = actionBtn.dataset.action;
            const url = actionBtn.dataset.url;
            if (!url) return;

            const editor = findEditorNear(wrapper);

            if (action === "insert-image") {
                const ok = insertHtml(editor, `<img src="${escapeHtml(url)}" alt="">`);
                setStatus(wrapper, ok ? "✔ Kép beszúrva" : "❌ Nem találom az editort");
                return;
            }

            if (action === "insert-link") {
                const ok = insertHtml(editor, buildLinkHtml(url));
                setStatus(wrapper, ok ? "✔ Link beszúrva" : "❌ Nem találom az editort");
                return;
            }

            if (action === "delete") {
                removeFromGallery(url);
                renderGallery(wrapper);
                setStatus(wrapper, "🗑️ Törölve");
                updateSyncBadge();
                return;
            }
        }
    }, true);

    /* ================= INIT ================= */

    let storageInitialized = false;
    let storageInitPromise = null;

    async function initStorageOnce() {
        if (storageInitialized) return;
        if (!storageInitPromise) {
            storageInitPromise = (async () => {
                await initStorage();
            })().finally(() => {
                storageInitialized = true;
            });
        }
        await storageInitPromise;
    }

    function tryMountUi() {
        const target = document.querySelector(".msg-upload-collapse .rtif-upload");
        if (!target) return;

        if (target.querySelector("#ph-kek-upload")) return;

        // Storage init csak egyszer, UI mount csak akkor ha még nincs
        initStorageOnce()
            .then(() => {
                ensureUi(target);
                updateSyncBadge();
            })
            .catch(() => {
                // ha initStorage elhasal, legalább próbáljuk a local fallbackot
                try {
                    memoryCache = lsLoad();
                    syncState = "error";
                } catch { /* noop */ }
                ensureUi(target);
                updateSyncBadge();
            });
    }

    // Csak mountolásra figyelünk; a render/status változások is DOM-mutációk, ezért kell a guard fentebb.
    const observer = new MutationObserver(() => { tryMountUi(); });
    observer.observe(document.body, { childList: true, subtree: true });

    // első indítás
    tryMountUi();

})();

