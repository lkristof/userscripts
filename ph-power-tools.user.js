// ==UserScript==
// @name         Prohardver Fórum – Power Tools
// @namespace    https://github.com/lkristof/userscripts
// @version      2.0.8
// @description  PH Fórum extra funkciók, fejlécbe épített beállításokkal.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/*
// @match        https://mobilarena.hu/*
// @match        https://logout.hu/*
// @match        https://fototrend.hu/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js
//
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      kek.sh
// @connect      api.github.com
// @run-at       document-idle
// ==/UserScript==

(async function () {
    'use strict';

    /************ CONFIG ************/

    const KEYS = {
        SETTINGS: 'ph_forum_settings',

        STATE: {
            HIDDEN_USERS: 'ph_hidden_users',
            HIDE_OFF: 'ph_hide_off',
            WIDE_VIEW: 'ph_wide_view',
            THREAD_VIEW: 'ph_thread_view',
            TOPIC_MAX_ID_MAP: 'ph_topic_max_id_map'
        },

        KEK: {
            GALLERY: 'ph_kek_gallery',
            GALLERY_RESET_TS: 'ph_kek_gallery_reset_ts',
            GALLERY_DELETED: 'ph_kek_gallery_deleted',
            GALLERY_SEEN_RESET_TS: 'ph_kek_gallery_seen_reset_ts'
        },

        SECRETS: 'ph_power_tools_secrets'
    };

    const SYNC_KEYS = [
        KEYS.SETTINGS,
        KEYS.STATE.HIDDEN_USERS,
        KEYS.STATE.TOPIC_MAX_ID_MAP,
        KEYS.KEK.GALLERY,
        KEYS.KEK.GALLERY_RESET_TS,
        KEYS.KEK.GALLERY_DELETED
    ];

    const STORAGE_KEY = KEYS.SETTINGS;
    const SECRETS_KEY = KEYS.SECRETS;

    const secrets = await loadSecrets();

    const GIST_TOKEN = (secrets.gistToken || "").trim();
    const GIST_ID = (secrets.gistId || "").trim();
    const DEFAULT_GIST_FILENAME = "ph_forum_settings.json";
    const GIST_FILENAME = ((secrets.gistFilename || DEFAULT_GIST_FILENAME)).trim();
    const ENABLE_GIST_SYNC = !!(GIST_TOKEN && GIST_ID && GIST_FILENAME);

    const KEK_SH_API_KEY = (secrets.kekShApiKey || "").trim();

    const defaultSettings = {
        colorize: true,
        linkRedirect: true,
        msgAnchorHighlight: true,
        offHider: true,
        wideView: true,
        threadView: true,
        keyboardNavigation: true,
        hideUsers: true,
        markNewPosts: true,
        extraSmilies: true,
        kekShUploader: true
    };

    const settingGroups = {
        appearance: {
            label: 'Megjelenés',
            keys: ['colorize', 'markNewPosts', 'wideView', 'threadView'],
            defaultOpen: true
        },
        filtering: {
            label: 'Szűrés',
            keys: ['offHider', 'hideUsers'],
        },
        interaction: {
            label: 'Interakció',
            keys: ['kekShUploader', 'extraSmilies', 'linkRedirect', 'msgAnchorHighlight', 'keyboardNavigation']
        }
    };

    const tooltips = {
        colorize: 'Saját / rád válaszoló / #akció + avatar fókusz + hozzászólás-lánc kiemelés.',
        linkRedirect: 'PH! lapcsalád linkjeit az aktuális oldalra irányítja.',
        msgAnchorHighlight: 'Kiemeli az URL-ben szereplő #msg hozzászólást.\nHa nem létezik, a hozzá legközelebbit jelöli ki.',
        offHider: 'Az OFF hozzászólásokat a megjelenő gomb segítségével elrejtheted.',
        keyboardNavigation: '← első\n→ utolsó\n↑ előző\n↓ következő\nshift + ↑ sorban előző\nshift + ↓ sorban következő',
        hideUsers: 'Megadhatod, mely felhasználók hozzászólásai legyenek elrejtve.',
        markNewPosts: 'Az új hozzászólások fejléce kap egy kis jelölést.',
        kekShUploader: 'kek.sh-ra képfeltöltés, API kulcs szükséges.'
    };

    function prettyName(key) {
        return {
            colorize: 'Hozzászólások színezése',
            linkRedirect: 'Link átirányítás',
            msgAnchorHighlight: 'Üzenet kiemelés',
            offHider: 'OFF hozzászólások elrejtése',
            wideView: 'Széles nézet',
            threadView: 'Thread nézet',
            keyboardNavigation: 'Billentyűzetes navigáció',
            hideUsers: 'Felhasználók elrejtése',
            markNewPosts: 'Új hozzászólás jelölése',
            extraSmilies: 'Extra smiley-k',
            kekShUploader: 'kek.sh képfeltöltő'
        }[key] || key;
    }

    const storage = createSyncedStorage();
    await storage.init();

    function getMergedSettings() {
        const local = safeJsonParse(storage.getItem(STORAGE_KEY) || '{}', {});
        return { ...defaultSettings, ...local };
    }

    const savedSettings = getMergedSettings();
    let draftSettings = {...savedSettings};

    function hasGM() {
        return (typeof GM_getValue === "function" && typeof GM_setValue === "function")
            || (typeof GM === "object" && typeof GM.getValue === "function" && typeof GM.setValue === "function");
    }

    async function gmGet(key, def) {
        if (typeof GM_getValue === "function") return GM_getValue(key, def);
        if (typeof GM === "object" && typeof GM.getValue === "function") return await GM.getValue(key, def);
        return def;
    }

    async function gmSet(key, val) {
        if (typeof GM_setValue === "function") return GM_setValue(key, val);
        if (typeof GM === "object" && typeof GM.setValue === "function") return await GM.setValue(key, val);
    }

    async function gmDel(key) {
        if (typeof GM_deleteValue === "function") return GM_deleteValue(key);
        if (typeof GM === "object" && typeof GM.deleteValue === "function") return await GM.deleteValue(key);
    }

    function lsLoad() {
        try { return JSON.parse(localStorage.getItem(SECRETS_KEY) || "{}") || {}; }
        catch { return {}; }
    }

    function lsSave(obj) {
        localStorage.setItem(SECRETS_KEY, JSON.stringify(obj || {}));
    }

    function lsClear() {
        localStorage.removeItem(SECRETS_KEY);
    }

    async function loadSecrets() {
        if (hasGM()) {
            const s = await gmGet(SECRETS_KEY, null);
            if (s && typeof s === "object") return s;

            const legacy = lsLoad();
            if (legacy && Object.keys(legacy).length) {
                await gmSet(SECRETS_KEY, legacy);
                return legacy;
            }
            return {};
        }

        return lsLoad();
    }

    async function saveSecrets(secrets) {
        if (hasGM()) return gmSet(SECRETS_KEY, secrets || {});
        return lsSave(secrets);
    }

    async function clearSecrets() {
        if (hasGM()) return gmDel(SECRETS_KEY);
        return lsClear();
    }

    function safeJsonParse(str, fallback) {
        try { return JSON.parse(str); } catch { return fallback; }
    }

    /**
     * Inject / update a <style> tag exactly once.
     * Helps avoid duplicate style tags when the script (or parts of it) re-run.
     */
    function injectStyleOnce(id, cssText) {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('style');
            el.id = id;
            document.head.appendChild(el);
        }
        el.textContent = cssText;
        return el;
    }

    async function fetchGistBlob() {
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `token ${GIST_TOKEN}`
            }
        });
        if (!res.ok) throw new Error(`Gist fetch failed: ${res.status} ${res.statusText}`);
        const data = await res.json();
        const file = data?.files?.[GIST_FILENAME];
        if (!file || typeof file.content !== 'string') return {};
        const blob = safeJsonParse(file.content, {});
        return (blob && typeof blob === 'object') ? blob : {};
    }

    async function pushGistBlob(blob) {
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `token ${GIST_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(blob, null, 2)
                    }
                }
            })
        });
        if (!res.ok) throw new Error(`Gist update failed: ${res.status} ${res.statusText}`);
    }

    function createSyncedStorage() {
        let gistCache = null;
        let pushTimer = null;
        let inited = false;

        const dirtyDeletes = new Set(); // ✅ explicit törlések nyilvántartása

        function keyShouldSync(key) {
            return SYNC_KEYS.includes(key);
        }

        function listLocalKeysToSync() {
            return Array.from(new Set(SYNC_KEYS));
        }

        async function init() {
            if (inited) return;
            inited = true;

            if (!ENABLE_GIST_SYNC) return;

            try {
                gistCache = await fetchGistBlob();

                const remoteKeys = Object.keys(gistCache || {});
                remoteKeys.forEach(k => {
                    if (!keyShouldSync(k)) return;
                    localStorage.setItem(k, JSON.stringify(gistCache[k]));
                });
            } catch (e) {
                console.warn('[PH Power Tools] Gist sync (pull) failed:', e);
            }
        }

        function mergeForKey(key, remoteVal, localVal) {
            // ha valamelyik hiányzik
            if (remoteVal == null) return localVal;
            if (localVal == null) return remoteVal;

            // 1) Topic max id map: slug -> maxId (itt kell a MAX merge!)
            if (key === KEYS.STATE.TOPIC_MAX_ID_MAP) {
                const r = (remoteVal && typeof remoteVal === "object") ? remoteVal : {};
                const l = (localVal && typeof localVal === "object") ? localVal : {};
                const out = { ...r };

                for (const [slug, id] of Object.entries(l)) {
                    const li = parseInt(id, 10);
                    const ri = parseInt(out[slug], 10);
                    if (!Number.isFinite(li)) continue;
                    if (!Number.isFinite(ri) || li > ri) out[slug] = li;
                }
                return out;
            }

            // 2) kek gallery: unió URL alapján, friss rendezés, majd limit
            if (key === KEYS.KEK.GALLERY) {
                const r = Array.isArray(remoteVal) ? remoteVal : [];
                const l = Array.isArray(localVal) ? localVal : [];
                const byUrl = new Map();

                for (const it of [...r, ...l]) {
                    if (!it?.url) continue;
                    const prev = byUrl.get(it.url);
                    // tartsuk meg a "jobb" metaadatot (pl. későbbi createdAt)
                    if (!prev) byUrl.set(it.url, it);
                    else {
                        const pT = Date.parse(prev.createdAt || 0) || 0;
                        const iT = Date.parse(it.createdAt || 0) || 0;
                        byUrl.set(it.url, (iT >= pT) ? { ...prev, ...it } : { ...it, ...prev });
                    }
                }

                const merged = Array.from(byUrl.values())
                    .sort((a, b) => (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0));

                const deleted = safeJsonParse(localStorage.getItem(KEYS.KEK.GALLERY_DELETED) || "{}", {});
                const filtered = merged.filter(it => it?.url && !deleted[it.url]);
                return filtered;
            }

            if (key === KEYS.KEK.GALLERY_DELETED) {
                const r = (remoteVal && typeof remoteVal === "object") ? remoteVal : {};
                const l = (localVal && typeof localVal === "object") ? localVal : {};
                const out = { ...r };

                for (const [url, ts] of Object.entries(l)) {
                    const lt = parseInt(ts, 10);
                    const rt = parseInt(out[url], 10);
                    if (!Number.isFinite(lt)) continue;
                    if (!Number.isFinite(rt) || lt > rt) out[url] = lt;
                }
                return out;
            }

            // Default: maradhat a "local wins"
            return localVal;
        }

        function deepEqualJson(a, b) {
            return JSON.stringify(a) === JSON.stringify(b);
        }

        async function doPushNow() {
            if (!ENABLE_GIST_SYNC) return;

            const keysToSync = listLocalKeysToSync();
            const maxAttempts = 3;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                let remote;
                try {
                    remote = await fetchGistBlob();
                } catch (e) {
                    console.warn('[PH Power Tools] Push aborted (pull failed):', e);
                    return;
                }

                // merge lokál + remote
                const merged = { ...(remote || {}) };

                keysToSync.forEach(k => {
                    const raw = localStorage.getItem(k);

                    if (raw == null) {
                        if (dirtyDeletes.has(k)) delete merged[k];
                    } else {
                        const localVal = safeJsonParse(raw, raw);
                        const remoteVal = merged[k];
                        merged[k] = mergeForKey(k, remoteVal, localVal);
                    }
                });

                try {
                    await pushGistBlob(merged);
                    dirtyDeletes.clear();
                } catch (e) {
                    console.warn('[PH Power Tools] Push failed:', e);
                    return;
                }

                // verify: visszaolvasunk, és megnézzük, tényleg azt látjuk-e, amit felküldtünk
                try {
                    const after = await fetchGistBlob();
                    if (deepEqualJson(after, merged)) return; // kész
                } catch {
                    // ha verify nem sikerül, próbáljuk újra (ritka)
                }

                // kis várakozás + retry (jitter)
                await new Promise(r => setTimeout(r, 150 + Math.floor(Math.random() * 250)));
            }

            console.warn('[PH Power Tools] Push gave up after retries (possible concurrent edits).');
        }

        function schedulePush() {
            if (!ENABLE_GIST_SYNC) return;
            if (pushTimer) clearTimeout(pushTimer);
            pushTimer = setTimeout(() => { doPushNow(); }, 2000);
        }

        return {
            init,
            async flush() {
                // ha van ütemezett push, azt most azonnal futtatjuk
                if (pushTimer) {
                    clearTimeout(pushTimer);
                    pushTimer = null;
                }
                await doPushNow();
            },
            getItem(key) { return localStorage.getItem(key); },
            setItem(key, value) {
                localStorage.setItem(key, value);
                if (keyShouldSync(key)) {
                    dirtyDeletes.delete(key); // ✅ ha újra létrejött, már nem "törlés"
                    schedulePush();
                }
            },
            removeItem(key) {
                localStorage.removeItem(key);
                if (keyShouldSync(key)) {
                    dirtyDeletes.add(key); // ✅ explicit törlés
                    schedulePush();
                }
            }
        };
    }

    function isOnPage(path) {
        const regex = new RegExp('^\\/' + path + '\\/');
        return regex.test(location.pathname);
    }

    function insertHtmlIntoEditor(editorEl, html) {
        const ed = window.tinyMCE?.activeEditor;
        if (ed && typeof ed.insertContent === "function") {
            ed.focus();
            ed.insertContent(html);
            return true;
        }

        if (editorEl) {
            editorEl.focus();
            try {
                return document.execCommand("insertHTML", false, html);
            } catch {
                editorEl.insertAdjacentHTML("beforeend", html);
                return true;
            }
        }
        return false;
    }

    function phPtDetectDark() {
        // 1. dark_base link alapján
        const darkLink = document.querySelector('link[href*="dark_base"]');
        if (darkLink) {
            const media = darkLink.getAttribute("media");
            if (media === "all") return true;
            if (media === "not all") return false;
            if (media?.includes("prefers-color-scheme")) {
                return window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        }

        // 2. Theme button fallback
        const btn = document.querySelector(".theme-button span");
        if (btn) {
            return btn.classList.contains("fa-sun-bright");
        }

        return false;
    }

    function phPtSyncThemeAttr() {
        const isDark = phPtDetectDark();
        document.body.dataset.theme = isDark ? "dark" : "light";
        return isDark;
    }

    function waitForHeader(cb) {
        const el = document.querySelector('#header-sticky .navbar-buttons');
        if (el) return cb(el);

        const obs = new MutationObserver(() => {
            const el = document.querySelector('#header-sticky .navbar-buttons');
            if (el) {
                obs.disconnect();
                cb(el);
            }
        });
        obs.observe(document.body, {childList: true, subtree: true});
    }

    function bindTooltips(rootEl) {
        let tooltip = document.getElementById('ph-pt-global-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'ph-pt-global-tooltip';
            tooltip.className = 'ph-tooltip';
            tooltip.lang = 'hu';
            document.body.appendChild(tooltip);
        }

        rootEl.querySelectorAll('.ph-tooltip-icon').forEach(icon => {
            if (icon.dataset.phTtBound) return;
            icon.dataset.phTtBound = '1';

            icon.addEventListener('mouseenter', () => {
                tooltip.textContent = icon.dataset.tooltip;

                const rect = icon.getBoundingClientRect();
                tooltip.style.left = (rect.right + 5) + 'px';
                tooltip.style.top = rect.top + 'px';
                tooltip.style.display = 'block';
            });

            icon.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    function insertSettingsDropdown(container) {
        if (container.querySelector('#ph-power-tools-dropdown')) return;
        const li = document.createElement('li');
        li.id = 'ph-power-tools-dropdown';
        li.className = 'dropdown';

        li.innerHTML = `
            <a href="javascript:;" class="btn dropdown-toggle ph-power-btn"
                data-toggle="dropdown"
                title="PH Power Tools beállítások">
                <span class="fas fa-sliders-h"></span>
            </a>
            <div class="dropdown-menu dropdown-menu-right p-2 ph-power-menu">
                <h6 class="dropdown-header"
                    style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0;">
                    <span>PH Power Tools</span>
                    <button type="button"
                            id="ph-open-secrets"
                            class="btn btn-forum btn-sm"
                            title="Kulcsok / Szinkron beállítások"
                            style="padding:2px 6px;">
                      <span class="fas fa-cog"></span>
                    </button>
                </h6>
                <div class="ph-accordion">
                    ${Object.entries(settingGroups).map(([groupKey, group], index) => `
                        <div class="ph-acc-group">
                            <div class="ph-acc-header" data-group="${groupKey}">
                                ${group.label}
                                <i class="ph-acc-arrow fas ${group.defaultOpen ? 'fa-caret-down' : 'fa-caret-right'} fa-fw"></i>
                            </div>
                            <div class="ph-acc-body ${group.defaultOpen ? 'open' : ''}">
                                ${group.keys.map(key => `
                                    <a href="javascript:;" 
                                        class="btn btn-forum dropdown-item ${draftSettings[key] ? 'btn-primary' : ''}" 
                                        data-key="${key}">
                                        <span>
                                            ${prettyName(key)}
                                            ${tooltips[key] ? `<i class="fas fa-info-circle ph-tooltip-icon" data-tooltip="${tooltips[key]}"></i>` : ''}
                                        </span>
                                        <span class="ph-toggle-state">
                                            ${draftSettings[key] ? '<span class="fas fa-toggle-on"></span>' : '<span class="fas fa-toggle-off"></span>'}
                                        </span>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="dropdown-divider"></div>
                <button class="btn btn-sm btn-primary btn-block ph-apply-btn" disabled>
                    Alkalmaz
                </button>
            </div>
        `;

        // ===== Secrets modal =====
        if (!document.getElementById('ph-secrets-modal')) {
            const modal = document.createElement('div');
            modal.id = 'ph-secrets-modal';
            modal.style.cssText = `
                position: fixed; inset: 0; z-index: 10050;
                display: none;
                background: rgba(0,0,0,0.45);
                backdrop-filter: blur(2px);
                align-items: center; justify-content: center;
                padding: 16px;
            `;

            modal.innerHTML = `
                <div id="ph-secrets-panel" style="
                    width: min(720px, 100%);
                    background: inherit;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
                    overflow: hidden;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;
                        padding: 12px 14px; border-bottom: 1px solid rgba(0,0,0,0.08);">
                        <div style="font-weight:700;">PH Power Tools – Kulcsok / Szinkron</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span id="ph-sync-status-icon"
                                  title=""
                                  style="
                                    width:10px; height:10px; border-radius:999px;
                                    display:inline-block;
                                    box-shadow: 0 0 0 2px rgba(0,0,0,0.08) inset;
                                    opacity:0.95;">
                            </span>
                            <button type="button" class="btn btn-sm btn-light" id="ph-secrets-close">✕</button>
                        </div>
                    </div>
            
                    <div style="padding: 14px; display:flex; flex-direction:column; gap:10px;">
                        <div style="display:grid; grid-template-columns: 1fr; gap:10px;">
                            <label style="font-size:12px; margin:0;">
                            GitHub Gist Token
                            <input id="ph-secret-gist-token" type="text" class="form-control form-control-sm"
                                   placeholder="ghp_0123456789abcdef...">
                            </label>
                
                            <label style="font-size:12px; margin:0;">
                            Gist ID
                            <input id="ph-secret-gist-id" type="text" class="form-control form-control-sm"
                                   placeholder="0123456789abcdef...">
                            </label>
                
                            <label style="font-size:12px; margin:0;">
                            Gist fájlnév
                            <input id="ph-secret-gist-filename" type="text" class="form-control form-control-sm"
                                 placeholder='pl. ph_forum_settings.json'>
                            </label>
                
                            <label style="font-size:12px; margin:0;">
                            kek.sh API key
                            <a href="https://kek.sh/settings/api"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="margin-left:6px; font-size:11px; text-decoration:none;">
                                [API kulcs itt]
                            </a>
                            <input id="ph-secret-kek-key" type="text" class="form-control form-control-sm"
                                   placeholder="0123456789abcdef...">
                            </label>
                        </div>
                
                        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:6px;">
                            <button type="button" class="btn btn-sm btn-secondary" id="ph-secret-save">Mentés</button>
                            <button type="button" class="btn btn-sm btn-light" id="ph-secret-clear">Törlés</button>
                            <span id="ph-secret-status" style="font-size:12px; opacity:0.85;"></span>
                            <span style="margin-left:auto; font-size:12px; opacity:0.7;">
                                Mentés után újratöltés történik.
                            </span>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        }

        function applySecretsTheme() {
            const panel = document.getElementById('ph-secrets-panel');
            if (!panel) return;

            if (!document.body.dataset.theme) phPtSyncThemeAttr();
            const isDark = document.body.dataset.theme === "dark";

            if (isDark) {
                panel.style.background = "#2b2b2b";
                panel.style.color = "#f1f1f1";
                panel.style.border = "1px solid rgba(255,255,255,0.1)";
            } else {
                panel.style.background = "#ffffff";
                panel.style.color = "#212529";
                panel.style.border = "1px solid rgba(0,0,0,0.1)";
            }
        }

        container.prepend(li);

        const openBtn = li.querySelector('#ph-open-secrets');
        const modal = document.getElementById('ph-secrets-modal');

        async function openSecretsModal() {
            if (!modal) return;
            applySecretsTheme();

            const s = await loadSecrets();

            const syncIcon = modal.querySelector('#ph-sync-status-icon');
            if (syncIcon) {
                const active = !!(
                    (s.gistToken || '').trim() &&
                    (s.gistId || '').trim() &&
                    ((s.gistFilename || DEFAULT_GIST_FILENAME).trim())
                );

                if (active) {
                    syncIcon.style.background = 'limegreen';
                    syncIcon.title = 'Szinkron: aktív (Gist beállítva)';
                } else {
                    syncIcon.style.background = '#9aa0a6';
                    syncIcon.title = 'Szinkron: inaktív (hiányzó Gist adatok)';
                }
            }

            modal.querySelector('#ph-secret-gist-token').value = s.gistToken || '';
            modal.querySelector('#ph-secret-gist-id').value = s.gistId || '';
            modal.querySelector('#ph-secret-gist-filename').value = s.gistFilename || DEFAULT_GIST_FILENAME;
            modal.querySelector('#ph-secret-kek-key').value = s.kekShApiKey || '';
            modal.querySelector('#ph-secret-status').textContent = '';

            modal.style.display = 'flex';
        }

        function closeSecretsModal() {
            if (!modal) return;
            modal.style.display = 'none';
        }

        openBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation(); // ne zárja be a dropdownot
            await openSecretsModal();
        });

        // háttérre katt = bezár
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) closeSecretsModal();
        });

        // X gomb = bezár
        modal?.querySelector('#ph-secrets-close')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeSecretsModal();
        });

        // ESC = bezár
        if (!document.body.dataset.phSecretsEscBound) {
            document.body.dataset.phSecretsEscBound = "1";
            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('ph-secrets-modal');
                if (e.key === 'Escape' && modal?.style.display === 'flex') {
                    modal.style.display = 'none';
                }
            });
        }

        // mentés
        modal?.querySelector('#ph-secret-save')?.addEventListener('click', async (e) => {
            e.preventDefault();

            const inToken = modal.querySelector('#ph-secret-gist-token');
            const inId = modal.querySelector('#ph-secret-gist-id');
            const inFn = modal.querySelector('#ph-secret-gist-filename');
            const inKek = modal.querySelector('#ph-secret-kek-key');
            const st = modal.querySelector('#ph-secret-status');

            await saveSecrets({
                gistToken: (inToken?.value || '').trim(),
                gistId: (inId?.value || '').trim(),
                gistFilename: (inFn?.value || '').trim(),
                kekShApiKey: (inKek?.value || '').trim(),
            });

            if (st) st.textContent = '✅ Mentve. Frissítek…';
            setTimeout(() => location.reload(), 250);
        });

        // törlés
        modal?.querySelector('#ph-secret-clear')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await clearSecrets();

            const st = modal.querySelector('#ph-secret-status');
            if (st) st.textContent = '🗑️ Törölve. Frissítek…';
            setTimeout(() => location.reload(), 250);
        });

        // Egyszerű custom tooltip (csak a mi dropdownunkon belül)
        bindTooltips(li);

        const toggleBtn = li.querySelector('.ph-power-btn');
        const applyBtn = li.querySelector('.ph-apply-btn');

        toggleBtn.addEventListener('click', () => {
            setTimeout(() => {
                toggleBtn.blur();

                li.querySelectorAll('.ph-acc-body.open').forEach(body => {
                    body.style.maxHeight = body.scrollHeight + "px";
                });
            }, 50);
        });

        // Dropdown item click
        li.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', e => {
                e.stopPropagation();

                const key = item.dataset.key;
                draftSettings[key] = !draftSettings[key];

                item.classList.toggle('btn-primary', draftSettings[key]);
                item.querySelector('.ph-toggle-state').innerHTML = draftSettings[key] ? '<span class="fas fa-toggle-on"></span>' : '<span class="fas fa-toggle-off"></span>';

                applyBtn.disabled =
                    JSON.stringify(draftSettings) === JSON.stringify(savedSettings);
            });
        });

        const menu = li.querySelector('.dropdown-menu');
        menu.addEventListener('click', e => e.stopPropagation());

        applyBtn.addEventListener('click', async () => {
            storage.setItem(STORAGE_KEY, JSON.stringify(draftSettings));
            await storage.flush();
            li.querySelector('.dropdown-toggle').click();
            location.reload();
        });

        // Accordion toggle (animated)
        li.querySelectorAll('.ph-acc-header').forEach(header => {
            header.addEventListener('click', (e) => {

                e.stopPropagation();

                const allBodies = li.querySelectorAll('.ph-acc-body');
                const allArrows = li.querySelectorAll('.ph-acc-arrow');

                const body = header.nextElementSibling;
                const arrow = header.querySelector('.ph-acc-arrow');

                const isOpen = body.classList.contains('open');

                // close all
                allBodies.forEach(b => {
                    b.style.maxHeight = null;
                    b.classList.remove('open');
                });

                allArrows.forEach(a => {
                    a.classList.remove('fa-caret-down');
                    a.classList.add('fa-caret-right');
                });

                // open clicked if it wasn't open
                if (!isOpen) {
                    body.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + "px";
                    arrow.classList.remove('fa-caret-right');
                    arrow.classList.add('fa-caret-down');
                }
            });
        });
    }

    function runModule(name, fn) {
        if (typeof fn !== 'function') {
            console.warn(`[PH Power Tools] Module missing: ${name}`);
            return;
        }
        try {
            fn();
        } catch (e) {
            console.error(`[PH Power Tools] Module failed: ${name}`, e);
        }
    }

    function initThemeSync() {
        phPtSyncThemeAttr();

        // 1) matchMedia listener: bind-once
        if (!document.documentElement.dataset.phPtThemeMqBound) {
            document.documentElement.dataset.phPtThemeMqBound = '1';
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const onChange = () => {
                phPtSyncThemeAttr();
                document.dispatchEvent(new Event("ph-pt-theme-changed"));
            };
            if (mq.addEventListener) mq.addEventListener('change', onChange);
            else if (mq.addListener) mq.addListener(onChange);
        }

        // 2) dark_base observer: attach when link exists, also bind-once
        if (document.documentElement.dataset.phPtThemeDarkLinkBound) return;
        const phPtDarkLink = document.querySelector('link[href*="dark_base"]');
        if (!phPtDarkLink) return;

        document.documentElement.dataset.phPtThemeDarkLinkBound = '1';
        const obs = new MutationObserver(() => {
            phPtSyncThemeAttr();
            document.dispatchEvent(new Event("ph-pt-theme-changed"));
        });
        obs.observe(phPtDarkLink, {attributes: true, attributeFilter: ["media"]});
    }

    function injectBaseStyle() {
        injectStyleOnce('ph-pt-base-style', `
            li.media {
                position: relative;
                z-index: 1;
            }
            li.media:has(.dropdown-menu.show),
            li.media:focus-within {
                z-index: 100 !important;
            }
            .ph-acc-header {
                font-weight: 600;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s ease;
            }
            .ph-acc-header:hover {
                background: color-mix(in srgb, currentColor 8%, transparent);
            }
            .ph-acc-body {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.5s ease;
            }
            .ph-acc-body .dropdown-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                padding: 4px 10px;
            }
            .ph-power-menu {
                min-width: 260px;
                max-height: 70vh;
                overflow-y: auto;
            }
            .ph-tooltip {
                white-space: pre-line;
                hyphens: auto;
                overflow-wrap: break-word;
                position: fixed;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 9999;
                display: none;
                pointer-events: none;
                max-width: 280px;
            }
            .ph-tooltip-icon {
                margin-left: 5px;
                cursor: pointer;
            }
            @media only screen and (max-width: 991.98px) {
                .ph-power-btn + .dropdown-menu {
                    display: none !important;
                    position: absolute !important;
                    left: 0 !important;
                }
                .ph-power-btn + .dropdown-menu.show {
                    display: block !important;
                }
                .ph-acc-body .dropdown-item {
                    padding: 10px 10px;
                }
            }
        `);
    }

    function waitForHeaderAsync() {
        return new Promise(resolve => waitForHeader(resolve));
    }

    async function mountHeaderUi() {
        const headerEl = await waitForHeaderAsync();
        insertSettingsDropdown(headerEl);
    }

    async function initApp() {
        initThemeSync();
        injectBaseStyle();
        await mountHeaderUi();
        runEnabledModules();
    }

    await initApp();

    function runEnabledModules() {
        const isTema = isOnPage("tema");
        const isPrivat = isOnPage("privat");
        if (!isTema && !isPrivat) return;

        const modules = [
            { name: "colorize", when: () => isTema && savedSettings.colorize, fn: colorize },
            { name: "markNewPosts", when: () => isTema && savedSettings.markNewPosts, fn: markNewPosts },
            { name: "linkRedirect", when: () => isTema && savedSettings.linkRedirect, fn: linkRedirect },
            { name: "msgAnchorHighlight", when: () => isTema && savedSettings.msgAnchorHighlight, fn: msgAnchorHighlight },
            { name: "offHider", when: () => isTema && savedSettings.offHider, fn: offHider },
            { name: "wideView", when: () => isTema && savedSettings.wideView, fn: wideView },
            { name: "threadView", when: () => isTema && savedSettings.threadView, fn: threadView },
            { name: "keyboardNavigation", when: () => isTema && savedSettings.keyboardNavigation, fn: keyboardNavigation },
            { name: "hideUsers", when: () => isTema && savedSettings.hideUsers, fn: hideUsers },

            { name: "extraSmilies", when: () => (isTema || isPrivat) && savedSettings.extraSmilies, fn: extraSmilies },
            { name: "kekShUploader", when: () => (isTema || isPrivat) && savedSettings.kekShUploader, fn: kekShUploader },
        ];

        for (const m of modules) {
            if (m.when()) runModule(m.name, m.fn);
        }
    }

    function colorize() {
        /**********************
         * BEÁLLÍTÁSOK
         **********************/
        const FELHASZNALO = (() => {
            const el = document.querySelector('.dropdown-menu h6 a[href^="/tag/"]');
            return el ? el.textContent.trim() : "__NINCS_BEJELENTKEZVE__";
        })();
        const AKCIO_KEYWORDS = ["#akció", "#akcio"];

        let selectedUser = null;
        let activeChainIds = new Set();

        function injectColorizeCssOnce() {
            injectStyleOnce("ph-pt-colorize-style", `
                body[data-theme="light"] {
                    --ph-pt-own: #C7D7E0;
                    --ph-pt-reply: #CFE0C3;
                    --ph-pt-akcio: #FFC0C0;
                    --ph-pt-focus-author: #FFA966;
                    --ph-pt-focus-reply:  #F6CEAF;
                    --ph-pt-chain-bg: #FFF6C8;
                    --ph-pt-chain-border: #FF9800;
                }
                body[data-theme="dark"] {
                    --ph-pt-own: #2F4A57;
                    --ph-pt-reply: #344A3A;
                    --ph-pt-akcio: #8B0000;
                    --ph-pt-focus-author: #5B327A;
                    --ph-pt-focus-reply:  #3A1F4F;
                    --ph-pt-chain-bg: #4A4015;
                    --ph-pt-chain-border: #FFB300;
                }
                .msg .msg-body.ph-pt-colorize {
                    transition: all 0.2s ease;
                } 
               .msg .msg-body.ph-pt-akcio        { background-color: var(--ph-pt-akcio) !important; }
               .msg .msg-body.ph-pt-own          { background-color: var(--ph-pt-own) !important; }
               .msg .msg-body.ph-pt-reply        { background-color: var(--ph-pt-reply) !important; }
               .msg .msg-body.ph-pt-focus-author { background-color: var(--ph-pt-focus-author) !important; }
               .msg .msg-body.ph-pt-focus-reply  { background-color: var(--ph-pt-focus-reply) !important; }
         
               .msg .msg-body.ph-pt-chain {
                   background-color: var(--ph-pt-chain-bg) !important;
                   box-shadow: inset 5px 0 0 0 var(--ph-pt-chain-border) !important;
               }
               .msg-head-options .ph-pt-chain-link .ph-pt-chain-text { margin-left: 4px; }
               .msg-head-options .ph-pt-chain-link:hover .ph-pt-chain-text { text-decoration: underline; }
            `);
        }

        injectColorizeCssOnce();

        if (!document.body.dataset.phPtColorizeThemeBound) {
            document.body.dataset.phPtColorizeThemeBound = "1";
            document.addEventListener("ph-pt-theme-changed", () => {
                recolorAll();
            });
        }

        const lower = s => (s || "").toString().trim().toLowerCase();

        /**********************
         * SEGÉDEK
         **********************/
        function getAuthor(msg) {
            return msg.querySelector(".msg-head-author .user-title a")?.textContent?.trim() || "";
        }

        function getRepliedTo(msg) {
            return msg.querySelector(".msg-head-replied .user-title a")?.textContent?.trim() || "";
        }

        function getAllLis() {
            return Array.from(document.querySelectorAll("li.media[data-id]"));
        }

        /**********************
         * LÁNC LOGIKA
         **********************/
        function buildChain(startLi) {
            activeChainIds.clear();

            const all = getAllLis();
            const byId = Object.fromEntries(all.map(li => [li.dataset.id, li]));

            const startId = startLi.dataset.id;
            activeChainIds.add(startId);

            // ⬆ felfelé
            let current = startLi;
            while (current.dataset.rplid) {
                const prev = byId[current.dataset.rplid];
                if (!prev) break;
                activeChainIds.add(prev.dataset.id);
                current = prev;
            }

            // ⬇ lefelé
            function findReplies(parentId) {
                all.forEach(li => {
                    if (li.dataset.rplid === parentId && !activeChainIds.has(li.dataset.id)) {
                        activeChainIds.add(li.dataset.id);
                        findReplies(li.dataset.id);
                    }
                });
            }

            findReplies(startId);
        }

        /**********************
         * FŐ SZÍNEZÉS
         **********************/
        function recolorAll() {
            document.querySelectorAll(".msg").forEach(msg => {
                const body = msg.querySelector(".msg-body");
                if (!body) return;

                // base class
                body.classList.add("ph-pt-colorize");

                // reset state classes
                body.classList.remove(
                    "ph-pt-akcio",
                    "ph-pt-own",
                    "ph-pt-reply",
                    "ph-pt-focus-author",
                    "ph-pt-focus-reply",
                    "ph-pt-chain"
                );

                const text = lower(body.textContent);
                const author = getAuthor(msg);
                const replied = getRepliedTo(msg);

                const li = msg.closest("li.media[data-id]");
                const msgId = li?.dataset?.id;

                // 1) #akció
                if (AKCIO_KEYWORDS.some(k => text.includes(k))) {
                    body.classList.add("ph-pt-akcio");
                }

                // 2) Avatar fókusz (prioritásban felülír mindent, mint eddig)
                if (selectedUser) {
                    if (author === selectedUser) {
                        body.classList.add("ph-pt-focus-author");
                        return;
                    }
                    if (replied === selectedUser) {
                        body.classList.add("ph-pt-focus-reply");
                        return;
                    }
                }

                // 3) Lánc kiemelés
                if (msgId && activeChainIds.has(msgId)) {
                    body.classList.add("ph-pt-chain");
                    return;
                }

                // 4) Saját / válasz
                if (lower(author) === lower(FELHASZNALO)) {
                    body.classList.add("ph-pt-own");
                } else if (lower(replied) === lower(FELHASZNALO)) {
                    body.classList.add("ph-pt-reply");
                }
            });
        }

        /**********************
         * AVATAR KATTINTÁS
         **********************/
        function onAvatarClick(e) {
            e.preventDefault();
            e.stopPropagation();

            const msg = e.target.closest(".msg");
            if (!msg) return;

            const author = getAuthor(msg);
            if (!author) return;

            activeChainIds.clear();

            selectedUser = (selectedUser === author) ? null : author;
            recolorAll();
        }

        function attachAvatarHandlers() {
            const selectors = [
                ".msg-user img",           // Desktop/Normál avatar a body-ban
                ".user-face-circle img"    // Mobilos/Fejléc avatar a kör alakú wrapper-ben
            ];

            document.querySelectorAll(selectors.join(", ")).forEach(img => {
                img.style.cursor = "pointer";
                img.removeEventListener("click", onAvatarClick);
                img.addEventListener("click", onAvatarClick);
            });
        }

        /**********************
         * LÁNC LINK
         **********************/
        function attachChainLinks() {
            document.querySelectorAll(".msg-head-options").forEach(opts => {
                if (opts.querySelector(".ph-pt-chain-link")) return;

                const wrapper = document.createElement("span");
                wrapper.className = "ph-pt-chain-link";

                wrapper.style.cursor = "pointer";
                wrapper.style.marginLeft = "8px";
                wrapper.style.display = "inline-flex";
                wrapper.style.alignItems = "center";

                wrapper.innerHTML = `
                    <span class="fas fa-link fa-fw"></span>
                    <span class="ph-pt-chain-text">Lánc</span>
                `;

                wrapper.addEventListener("click", e => {
                    e.preventDefault();
                    e.stopPropagation();

                    const li = opts.closest("li.media[data-id]");
                    if (!li) return;

                    // HA LÁNCRA KATTINTASZ: Töröljük a kijelölt felhasználót
                    selectedUser = null;

                    if (activeChainIds.has(li.dataset.id)) {
                        activeChainIds.clear();
                    } else {
                        buildChain(li);
                    }

                    recolorAll();
                });

                opts.prepend(wrapper);
            });
        }

        /**********************
         * INIT
         **********************/
        function init() {
            attachAvatarHandlers();
            attachChainLinks();
            recolorAll();
        }

        const observer = new MutationObserver(init);
        observer.observe(document.body, {childList: true, subtree: true});

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, {once: true});
        } else {
            init();
        }
    }

    function linkRedirect() {
        // Konfiguráció
        const phDomains = ["prohardver.hu", "mobilarena.hu", "gamepod.hu", "itcafe.hu", "logout.hu", "fototrend.hu"];
        const forbiddenPaths = ["/fooldal", "/nyeremenyjatek", "/cikk", "/hir", "/teszt"];

        // Segédfüggvény: Eldönti, hogy a linket cserélni kell-e
        function shouldRedirect(urlObj) {
            // 1. Ha nem a PH! családból való, ne bántsuk
            const isPhSite = phDomains.some(d =>
                urlObj.hostname === d || urlObj.hostname.endsWith("." + d)
            );

            if (!isPhSite) return false;

            // 2. Ha már eleve a jó domainen vagyunk, ne bántsuk
            if (urlObj.hostname === location.hostname) return false;

            // 3. Logout specifikus kivétel (csak a fórum témákat irányítjuk át, a cikkeket nem)
            if ((urlObj.hostname === "logout.hu" || urlObj.hostname.endsWith(".logout.hu")) &&
                !urlObj.pathname.startsWith("/tema") &&
                !urlObj.pathname.startsWith("/tag")) {
                return false;
            }

            // 4. Tiltott útvonalak (pl. cikkek, amik nem léteznek a másik domainen)
            if (forbiddenPaths.some(p => urlObj.pathname.startsWith(p))) {
                return false;
            }

            // 5. Ha a főoldalra mutat (nincs útvonal), ne cseréljük
            if (urlObj.pathname === "/" || urlObj.pathname === "") {
                return false;
            }

            return true;
        }

        // A tényleges csere logikája
        function processLinks(rootNode) {
            const links = rootNode.querySelectorAll('a[href^="http"]');

            links.forEach(link => {
                try {
                    const url = new URL(link.href);

                    if (shouldRedirect(url)) {
                        url.hostname = location.hostname;
                        link.href = url.href;

                        // Opcionális: jelöljük meg, hogy lássuk, mit cseréltünk (debug)
                        // link.style.borderBottom = "2px dotted green";
                    }
                } catch (e) {
                    // Érvénytelen URL esetén ne omoljon össze
                }
            });
        }

        // 1. Futás az oldal betöltésekor
        processLinks(document.body);

        // 2. MutationObserver a dinamikusan betöltődő kommentekhez (AJAX)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        // Csak elem típusú node-okkal foglalkozunk (pl. div, span), text node-okkal nem
                        if (node.nodeType === 1) {
                            processLinks(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function msgAnchorHighlight() {
        /**********************
         * CSS
         **********************/
        injectStyleOnce("ph-pt-link-redirect-style", `
            body[data-theme="light"] .msg-list .msg .msg-body.hash-highlight {
                background-color: #FFF6C8 !important;
                transition: background 0.2s ease;
            }
            body[data-theme="dark"] .msg-list .msg .msg-body.hash-highlight {
                background-color: #4A4015 !important;
                transition: background 0.2s ease;
            }
            html {
                scroll-behavior: smooth;
            }
        `);

        /**********************
         * HASH KIEMELÉS
         **********************/
        let lastHashMsgId = null;
        let lastHash = null;

        function getPosts() {
            return [...document.querySelectorAll('li.media[data-id]')];
        }

        function findClosestPost(posts, targetId) {
            let closest = null;
            let minDiff = Infinity;

            posts.forEach(li => {
                const id = parseInt(li.dataset.id, 10);
                if (Number.isNaN(id)) return;

                const diff = Math.abs(id - targetId);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = li;
                }
            });

            return closest;
        }

        function highlightHashMsg() {
            const hash = window.location.hash;
            let msgId = null;

            if (hash && hash.startsWith("#msg")) {
                msgId = Number(hash.replace("#msg", ""));
                if (!Number.isNaN(msgId)) {
                    lastHashMsgId = msgId;
                }
            } else if (lastHashMsgId !== null) {
                msgId = lastHashMsgId;
            } else {
                return;
            }

            document.querySelectorAll(".msg-body.hash-highlight")
                .forEach(b => b.classList.remove("hash-highlight"));

            let body = document.querySelector(
                `li.media[data-id="${msgId}"] .msg-body`
            );

            if (!body) {
                body = findClosestPost(getPosts(), msgId)?.querySelector('.msg-body');
            }

            if (!body) return;
            body.classList.add("hash-highlight");
        }

        function onHashChange() {
            if (window.location.hash === lastHash) return;
            lastHash = window.location.hash;
            highlightHashMsg();
        }

        /**********************
         * DUPLA KATT: kijelölés
         **********************/
        document.addEventListener("dblclick", (e) => {
            const header = e.target.closest(".msg-header");
            if (!header) return;

            const li = header.closest("li.media[data-id]");
            if (!li) return;

            const id = li.dataset.id;
            if (!id) return;

            e.preventDefault();
            location.hash = "#msg" + id;
        });

        /**********************
         * INIT
         **********************/
        function init() {
            lastHash = window.location.hash;
            highlightHashMsg();

            if (lastHash) {
                setTimeout(() => {
                    window.location.hash = lastHash;
                }, 0);
            }
        }

        window.addEventListener("hashchange", onHashChange);

        const observer = new MutationObserver(init);
        observer.observe(document.body, { childList: true, subtree: true });

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
            init();
        }
    }

    function offHider() {
        injectStyleOnce("ph-pt-off-hider-style", `
            .off-post-animate {
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
                overflow: hidden !important;
                display: block !important;
            }
            .off-post-hidden {
                opacity: 0 !important;
                max-height: 0 !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                border-top-width: 0 !important;
                border-bottom-width: 0 !important;
                pointer-events: none !important;
            }
        `);

        const STORAGE_KEY = KEYS.STATE.HIDE_OFF;
        const STATUS = { ON: 'enabled', OFF: 'disabled' };

        let offHidden = storage.getItem(STORAGE_KEY) === STATUS.ON;
        const buttons = [];

        function getOffPosts() {
            return Array.from(document.querySelectorAll('.msg, .topic, .msg-off')).filter(post =>
                post.textContent.includes('[OFF]') || post.classList.contains('msg-off')
            );
        }

        function applyVisibility(isInitial = false) {
            getOffPosts().forEach(post => {
                if (offHidden) {
                    if (isInitial) {
                        post.style.display = 'none';
                        post.classList.add('off-post-hidden');
                    } else {
                        // Elrejtés animációval
                        post.style.maxHeight = post.scrollHeight + "px";
                        post.classList.add('off-post-animate');
                        requestAnimationFrame(() => {
                            post.classList.add('off-post-hidden');
                        });
                    }
                } else {
                    // Megjelenítés animációval
                    if (isInitial) {
                        post.style.display = '';
                        post.classList.remove('off-post-hidden');
                    } else {
                        if (post.style.display === 'none') {
                            post.style.display = '';
                        }
                        post.classList.add('off-post-animate');
                        // Kiszámoljuk a célmagasságot
                        const targetHeight = post.scrollHeight;

                        requestAnimationFrame(() => {
                            post.classList.remove('off-post-hidden');
                            post.style.maxHeight = targetHeight + "px";
                        });

                        // Tisztítás az animáció végén
                        setTimeout(() => {
                            if (!offHidden) {
                                post.classList.remove('off-post-animate');
                                post.style.maxHeight = '';
                            }
                        }, 500);
                    }
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
                storage.setItem(
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

        applyVisibility(true);
        updateAllButtons();
    }

    function wideView() {
        const LEFT_PX = 230;
        const RIGHT_PX = 230;
        const GAP_PX = 0;
        const SIDE_MARGIN_RATIO = 0.20;
        const MIN_CENTER_PX = 710;

        const STYLE_ID = 'ph-wide-center-style';
        const ROW_CLASS = 'ph-center-row';
        const STORAGE_KEY = KEYS.STATE.WIDE_VIEW;

        const STATUS = { ON: 'enabled', OFF: 'disabled' };
        const buttons = [];

        function calculateLayout() {
            const viewport = window.innerWidth;
            const usable = viewport * (1 - getSideMarginRatio());
            const center = Math.max(
                MIN_CENTER_PX,
                usable - LEFT_PX - RIGHT_PX - (2 * GAP_PX)
            );

            return {
                total: LEFT_PX + center + RIGHT_PX + (2 * GAP_PX),
                center
            };
        }

        function getSideMarginRatio() {
            const w = window.innerWidth;
            if (w < 1400) return 0.10;
            if (w < 1800) return 0.15;
            return SIDE_MARGIN_RATIO;
        }

        function buildCSS() {
            const { total, center } = calculateLayout();

            return `
                .container, .container-fluid, #container, .site-container {
                    max-width: ${total}px !important;
                    width: ${total}px !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                }
                .${ROW_CLASS} {
                    display: flex !important;
                    flex-wrap: nowrap !important;
                    justify-content: center !important;
                    gap: ${GAP_PX}px !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                }
                #left {
                    width: ${LEFT_PX}px !important;
                    flex: 0 0 ${LEFT_PX}px !important;
                }
                #center {
                    width: ${center}px !important;
                    flex: 0 0 ${center}px !important;
                }
                #right {
                    width: ${RIGHT_PX}px !important;
                    flex: 0 0 ${RIGHT_PX}px !important;
                }
            `;
        }

        function applyLayout() {
            let style = document.getElementById(STYLE_ID);
            if (!style) {
                style = document.createElement('style');
                style.id = STYLE_ID;
                document.documentElement.appendChild(style);
            }
            style.textContent = buildCSS();

            const center = document.querySelector('#center');
            const row = center?.closest('.row');
            if (row) row.classList.add(ROW_CLASS);
        }

        function removeLayout() {
            document.getElementById(STYLE_ID)?.remove();
            const center = document.querySelector('#center');
            const row = center?.closest('.row');
            row?.classList.remove(ROW_CLASS);
        }

        function isActive() {
            return !!document.getElementById(STYLE_ID);
        }

        function saveState(active) {
            storage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
        }

        function shouldBeActive() {
            return storage.getItem(STORAGE_KEY) === STATUS.ON;
        }

        window.addEventListener('resize', () => {
            if (isActive()) applyLayout();
        });

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.innerHTML = `<span class="fas fa-expand-arrows-alt fa-fw"></span> Széles nézet`;

            function updateUI() {
                btn.title = isActive() ? 'Eredeti szélesség' : 'Szélesebb nézet';
                btn.classList.toggle('btn-primary', isActive());
            }

            btn.addEventListener('click', e => {
                e.preventDefault();
                isActive() ? removeLayout() : applyLayout();
                saveState(isActive());
                updateAllButtons();
            });

            btn._update = updateUI;
            updateUI();
            return btn;
        }

        function updateAllButtons() { buttons.forEach(btn => btn._update()); }

        function init() {
            const headers = document.querySelectorAll('h4.list-message');
            if (!headers.length) return false;

            headers.forEach(header => {
                const btn = createToggleButton();
                buttons.push(btn);
                header.appendChild(btn);
            });

            if (shouldBeActive()) {
                applyLayout();
                updateAllButtons();
            }

            return true;
        }

        if (!init()) {
            const observer = new MutationObserver(() => {
                if (init()) observer.disconnect();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    function threadView() {
        const INDENT       = 10;
        const LINE_COLOR   = "#C1BFB6";
        const LINE_OPACITY = 1;
        const LINE_THICK   = 1;
        const STORAGE_KEY  = KEYS.STATE.THREAD_VIEW;
        const STATUS       = { ON: 'enabled', OFF: 'disabled' };

        let threadContainerHeader = null;
        let threadActive = false;
        const buttons = [];

        injectStyleOnce("ph-pt-thread-view-style", `
            li.media {
                transition: transform 300ms ease, opacity 200ms ease;
                will-change: transform;
            }
            li.media.ph-thread {
                position: relative;
                z-index: 1;
                box-sizing: border-box;
            }
            li.media.ph-thread:hover {
                z-index: 10;
            }
            li.media.ph-thread:has(.dropdown-menu.show),
            li.media.ph-thread:focus-within {
                z-index: 100 !important;
            }
            .thread-lines {
                position: absolute;
                top: 0;
                bottom: 0;
                pointer-events: none;
                left: 0;
            }
            .thread-line-vert {
                position: absolute;
                top: 0;
                bottom: 0;
                width: ${LINE_THICK}px;
                background: ${LINE_COLOR};
                opacity: ${LINE_OPACITY};
                border-radius: ${LINE_THICK}px;
            }
            .thread-line-horiz {
                position: absolute;
                top: 0;
                left: 0;
                width: ${INDENT}px;
                height: 50%;
                border-left: ${LINE_THICK}px solid ${LINE_COLOR};
                border-bottom: ${LINE_THICK}px solid ${LINE_COLOR};
                border-bottom-left-radius: ${INDENT}px;
                opacity: ${LINE_OPACITY};
                box-sizing: border-box;
            }
        `);

        function saveState(active) {
            storage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
        }

        function shouldBeActive() {
            return storage.getItem(STORAGE_KEY) === STATUS.ON;
        }

        function renderThreading() {
            if (threadActive) return;
            if (!threadContainerHeader) return;

            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            // Adatgyűjtés
            const allMedia = [...ul.querySelectorAll('li.media')];
            const items = allMedia.filter(li => li.dataset.id);

            if (!items.length) return;

            const postMap = {}, childrenMap = {}, allIds = new Set();
            items.forEach(li => {
                allIds.add(li.dataset.id);
                postMap[li.dataset.id] = li;
            });

            items.forEach(li => {
                const id = li.dataset.id;
                let parent = li.dataset.rplid || null;
                if (parent && !allIds.has(parent)) parent = null;
                if (!childrenMap[parent]) childrenMap[parent] = [];
                childrenMap[parent].push(id);
            });

            // Ürítés és újraépítés
            animateReorder(ul, () => {
                ul.innerHTML = '';
                (childrenMap[null] || []).forEach(id =>
                    renderThread(id, 0, [])
                );
            });

            // Rekurzív renderelő
            function renderThread(id, depth, ancestorPath = []) {
                const el = postMap[id];
                if (!el) return;

                el.classList.add('ph-thread');
                const currentIndent = depth * INDENT;
                el.style.setProperty('--indent', currentIndent + 'px');
                el.style.marginLeft = "0px";
                el.style.paddingLeft = currentIndent + "px";

                if (depth > 0) {
                    let box = el.querySelector('.thread-lines');
                    if (!box) {
                        box = document.createElement('div');
                        box.className = 'thread-lines';
                        el.appendChild(box);
                    }
                    box.innerHTML = '';

                    for (let d = 0; d < depth - 1; d++) {
                        if (ancestorPath[d]) continue;
                        const vert = document.createElement('div');
                        vert.className = 'thread-line-vert';
                        vert.style.left = (d * INDENT) + 'px';
                        box.appendChild(vert);
                    }

                    if (!ancestorPath[depth - 1]) {
                        const vert = document.createElement('div');
                        vert.className = 'thread-line-vert';
                        vert.style.left = ((depth - 1) * INDENT) + 'px';
                        box.appendChild(vert);
                    }

                    // Könyök az aktuális elemhez
                    const elbow = document.createElement('div');
                    elbow.className = 'thread-line-horiz';
                    elbow.style.left = ((depth - 1) * INDENT) + 'px';
                    box.appendChild(elbow);
                }

                ul.appendChild(el);

                const children = childrenMap[id] || [];
                children.forEach((childId, i) => {
                    const isLastChild = (i === children.length - 1);
                    renderThread(childId, depth + 1, [...ancestorPath, isLastChild]);
                });
            }

            // Indítás a gyökér szintű elemekkel
            (childrenMap[null] || []).forEach(id => renderThread(id, 0, []));

            threadActive = true;
            saveState(true);
        }

        let originalOrder = [];

        function initOriginalOrder() {
            if (!threadContainerHeader) return;
            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            originalOrder = [...ul.querySelectorAll('li.media')];
        }

        function restoreOriginalOrder() {
            if (!threadContainerHeader) return;

            let ul = threadContainerHeader.nextElementSibling;
            while (ul && !(ul.tagName === 'UL' && ul.classList.contains('list-unstyled'))) {
                ul = ul.nextElementSibling;
            }
            if (!ul) return;

            // A teljes folyamatot az animateReorder-re bízzuk
            animateReorder(ul, () => {
                // 1. Töröljük a threading-hez kapcsolódó stílusokat és elemeket
                originalOrder.forEach(li => {
                    li.classList.remove('ph-thread');
                    li.style.marginLeft = '';
                    li.style.paddingLeft = '';
                    li.style.setProperty('--indent', '0px');
                    const box = li.querySelector('.thread-lines');
                    if (box) box.remove();
                });

                // 2. Visszahelyezzük őket az eredeti sorrendbe
                ul.innerHTML = '';
                originalOrder.forEach(li => ul.appendChild(li));
            });

            threadActive = false;
            saveState(false);
        }

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.style.marginLeft = '5px';
            btn.innerHTML = `<span class="fas fa-project-diagram fa-fw"></span> Thread nézet`;

            function updateButtonUI() {
                btn.classList.toggle('btn-primary', threadActive);
                btn.title = threadActive ? 'Thread nézet kikapcsolása' : 'Thread nézet bekapcsolása';
            }

            btn.addEventListener('click', e => {
                e.preventDefault();
                if (threadActive) restoreOriginalOrder();
                else renderThreading();
                updateAllButtons();
            });

            btn._update = updateButtonUI;
            updateButtonUI();

            return btn;
        }

        function updateAllButtons() {
            buttons.forEach(btn => btn._update());
        }

        function init() {
            const headers = document.querySelectorAll('h4.list-message');
            if (!headers.length || buttons.length > 0) return false;

            threadContainerHeader = headers[0];
            initOriginalOrder();

            headers.forEach(header => {
                const btn = createToggleButton();
                buttons.push(btn);
                header.appendChild(btn);
            });

            if (shouldBeActive()) {
                renderThreading();
                updateAllButtons();
            }

            return true;
        }

        function animateReorder(ul, reorderFn) {
            const items = [...ul.querySelectorAll('li.media')];

            // FIRST – pozíció mentése
            const firstRects = new Map();
            items.forEach(el => {
                firstRects.set(el, el.getBoundingClientRect());
                // Ideiglenesen kikapcsoljuk az átmenetet, hogy ne zavarja a mérést
                el.style.transition = 'none';
            });

            // DOM átrendezés (ezt te adod át a reorderFn-ben)
            reorderFn();

            // LAST – új pozíció
            items.forEach(el => {
                const first = firstRects.get(el);
                const last = el.getBoundingClientRect();

                const dx = first.left - last.left;
                const dy = first.top  - last.top;

                if (dx || dy) {
                    el.style.transform = `translate(${dx}px, ${dy}px)`;
                }
            });

            // PLAY – kényszerített reflow után visszaengedjük az animációt
            requestAnimationFrame(() => {
                items.forEach(el => {
                    // Visszaadjuk a CSS-ben definiált transition-t
                    el.style.transition = '';
                    el.style.transform = '';
                });
            });
        }

        if (!init()) {
            const observer = new MutationObserver(() => {
                if (init()) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    function keyboardNavigation() {
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

        function findClosestPost(posts, targetId) {
            let closest = null;
            let minDiff = Infinity;

            posts.forEach(li => {
                const id = parseInt(li.dataset.id, 10);
                if (Number.isNaN(id)) return;

                const diff = Math.abs(id - targetId);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = li;
                }
            });

            return closest;
        }

        function getSortedPostIds(posts) {
            return posts
                .map(p => parseInt(p.dataset.id, 10))
                .filter(id => !Number.isNaN(id))
                .sort((a, b) => a - b);
        }

        function getCurrentIdIndex(sortedIds) {
            const currentId = getMsgIdFromHash();
            if (currentId === null) return -1;
            const idx = sortedIds.indexOf(currentId);
            return idx;
        }

        function getSafeCurrentIndex(posts) {
            let index = getCurrentIndex(posts);
            if (index !== -1) return index;

            const hashId = getMsgIdFromHash();
            if (hashId === null) return 0;

            const closest = findClosestPost(posts, hashId);
            return closest ? posts.indexOf(closest) : 0;
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

            let currentIndex = getSafeCurrentIndex(posts);

            // SHIFT + ↑ / ↓ : következő létező msgId (ID sorrendben)
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();

                const sortedIds = getSortedPostIds(posts);
                if (!sortedIds.length) return;

                let idx = getCurrentIdIndex(sortedIds);

                // ha törölt msg-en állunk → legközelebbi ID
                if (idx === -1) {
                    const hashId = getMsgIdFromHash();
                    if (hashId === null) return;

                    let closestDiff = Infinity;
                    sortedIds.forEach((id, i) => {
                        const diff = Math.abs(id - hashId);
                        if (diff < closestDiff) {
                            closestDiff = diff;
                            idx = i;
                        }
                    });
                }

                const delta = e.key === 'ArrowUp' ? -1 : 1;
                const newIndex = idx + delta;

                if (newIndex < 0 || newIndex >= sortedIds.length) return;

                setMsgId(sortedIds[newIndex]);
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
    }

    function hideUsers() {
        const STORAGE_KEY = KEYS.STATE.HIDDEN_USERS;
        let hiddenUsers;
        const dropdownRefreshers = [];
        try {
            hiddenUsers = JSON.parse(storage.getItem(STORAGE_KEY)) || [];
        } catch {
            hiddenUsers = [];
        }

        function getHiddenBarColors() {
            const dark = document.body.dataset.theme === "dark";
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
                    overflow: hidden;
                }
            `;
        }

        applyHiddenBarStyle();
        document.addEventListener("ph-pt-theme-changed", applyHiddenBarStyle);

        // ===== SEGÉDFÜGGVÉNYEK =====
        function getAuthor(msg) {
            return msg.querySelector(".msg-head-author .user-title a")?.textContent?.trim() || "";
        }

        function getPosts() {
            return Array.from(document.querySelectorAll("li.media[data-id]"));
        }

        function updateHiddenComments() {
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
            storage.setItem(STORAGE_KEY, JSON.stringify(hiddenUsers));

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
                const currentAuthor = getAuthor(li.querySelector(".msg"));
                const hidden = hiddenUsers.includes(currentAuthor);
                a.innerHTML = hidden
                    ? `<span class="fas fa-eye fa-fw"></span> Felhasználó feloldása`
                    : `<span class="fas fa-eye-slash fa-fw"></span> Felhasználó elrejtése`;
            }

            refreshText();
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

            injectStyleOnce("ph-pt-dual-list-style", `
                .ph-editor-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);}
                .ph-editor-panel { background: ${bg}; padding: 20px; border-radius: 5px; min-width: 400px; max-width: 600px; color: ${color}; }
                .dual-list-container { display: flex; gap: 10px; margin-top: 10px; }
                .dual-list { flex: 1; border: 1px solid #fff; min-height: 141px; max-height: 273px; padding: 5px; background: ${bg}; overflow-y: auto; }
                .dual-list-item { padding: 4px 6px; cursor: pointer; border-radius: 3px; margin: 2px 0; background: ${btnForumBackgroundColor}; color: ${btnForumColor}; border: 1px solid #fff; }
                .dual-list-item.selected { background: ${btnPrimaryColor}; color: white; border-color: white; }
                .dual-list-buttons { display: flex; flex-direction: column; justify-content: center; gap: 5px; }
                .dual-list-buttons button { width: 36px; height: 36px; font-weight: bold; border-radius: 3px; cursor: pointer; }
                .editor-buttons { margin-top: 10px; display: flex; gap: 5px; justify-content: flex-end; }
            `);

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
                storage.setItem(STORAGE_KEY, JSON.stringify(hiddenUsers));
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
    }

    function markNewPosts() {
        const MAP_KEY = KEYS.STATE.TOPIC_MAX_ID_MAP;

        /* =========================
           COLOR HANDLING
        ========================== */

        function detectLinkColor() {
            const sample = document.querySelector('.msg-head-options a');
            return sample
                ? window.getComputedStyle(sample).color
                : "#4a90e2";
        }

        function updateMarkColor() {
            const color = detectLinkColor();
            document.documentElement.style.setProperty('--ph-mark-color', color);
        }

        function initStyle() {
            injectStyleOnce("ph-pt-mark-new-posts-style",  `
                .ph-new-post-header {
                    box-shadow: var(--ph-mark-color) 5px 0 0 0 inset !important;
                    transition: box-shadow 1s ease;
                }
            `);
        }

        function observeThemeChanges() {
            const observer = new MutationObserver(() => {
                setTimeout(updateMarkColor, 80);
            });
            observer.observe(document.body, { attributes: true, subtree: true });
        }

        /* =========================
           MAIN LOGIC
        ========================== */

        function getTopicSlug() {
            const match = location.pathname.match(/\/tema\/([^/]+)/);
            return match ? match[1] : null;
        }

        function getMaxFromURL() {
            const hashMatch = location.hash.match(/#msg(\d+)/);
            if (hashMatch) {
                // Ha #msg100 van az URL-ben, akkor a 99-est tekintjük az utolsó "réginek"
                return parseInt(hashMatch[1], 10) - 1;
            }
            return null;
        }

        function readMap() {
            return safeJsonParse(storage.getItem(MAP_KEY) || "{}", {});
        }

        function writeMap(map) {
            storage.setItem(MAP_KEY, JSON.stringify(map));
        }

        function process() {
            const slug = getTopicSlug();
            if (!slug) return;

            const map = readMap();

            const urlMax = getMaxFromURL();
            const comments = Array.from(document.querySelectorAll("li.media[data-id]"));

            if (!comments.length) return;

            const pageMaxId = comments.reduce((max, c) => {
                const id = parseInt(c.dataset.id, 10) || 0;
                return Math.max(max, id);
            }, 0);

            const stored = Number.isFinite(map[slug]) ? parseInt(map[slug], 10) : null;

            let baseId;

            // Ha van mindkettő, a nagyobbat használjuk (stored vs hash)
            // (urlMax #msgN esetén N-1)
            if (stored !== null && urlMax !== null) {
                baseId = Math.max(stored, urlMax);
            } else if (stored !== null) {
                baseId = stored;
            } else if (urlMax !== null) {
                baseId = urlMax;
            } else {
                // első sima megnyitás
                map[slug] = pageMaxId;
                writeMap(map);
                return;
            }

            // Jelölés
            comments.forEach(comment => {
                const id = parseInt(comment.dataset.id, 10);
                const header = comment.querySelector(".msg-header");

                if (id && header && id > baseId) {
                    header.classList.add("ph-new-post-header");
                }
            });

            // Mentés frissítése: mindig a legnagyobbat jegyezzük meg
            if (stored === null || pageMaxId > stored) {
                map[slug] = pageMaxId;
                writeMap(map);
            }
        }

        /* =========================
           INIT
        ========================== */

        initStyle();
        updateMarkColor();
        observeThemeChanges();

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", process, { once: true });
        } else {
            process();
        }
    }

    function extraSmilies() {
        const EXTRA_SMILIES = [
            { code: ':kacsint:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zci2vqvz44ogabsm_kacsint.gif' },
            { code: ':integet:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_x8naxemjfjtk5vvs_integet.gif' },
            { code: ':yeah:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_as3g9letedztw9ii_yeah.gif' },
            { code: ':wink:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_klqmlljupav0nmnh_wink.gif' },
            { code: ':love:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_qpm3lyxagnngl5zt_love.gif' },
            { code: ':nice:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_o0d1srnco9em5exk_nice.gif' },
            { code: ':elvis:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_m39l0qumdyj43jka_elvis.gif' },
            { code: ':grat:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_b6plf8oyffjjeomz_grat.gif' },
            { code: ':hehehe:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_i6ikyt0sdzjfcysz_hehehe.gif' },
            { code: ':grinning:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_vbqtpqdq5dxgang5_grinning.gif' },
            { code: ':hehe:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_fxhv6towsjxuacnw_hehe.gif' },
            { code: ':ravasz:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_c0smadwax8yadphm_ravasz.gif' },
            { code: ':rohog:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_wczdpedmrnyr0klm_rohog.gif' },
            { code: ':snotty:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_xpsckzywodnby7sm_snotty.gif' },
            { code: ':vigyor:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_hlewdcmawdv1pujq_vigyor.gif' },
            { code: ':nyehehe:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_w7aqqj45p9nixmz3_nyehehe.gif' },
            { code: ':perky:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_vpkbnfhbxaridn7y_perky.gif' },
            { code: ':puszi:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pvktjqftgdr0axks_puszi.gif' },
            { code: ':cigi:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_iq5eafha9huz36h2_cigi.gif' },
            { code: ':pipazik:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pftlu8qnejpv2rwt_pipazik.gif' },
            { code: ':pias:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_bw7xdrk9ualzqiw0_pias.gif' },
            { code: ':tough:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zgpshspjbhuuysqu_tough.gif' },
            { code: ':bad:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ihifbk0cpt5kr74j_bad.gif' },
            { code: ':felmosoly:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_td6vavyd8nv7tbqt_felmosoly.gif' },
            { code: ':abashed:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_xbjsjrfku7m0up6y_abashed.gif' },
            { code: ':aggodik:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ougi96agmsbvcuxy_aggodik.gif' },
            { code: ':bigeyed:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_l4oaf9xntn9hxvqg_bigeyed.gif' },
            { code: ':whoa:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_lvrygfdregmhx0tt_whoa.gif' },
            { code: ':surprised:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ikgcnrnqpgazruwx_surprised.gif' },
            { code: ':ohnej:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_gfemqrnojxsc6mkv_ohnej.gif' },
            { code: ':bok:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pzw9hgej6dizwzof_bok.gif' },
            { code: ':bok2:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zzalkc4e5rv7hxcq_bok2.gif' },
            { code: ':coco:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_k3d85ztk0objzufp_coco.gif' },
            { code: ':gondol:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_khe86mxoxirjery1_gondol.gif' },
            { code: ':szomoru:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_eiryf0n6po4u3cn1_szomoru.gif' },
            { code: ':uncsi:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_wwhv9yvhoutnquo3_uncsi.gif' },
            { code: ':huha:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_qpd2yhifajqpzrzg_huha.gif' },
            { code: ':idiota2:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_htknjkdfz0pttnmf_idiota2.gif' },
            { code: ':idiota:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_dtauyqcahbvgtafk_idiota.gif' },
            { code: ':idiota3:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_uupi128oj4q3vg1j_idiota3.gif' },
            { code: ':spooky:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_kd20nnb1mn6oev18_spooky.gif' },
            { code: ':ijedt:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_clram2elrcyhtogp_ijedt.gif' },
            { code: ':omg:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_isq9dlhjathmavsw_omg.gif' },
            { code: ':szaszmarci:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_l7vlmi0908giny1d_szaszmarci.gif' },
            { code: ':zombie:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ua0towvr7th3y2oj_zombie.gif' },
            { code: ':sheriff:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_xvjsp9rcfo01odvi_sheriff.gif' },
            { code: ':nana:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_l6h2tnobeeftpt8j_nana.gif' },
            { code: ':morcos:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_egyugzuyiex9nhvo_morcos.gif' },
            { code: ':merges:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_dkfnuwxzvxns75ae_merges.gif' },
            { code: ':fuck1:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_rtjzdpuv7ilyvc9c_fuck1.gif' },
            { code: ':fusillader:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_fu077bi7qsxgiyl9_fusillader.gif' },
            { code: ':letsplay:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_esm9mjfstdpqnsjm_letsplay.gif' },
            { code: ':bunko:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ztgsr96bn2i9akdm_bunko.gif' },
            { code: ':poor:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_fgw3e840etthfeyi_poor.gif' },
            { code: ':koccint:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_lv15ria9cnmxtoty_koccint.gif' },
            { code: ':sleepy:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zbjijw303uitokmm_sleepy.gif' },
            { code: ':kocsog:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_v0mhygvcf47tipdb_kocsog.gif' },
            { code: ':lama:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_oknfqsidavmhgeuq_lama.gif' },
            { code: ':nem:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_occldijkfqjrfjce_nem.gif' },
            { code: ':igen:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_m97zu6ylsflhdw5g_igen.gif' }
        ];

        // --- Segédfüggvény: van-e kód bármelyik szövegcsomópontban ---
        function hasCodeInText(root, code) {
            const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let n;
            while ((n = tw.nextNode())) {
                if (n.textContent.includes(code)) return true;
            }
            return false;
        }

        // --- Szmájli csere: csak szöveg-node-okban, per-smiley writeback ---
        function checkAndReplace(editor) {
            let html = editor.innerHTML;
            let anyChange = false;

            EXTRA_SMILIES.forEach(smiley => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                let changedThisSmiley = false;

                if (hasCodeInText(tempDiv, smiley.code)) {
                    const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
                    let node;
                    while ((node = walk.nextNode())) {
                        if (!node.parentNode) continue;

                        // (Opcionális) Ha bizonyos tagekben nem akarsz cserét:
                        // if (node.parentNode.closest('code, pre')) continue;

                        if (node.textContent.includes(smiley.code)) {
                            const parts = node.textContent.split(smiley.code);
                            const fragment = document.createDocumentFragment();

                            parts.forEach((part, i) => {
                                fragment.appendChild(document.createTextNode(part));
                                if (i < parts.length - 1) {
                                    const img = document.createElement('img');
                                    img.src = smiley.src;
                                    img.alt = smiley.code;
                                    img.setAttribute('data-mce-src', smiley.src);
                                    img.style.verticalAlign = 'middle';
                                    fragment.appendChild(img);
                                }
                            });

                            node.parentNode.replaceChild(fragment, node);
                            changedThisSmiley = true;
                            anyChange = true;
                        }
                    }
                }

                if (changedThisSmiley) {
                    html = tempDiv.innerHTML; // csak akkor írjuk vissza, ha tényleg volt csere ebben a körben
                }
            });

            if (anyChange) {
                editor.innerHTML = html;
                placeCaretAtEnd(editor);
            }
        }

        // --- Caret a végére (egyszerű és megbízható TinyMCE alatt is) ---
        function placeCaretAtEnd(el) {
            el.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        // --- Duplázás elleni beszúrás gombos kattintásra ---
        function insertSmileyImage(smiley) {
            const editor = document.querySelector('.mce-content-body[contenteditable="true"]');
            if (!editor) return;
            editor.focus();

            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) {
                // fallback: a végére szúrjuk
                editor.insertAdjacentHTML('beforeend',
                    `<img src="${smiley.src}" alt="${smiley.code}" data-mce-src="${smiley.src}" style="vertical-align: middle;">`
                );
                placeCaretAtEnd(editor);
                return;
            }

            const range = sel.getRangeAt(0);

            // Ellenőrizzük, hogy a caret közvetlen közelében már ott van-e pont ugyanaz a kép
            let refNode = range.startContainer;
            if (refNode.nodeType === Node.TEXT_NODE) {
                // Nézzük az előző testvért (ha van)
                const prev = refNode.previousSibling;
                if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.tagName === 'IMG' && prev.getAttribute('src') === smiley.src) {
                    return; // Már ott van ugyanaz a szmájli közvetlenül előtte
                }
            } else if (refNode.nodeType === Node.ELEMENT_NODE) {
                // Ha elem a startContainer, nézzük az előtte lévő csomót
                const idx = range.startOffset - 1;
                if (idx >= 0 && refNode.childNodes[idx]) {
                    const n = refNode.childNodes[idx];
                    if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'IMG' && n.getAttribute('src') === smiley.src) {
                        return;
                    }
                }
            }

            // Beszúrás (TinyMCE kompatibilis)
            const imgHTML = `<img src="${smiley.src}" alt="${smiley.code}" data-mce-src="${smiley.src}" style="vertical-align: middle;">`;
            insertHtmlIntoEditor(editor, imgHTML);
        }

        // --- Gombok létrehozása a kiterjesztett szmájlisorhoz ---
        function createSmileyElement(smiley) {
            const link = document.createElement('a');
            link.href = 'javascript:;';
            link.style.margin = '2px';
            link.innerHTML = `<img src="${smiley.src}" alt="${smiley.code}" title="${smiley.code}" style="vertical-align: middle;">`;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                insertSmileyImage(smiley);
            });
            return link;
        }

        // --- Események csatolása az editorhoz (debounce-olva) ---
        function attachEditorEvents() {
            const editor = document.querySelector('.mce-content-body[contenteditable="true"]');
            if (editor && !editor.dataset.smileyEventsAttached) {
                let replaceDebounce;
                editor.addEventListener('keyup', (e) => {
                    if (e.key === ':' || e.key === ' ' || e.key === 'Enter') {
                        clearTimeout(replaceDebounce);
                        replaceDebounce = setTimeout(() => checkAndReplace(editor), 40);
                    }
                });
                editor.dataset.smileyEventsAttached = 'true';
            }
        }

        // --- Extra szmájlisor befűzése az eredeti mellé ---
        function enhanceSmileyContainer(container) {
            if (!container || container.dataset.phExtraSmiliesInjected) return;

            const extraRow = document.createElement('div');
            extraRow.style.cssText = 'display: block; width: 100%; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #aaa; clear: both;';

            const label = document.createElement('div');
            label.textContent = ''; // ha kell felirat, ide írd
            label.style.cssText = 'font-size: 10px; color: #888; margin-bottom: 4px;';
            extraRow.appendChild(label);

            EXTRA_SMILIES.forEach(smiley => {
                extraRow.appendChild(createSmileyElement(smiley));
            });

            container.appendChild(extraRow);
            container.dataset.phExtraSmiliesInjected = '1';
            attachEditorEvents();
        }

        // --- Figyeljük, mikor jelenik meg az editor/smiley panel ---
        const observer = new MutationObserver(() => {
            const target = document.querySelector('.rtif-smiles');
            if (target) enhanceSmileyContainer(target);
            attachEditorEvents();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Első próbálkozás kényszerítése
        setTimeout(attachEditorEvents, 1000);
    }

    function kekShUploader() {
        /* ================= CONFIG ================= */

        const LS_KEY = KEYS.KEK.GALLERY;
        const DELETED_KEY = KEYS.KEK.GALLERY_DELETED;

        function loadDeletedMap() {
            const obj = safeJsonParse(storage.getItem(DELETED_KEY) || "{}", {});
            return (obj && typeof obj === "object") ? obj : {};
        }

        function saveDeletedMap(obj) {
            const cleaned = cleanupDeletedMap(obj || {});
            storage.setItem(DELETED_KEY, JSON.stringify(cleaned));
        }

        function cleanupDeletedMap(map, maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
            const now = Date.now();
            const out = {};
            for (const [url, ts] of Object.entries(map)) {
                if (now - ts < maxAgeMs) out[url] = ts;
            }
            return out;
        }

        function hasKekKey() {
            const key = (KEK_SH_API_KEY || "").trim();
            return key.length > 0;
        }

        const MAX_ITEMS = 120;

        // UI
        const GALLERY_MAX_HEIGHT_PX = 420;
        const GRID_THUMB_SIZE_PX = 120;

        /* ================= GM REQUEST ================= */

        function gmRequest(opts) {
            return GM_xmlhttpRequest(opts);
        }

        /* ================= STORAGE (shared) ================= */

        function loadGallery() {
            const arr = safeJsonParse(storage.getItem(LS_KEY) || "[]", []);
            return Array.isArray(arr) ? arr : [];
        }

        async function saveGallery(data) {
            let arr = Array.isArray(data) ? data : [];
            if (arr.length > MAX_ITEMS) arr = arr.slice(0, MAX_ITEMS);

            storage.setItem(LS_KEY, JSON.stringify(arr));
        }

        async function addToGallery(item) {
            if (!item?.url) return;

            const arr = loadGallery();
            if (arr.some(x => x.url === item.url)) return;

            arr.unshift(item);
            if (arr.length > MAX_ITEMS) arr.length = MAX_ITEMS;

            await saveGallery(arr);
        }

        async function removeFromGallery(url) {
            const arr = loadGallery().filter(x => x.url !== url);
            await saveGallery(arr);
        }

        function deleteRemotePost(id) {
            if (!id) return Promise.resolve({ ok: false, status: 0, error: "missing id" });
            if (!KEK_SH_API_KEY) return Promise.resolve({ ok: false, status: 0, error: "missing api key" });

            return new Promise((resolve) => {
                gmRequest({
                    method: "DELETE",
                    url: `https://kek.sh/api/v1/posts/${encodeURIComponent(id)}`,
                    headers: { "x-kek-auth": KEK_SH_API_KEY },
                    onload: (res) => resolve({ ok: res.status >= 200 && res.status < 300, status: res.status, body: res.responseText }),
                    onerror: () => resolve({ ok: false, status: 0, error: "network" })
                });
            });
        }

        function deleteAllRemotePosts() {
            if (!KEK_SH_API_KEY) return Promise.resolve({ ok: false, status: 0, error: "missing api key" });

            return new Promise((resolve) => {
                gmRequest({
                    method: "DELETE",
                    url: "https://kek.sh/api/v1/posts",
                    headers: { "x-kek-auth": KEK_SH_API_KEY },
                    onload: (res) => resolve({ ok: res.status >= 200 && res.status < 300, status: res.status, body: res.responseText }),
                    onerror: () => resolve({ ok: false, status: 0, error: "network" })
                });
            });
        }

        async function clearGallery() {
            storage.removeItem(LS_KEY);
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
            injectStyleOnce("ph-pt-kek-sh-uploader-style", `
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
                #ph-kek-sync-badge:empty { display: none; }
            `);
        }

        function updateSyncBadge() {
            const el = document.getElementById("ph-kek-sync-badge");
            if (!el) return;

            if (ENABLE_GIST_SYNC) {
                el.textContent = "☁️ Cloud";
                el.style.color = "green";
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

        const RESET_KEY = KEYS.KEK.GALLERY_RESET_TS;
        const SEEN_RESET_KEY = KEYS.KEK.GALLERY_SEEN_RESET_TS;
        // NOTE: KEYS.KEK.GALLERY_SEEN_RESET_TS = local-only ack, don't sync

        function applyGalleryResetIfNeeded() {
            const resetTs = parseInt(storage.getItem(RESET_KEY) || "0", 10) || 0;
            const seenTs = parseInt(localStorage.getItem(SEEN_RESET_KEY) || "0", 10) || 0;

            if (resetTs > 0 && resetTs > seenTs) {
                // volt egy új “mind törlés” másik gépről → dobjuk a lokális galériát
                storage.removeItem(LS_KEY);
                // local-only ack, do NOT sync
                localStorage.setItem(SEEN_RESET_KEY, String(resetTs));
            }
        }

        function renderGallery(wrapper) {
            applyGalleryResetIfNeeded();
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

                overlay.appendChild(makeMiniBtn("insert-image", "Kép beszúrás", `<span class="fas fa-image"></span>`, "btn btn-light btn-xs"));
                overlay.appendChild(makeMiniBtn("insert-link", "Link beszúrás ([kép])", `<span class="fas fa-link"></span>`, "btn btn-light btn-xs"));
                overlay.appendChild(makeMiniBtn("delete", "Törlés", `<span class="fas fa-trash"></span>`, "btn btn-light btn-xs"));

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

                const mkBtn = (action, icon, label) => {
                    const b = document.createElement("button");
                    b.type = "button";
                    b.className = "btn btn-light btn-xs my-1";
                    b.dataset.action = action;
                    b.dataset.url = it.url;
                    b.innerHTML = `<span class="fas ${icon}"></span> <span class="d-none d-md-inline-block">${label}</span>`;
                    return b;
                };

                actions.appendChild(mkBtn("insert-image", "fa-image", "Beszúrás"));
                actions.appendChild(mkBtn("insert-link", "fa-link", "Link beszúrás"));
                actions.appendChild(mkBtn("delete", "fa-trash", "Törlés"));

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

            if (!hasKekKey()) {
                wrapper.innerHTML = `
                    <h6 style="margin-bottom:10px;">Képfeltöltés (kek.sh)</h6>
                    <div style="
                        padding: 12px 14px;
                        border: 1px solid rgba(0,0,0,0.12);
                        border-radius: 10px;
                        background: rgba(0,0,0,0.03);
                        font-size: 13px;
                        line-height: 1.45;">
                        <div style="font-weight:700; margin-bottom:6px;">Nincs beállítva kek.sh API kulcs</div>
                        <div style="margin-bottom:8px;">
                            1) Regisztrálj itt: 
                            <a href="https://kek.sh/" target="_blank" rel="noopener noreferrer">kek.sh</a><br>
                            2) API kulcs: 
                            <a href="https://kek.sh/settings/api" target="_blank" rel="noopener noreferrer">kek.sh/settings/api</a><br>
                            3) Állítsd be: <b>PH Power Tools <span class="fas fa-cog"></span> Kulcsok / Szinkron</b> (kek.sh API key)
                        </div>
                        <div style="opacity:0.9;">
                            Ingyenes csomag: <b>5 GB</b> tárhely, <b>1000</b> kép, <b>5 MB/kép</b>.
                        </div>
                    </div>
                `;

                target.appendChild(wrapper);
                return wrapper;
            }

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
                            <div style="display:flex; align-items:center;">
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
            applyGalleryResetIfNeeded();
            const wrapper = getWrapperFromEvent(e);
            const fileInput = wrapper?.querySelector("#ph-kek-file");

            if (!fileInput?.files?.length) {
                alert("Nincs kiválasztott fájl.");
                return;
            }

            const file = fileInput.files[0];
            setStatus(wrapper, "Feltöltés...");

            const formData = new FormData();
            formData.append("file", file);

            gmRequest({
                method: "POST",
                url: "https://kek.sh/api/v1/posts",
                headers: { "x-kek-auth": KEK_SH_API_KEY },
                data: formData,
                onload: async function (res) {
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

                    await addToGallery({
                        id: json.id,
                        token: json.token,
                        url,
                        filename: json.filename,
                        originalName: file.name,
                        createdAt: json.createdAt || new Date().toISOString(),
                        size: json.size || file.size || null
                    });

                    setStatus(wrapper, "✅ Feltöltve (elmentve)");
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
                if (!confirm("Biztos törlöd az ÖSSZES kek.sh képed a szerverről is?")) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();

                setStatus(wrapper, "🗑️ Minden törlése a szerveren...");
                const r = await deleteAllRemotePosts();

                if (!r.ok) {
                    setStatus(wrapper, `❌ Nem sikerült mindent törölni a szerveren (HTTP ${r.status}).`);
                    return;
                }

                storage.setItem(KEYS.KEK.GALLERY_RESET_TS, String(Date.now()));
                storage.removeItem(KEYS.KEK.GALLERY_DELETED);
                await clearGallery();

                if (ENABLE_GIST_SYNC && typeof storage.flush === "function") {
                    await storage.flush(); // ✅ gist azonnal ürül
                }

                renderGallery(wrapper);
                setStatus(wrapper, "🗑️ Mind törölve (szerver + galéria)");
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

                // Kézi sync: a shared storage kényszerített push-a
                if (ENABLE_GIST_SYNC && typeof storage.flush === "function") {
                    try {
                        await storage.flush();
                        setStatus(wrapper, "☁️ Szinkron kész");
                    } catch {
                        setStatus(wrapper, "❌ Szinkron hiba (lásd konzol)");
                    }
                    updateSyncBadge();
                }
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
                    const ok = insertHtmlIntoEditor(editor, `<img src="${escapeHtml(url)}" alt="">`);
                    setStatus(wrapper, ok ? "✅ Kép beszúrva" : "❌ Nem találom az editort");
                    return;
                }

                if (action === "insert-link") {
                    const ok = insertHtmlIntoEditor(editor, buildLinkHtml(url));
                    setStatus(wrapper, ok ? "✅ Link beszúrva" : "❌ Nem találom az editort");
                    return;
                }

                if (action === "delete") {
                    if (!confirm("Biztos törlöd ezt a képet a szerverről is?")) {
                        return;
                    }
                    const items = loadGallery();
                    const item = items.find(x => x.url === url);

                    if (item?.id) {
                        setStatus(wrapper, "🗑️ Törlés a szerveren...");
                        const r = await deleteRemotePost(item.id);

                        if (!r.ok) {
                            setStatus(wrapper, `❌ Nem sikerült törölni a szerveren (HTTP ${r.status}).`);
                            return; // ✅ ne törölj lokálból, hogy ne vesszen el a nyoma
                        }
                    } else {
                        setStatus(wrapper, "❌ Nincs id (régi elem) – csak lokál törlés.");
                    }

                    const deleted = loadDeletedMap();
                    deleted[url] = Date.now();
                    saveDeletedMap(deleted);

                    await removeFromGallery(url);

                    if (ENABLE_GIST_SYNC && typeof storage.flush === "function") {
                        await storage.flush();
                    }

                    renderGallery(wrapper);
                    setStatus(wrapper, "🗑️ Törölve (szerver + galéria)");
                    updateSyncBadge();
                    return;
                }
            }
        }, true);

        /* ================= INIT / MOUNT ================= */

        function tryMountUi() {
            const target = document.querySelector(".msg-upload-collapse .rtif-upload");
            if (!target) return;
            if (target.querySelector("#ph-kek-upload")) return;

            ensureUi(target);
            updateSyncBadge();
        }

        const observer = new MutationObserver(() => { tryMountUi(); });
        observer.observe(document.body, { childList: true, subtree: true });

        tryMountUi();
    }
})();