// ==UserScript==
// @name         Prohardver Fórum – Power Tools
// @namespace    https://github.com/lkristof/userscripts
// @version      2.4.1
// @description  PH Fórum extra funkciók, fejlécbe épített beállításokkal.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/*
// @match        https://mobilarena.hu/*
// @match        https://logout.hu/*
// @match        https://fototrend.hu/*
// @match        https://hardverapro.hu/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js
//
// @require      https://code.jquery.com/jquery-3.7.1.min.js
//
// @grant        GM_info
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      kek.sh
// @connect      api.github.com
// @connect      gist.githubusercontent.com
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
            MODERN_VIEW: 'ph_modern_view',
            TOPIC_MAX_ID_MAP: 'ph_topic_max_id_map',
        },

        KEK: {
            GALLERY: 'ph_kek_gallery',
            GALLERY_RESET_TS: 'ph_kek_gallery_reset_ts',
            GALLERY_DELETED: 'ph_kek_gallery_deleted',
            GALLERY_SEEN_RESET_TS: 'ph_kek_gallery_seen_reset_ts',
        },

        SECRETS: 'ph_power_tools_secrets',
    };

    const SYNC_KEYS = [
        KEYS.SETTINGS,
        KEYS.STATE.HIDDEN_USERS,
        KEYS.STATE.TOPIC_MAX_ID_MAP,
        KEYS.KEK.GALLERY,
        KEYS.KEK.GALLERY_RESET_TS,
        KEYS.KEK.GALLERY_DELETED,
    ];

    const STORAGE_KEY = KEYS.SETTINGS;
    const SECRETS_KEY = KEYS.SECRETS;

    // A biztonsági mentés a helyi beállításokat tartalmazza; a titkos
    // kapcsolati adatok csak kifejezett, alapból kikapcsolt opcióval kerülnek bele.
    // A titkos adatokat tartalmazó JSON nincs titkosítva, és nem megy a Gistbe.
    const BACKUP_FORMAT = 'ph-power-tools-settings';
    const BACKUP_FORMAT_VERSION = 1;
    const BACKUP_PREFERENCE_KEYS = [
        KEYS.SETTINGS,
        KEYS.STATE.HIDDEN_USERS,
        KEYS.STATE.HIDE_OFF,
        KEYS.STATE.WIDE_VIEW,
        KEYS.STATE.THREAD_VIEW,
        KEYS.STATE.MODERN_VIEW,
        'ph_wide_view_center_px',
        'ph_mobile_scroll_nav_position',
    ];
    const BACKUP_EXTRA_KEYS = [
        KEYS.STATE.TOPIC_MAX_ID_MAP,
        KEYS.KEK.GALLERY,
        KEYS.KEK.GALLERY_RESET_TS,
        KEYS.KEK.GALLERY_DELETED,
        KEYS.KEK.GALLERY_SEEN_RESET_TS,
    ];

    const secrets = await loadSecrets();

    const DEFAULT_GIST_FILENAME = "ph_forum_settings.json";
    let GIST_TOKEN = (secrets.gistToken || "").trim();
    let GIST_ID = (secrets.gistId || "").trim();
    let GIST_FILENAME = ((secrets.gistFilename || DEFAULT_GIST_FILENAME)).trim();
    let ENABLE_GIST_SYNC = !!(GIST_TOKEN && GIST_ID && GIST_FILENAME);
    let KEK_SH_API_KEY = (secrets.kekShApiKey || "").trim();

    // Importkor a memóriában használt Gist-hozzáférést is átállítjuk,
    // különben az új beállítások még a korábban megadott Gistbe kerülhetnének.
    function activateSecrets(saved) {
        GIST_TOKEN = (saved.gistToken || '').trim();
        GIST_ID = (saved.gistId || '').trim();
        GIST_FILENAME = (saved.gistFilename || DEFAULT_GIST_FILENAME).trim();
        KEK_SH_API_KEY = (saved.kekShApiKey || '').trim();
        ENABLE_GIST_SYNC = !!(GIST_TOKEN && GIST_ID && GIST_FILENAME);
    }

    const DEFAULT_COLORIZE_PALETTE = {
        light: {
            own: "#C7D7E0",
            reply: "#CFE0C3",
            akcio: "#FFC0C0",
            focusAuthor: "#FFA966",
            focusReply: "#F6CEAF",
            chainBg: "#FFF6C8",
            chainBorder: "#FF9800",
            hashHighlight: "#FFF6C8",
        },
        dark: {
            own: "#2F4A57",
            reply: "#344A3A",
            akcio: "#8B0000",
            focusAuthor: "#5B327A",
            focusReply: "#3A1F4F",
            chainBg: "#4A4015",
            chainBorder: "#FFB300",
            hashHighlight: "#4A4015",
        }
    };

    const defaultSettings = {
        colorize: true,
        linkRedirect: true,
        msgAnchorHighlight: true,
        offHider: true,
        messageChainPopup: true,
        wideView: true,
        threadView: true,
        modernView: true,
        keyboardNavigation: true,
        hideUsers: true,
        markNewPosts: true,
        extraSmilies: true,
        kekShUploader: true,
        giveawayAnswerChecker: true,
        stickySidebar: true,
        mobileScrollNav: true,
        sortThreadListsByNewPosts: true,

        colorizePalette: DEFAULT_COLORIZE_PALETTE,
    };

    const settingGroups = {
        appearance: {
            label: 'Megjelenés',
            keys: ['colorize', 'sortThreadListsByNewPosts', 'markNewPosts',
                'wideView', 'threadView', 'modernView', 'stickySidebar'],
            defaultOpen: true,
        },
        filtering: {
            label: 'Szűrés',
            keys: ['offHider', 'hideUsers', 'messageChainPopup'],
        },
        interaction: {
            label: 'Interakció',
            keys: ['kekShUploader', 'extraSmilies', 'linkRedirect', 'msgAnchorHighlight',
                'keyboardNavigation', 'mobileScrollNav', 'giveawayAnswerChecker'],
        }
    };

    const tooltips = {
        colorize: 'Saját / válasz / #akció + avatar fókusz. Színek a 🎨 menüben.',
        linkRedirect: 'PH! lapcsalád linkjeit az aktuális oldalra irányítja.',
        msgAnchorHighlight: 'Az URL-ben megadott #msg hozzászóláshoz görget és kiemeli azt. Színek a 🎨 menüben.',
        offHider: 'OFF hozzászólások elrejtése/kibontása gombbal.',
        messageChainPopup: 'A Lánc gombbal felugró ablakban megtekintheted a hozzászólás előzményeit és válaszait.',
        wideView: 'Szélesebb tartalom, kevesebb oldalsó margó. Bekapcsolva a tartalom jobb szélét húzva állítható a szélesség, dupla kattintással pedig visszaáll az automatikus méret.',
        threadView: 'Reddit-szerű válaszfa folytonos, kiemelhető ágvonalakkal és összecsukható hozzászólásokkal. A Thread nézet gomb lenyíló menüjében minden ág összecsukható vagy kibontható.',
        modernView: 'A hozzászólásokat a Thread nézet kártyás stílusában jeleníti meg, időrendi sorrendben, behúzások és válaszfa-vonalak nélkül. A hozzászóláslista feletti Modern nézet gombbal kapcsolható.',
        keyboardNavigation: 'Billentyű navigáció a hozzászólások között\n← első\n→ utolsó\n↑ előző\n↓ következő\nshift + ↑ sorban előző\nshift + ↓ sorban következő\nR előzmény\nshift + R vissza az R-el bejárt útvonalon',
        hideUsers: 'Megadhatod, mely felhasználók hozzászólásai legyenek elrejtve.',
        markNewPosts: 'Az új hozzászólások fejléce kap egy kis jelölést.',
        extraSmilies: 'Extra emojik/smiliek listája a szerkesztőben.',
        kekShUploader: 'kek.sh-ra képfeltöltés, API kulcs szükséges.',
        stickySidebar: 'A bal és jobb oldalsáv a képernyőn marad.',
        mobileScrollNav: 'Lebegő panel a hozzászólások közti lépkedéshez.',
        giveawayAnswerChecker: 'A játék lezárása után ellenőrzi a válaszaidat, ✅/❌ jelöli őket, és kiemeli a neved a nyerteslistában.',
        sortThreadListsByNewPosts: 'A „Kedvenc fórumtémáim” és „Itt szóltam hozzá” listákat az új hozzászólások száma szerint rendezi, csökkenő sorrendben.',
    };

    function prettyName(key) {
        return {
            colorize: 'Hozzászólások színezése',
            linkRedirect: 'Link átirányítás',
            msgAnchorHighlight: 'Üzenet kiemelés',
            offHider: 'OFF hozzászólások elrejtése',
            messageChainPopup: 'Hozzászólás-lánc popup',
            wideView: 'Széles nézet',
            threadView: 'Thread nézet',
            modernView: 'Modern nézet',
            keyboardNavigation: 'Billentyűzetes navigáció',
            hideUsers: 'Felhasználók elrejtése',
            markNewPosts: 'Új hozzászólás jelölése',
            extraSmilies: 'Extra smiley-k',
            kekShUploader: 'kek.sh képfeltöltő',
            giveawayAnswerChecker: 'Nyereményjáték válasz ellenőrző',
            stickySidebar: 'Fix oldalsávok',
            mobileScrollNav: 'Mobil navigációs panel',
            sortThreadListsByNewPosts: 'Témalisták rendezése',
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

    // ===== Beállítások export / import =====
    function isBackupObject(value) {
        return value !== null && Object.prototype.toString.call(value) === '[object Object]';
    }

    function backupHas(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function readBackupStorageValue(key) {
        const raw = storage.getItem(key);
        return raw === null ? null : safeJsonParse(raw, raw);
    }

    function normalizeBackupSettings(value) {
        if (!isBackupObject(value)) throw new Error('A mentett beállítások formátuma hibás.');

        const result = { ...defaultSettings, colorizePalette: structuredClone(DEFAULT_COLORIZE_PALETTE) };
        for (const key of Object.keys(defaultSettings)) {
            if (!backupHas(value, key) || key === 'colorizePalette') continue;
            if (typeof value[key] !== 'boolean') {
                throw new Error(`Érvénytelen kapcsolóérték: ${key}`);
            }
            result[key] = value[key];
        }

        if (backupHas(value, 'colorizePalette')) {
            const palette = value.colorizePalette;
            if (!isBackupObject(palette)) throw new Error('A színpaletta nem érvényes.');
            for (const theme of ['light', 'dark']) {
                if (!backupHas(palette, theme)) continue;
                if (!isBackupObject(palette[theme])) {
                    throw new Error(`A(z) ${theme} színpaletta nem érvényes.`);
                }
                for (const key of Object.keys(DEFAULT_COLORIZE_PALETTE[theme])) {
                    if (!backupHas(palette[theme], key)) continue;
                    const color = palette[theme][key];
                    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
                        throw new Error(`Érvénytelen szín: ${theme}.${key}`);
                    }
                    result.colorizePalette[theme][key] = color;
                }
            }
        }
        return result;
    }

    // A nyers API-/Gist-adatok csak ismert mezőkkel, szigorú típusellenőrzés
    // után menthetők/visszaállíthatók. Korábbi, kulcsmentés nélküli fájlok is jók.
    function validateBackupSecrets(value) {
        if (!isBackupObject(value)) throw new Error('A kapcsolati adatok formátuma hibás.');
        const fields = {
            gistToken: 4096,
            gistId: 256,
            gistFilename: 512,
            kekShApiKey: 4096,
        };
        const result = {};
        for (const [key, maxLength] of Object.entries(fields)) {
            if (!backupHas(value, key) || typeof value[key] !== 'string'
                || value[key].length > maxLength) {
                throw new Error(`Érvénytelen kapcsolati adat: ${key}`);
            }
            result[key] = value[key].trim();
        }
        return result;
    }

    async function makeSettingsBackup(includeExtras, includeSecrets = false) {
        const values = {};
        for (const key of BACKUP_PREFERENCE_KEYS) {
            values[key] = key === KEYS.SETTINGS
                ? normalizeBackupSettings(getMergedSettings())
                : readBackupStorageValue(key);
        }
        if (includeExtras) {
            for (const key of BACKUP_EXTRA_KEYS) values[key] = readBackupStorageValue(key);
        }
        const backup = {
            format: BACKUP_FORMAT,
            formatVersion: BACKUP_FORMAT_VERSION,
            scriptVersion: GM_info.script.version,
            exportedAt: new Date().toISOString(),
            values,
        };
        if (includeSecrets) {
            const saved = await loadSecrets();
            backup.secrets = validateBackupSecrets({
                gistToken: saved.gistToken ?? '',
                gistId: saved.gistId ?? '',
                gistFilename: saved.gistFilename ?? '',
                kekShApiKey: saved.kekShApiKey ?? '',
            });
        }
        // A létrejött fájl biztosan visszaolvasható legyen az importálóval.
        prepareSettingsBackupImport(backup);
        return backup;
    }

    function validatedBackupInteger(value, key) {
        const n = typeof value === 'number' ? value
            : (typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN);
        if (!Number.isSafeInteger(n) || n < 0) {
            throw new Error(`Érvénytelen számérték: ${key}`);
        }
        return n;
    }

    function serializeBackupValue(key, value) {
        // Null = a mentésben nem volt helyi érték: importkor törölni kell.
        if (value === null && key !== KEYS.SETTINGS) return null;
        if (key === KEYS.SETTINGS) {
            return JSON.stringify(normalizeBackupSettings(value));
        }
        if (key === KEYS.STATE.HIDDEN_USERS) {
            if (!Array.isArray(value) || value.some(user =>
                typeof user !== 'string' || !user.trim() || user.length > 200)) {
                throw new Error('Érvénytelen rejtettfelhasználó-lista.');
            }
            return JSON.stringify([...new Set(value.map(user => user.trim()))]);
        }
        if ([KEYS.STATE.HIDE_OFF, KEYS.STATE.WIDE_VIEW, KEYS.STATE.THREAD_VIEW, KEYS.STATE.MODERN_VIEW].includes(key)) {
            if (value !== 'enabled' && value !== 'disabled') {
                throw new Error(`Érvénytelen nézetállapot: ${key}`);
            }
            return value;
        }
        if (key === 'ph_wide_view_center_px') {
            const px = validatedBackupInteger(value, key);
            if (px < 100 || px > 20000) throw new Error('Érvénytelen szélesnézet-szélesség.');
            return String(px);
        }
        if (key === 'ph_mobile_scroll_nav_position') {
            if (!isBackupObject(value) || !['left', 'right'].includes(value.side)
                || typeof value.hidden !== 'boolean') {
                throw new Error('Érvénytelen mobilnavigáció-beállítás.');
            }
            const bottom = Number(value.bottom);
            if (!Number.isFinite(bottom) || bottom < 0 || bottom > 20000) {
                throw new Error('Érvénytelen mobilnavigáció-pozíció.');
            }
            return JSON.stringify({ side: value.side, bottom, hidden: value.hidden });
        }
        if (key === KEYS.STATE.TOPIC_MAX_ID_MAP || key === KEYS.KEK.GALLERY_DELETED) {
            if (!isBackupObject(value)) throw new Error(`Érvénytelen adatok: ${key}`);
            const out = Object.create(null);
            for (const [name, id] of Object.entries(value)) {
                if (!name || name.length > 4096 || ['__proto__', 'prototype', 'constructor'].includes(name)) {
                    throw new Error(`Érvénytelen adatazonosító: ${key}`);
                }
                if (key === KEYS.KEK.GALLERY_DELETED && !/^https?:\/\//i.test(name)) {
                    throw new Error('Érvénytelen töröltkép-hivatkozás.');
                }
                out[name] = validatedBackupInteger(id, key);
            }
            return JSON.stringify(out);
        }
        if (key === KEYS.KEK.GALLERY) {
            if (!Array.isArray(value) || value.length > 5000) {
                throw new Error('Érvénytelen képgaléria-adatok.');
            }
            const gallery = value.map((item, i) => {
                if (!isBackupObject(item) || typeof item.url !== 'string'
                    || item.url.length > 4096 || !/^https?:\/\//i.test(item.url)) {
                    throw new Error(`Érvénytelen képbejegyzés: ${i + 1}`);
                }
                const clean = { url: item.url };
                if (item.id != null) {
                    if (!((typeof item.id === 'string' && item.id.length <= 4096)
                        || (Number.isSafeInteger(item.id) && item.id >= 0))) {
                        throw new Error('Érvénytelen galériaazonosító.');
                    }
                    clean.id = item.id;
                }
                for (const field of ['token', 'filename', 'originalName', 'createdAt']) {
                    if (item[field] == null) continue;
                    if (typeof item[field] !== 'string' || item[field].length > 4096) {
                        throw new Error(`Érvénytelen galériaérték: ${field}`);
                    }
                    clean[field] = item[field];
                }
                if (item.size != null) {
                    clean.size = validatedBackupInteger(item.size, 'gallery.size');
                }
                return clean;
            });
            return JSON.stringify(gallery);
        }
        if ([KEYS.KEK.GALLERY_RESET_TS, KEYS.KEK.GALLERY_SEEN_RESET_TS].includes(key)) {
            return String(validatedBackupInteger(value, key));
        }
        throw new Error(`Nem támogatott mentési kulcs: ${key}`);
    }

    function prepareSettingsBackupImport(backup) {
        if (!isBackupObject(backup) || backup.format !== BACKUP_FORMAT
            || backup.formatVersion !== BACKUP_FORMAT_VERSION || !isBackupObject(backup.values)) {
            throw new Error('Nem támogatott PH Power Tools biztonsági mentés.');
        }
        if (!backupHas(backup.values, KEYS.SETTINGS)) {
            throw new Error('A mentés nem tartalmazza a fő beállításokat.');
        }

        // MINDEN érték ellenőrzése megelőzi a tároló bármilyen módosítását.
        const updates = [];
        for (const key of [...BACKUP_PREFERENCE_KEYS, ...BACKUP_EXTRA_KEYS]) {
            if (backupHas(backup.values, key)) {
                updates.push([key, serializeBackupValue(key, backup.values[key])]);
            }
        }
        const includesSecrets = backupHas(backup, 'secrets');
        const importedSecrets = includesSecrets ? validateBackupSecrets(backup.secrets) : null;
        return {
            updates,
            includesExtras: BACKUP_EXTRA_KEYS.some(key => backupHas(backup.values, key)),
            includesSecrets,
            importedSecrets,
            exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : '',
        };
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

    function userscriptHttpRequest({ method = "GET", url, headers = {}, body = null, timeout = 20000 }) {
        if (typeof GM_xmlhttpRequest === "function") {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method,
                    url,
                    headers,
                    data: body,
                    timeout,
                    responseType: "text",
                    onload: resolve,
                    onerror: () => reject(new Error(`Network error: ${method} ${url}`)),
                    ontimeout: () => reject(new Error(`Request timeout: ${method} ${url}`)),
                    onabort: () => reject(new Error(`Request aborted: ${method} ${url}`)),
                });
            });
        }

        // Fallback olyan userscript-kezelőhöz, ahol nincs GM_xmlhttpRequest.
        return fetch(url, {
            method,
            headers,
            body,
        }).then(async res => ({
            status: res.status,
            statusText: res.statusText,
            responseText: await res.text(),
        }));
    }

    function getGithubHeaders(withJsonBody = false) {
        return {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${GIST_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(withJsonBody ? { 'Content-Type': 'application/json' } : {}),
        };
    }

    async function fetchGistBlob() {
        const res = await userscriptHttpRequest({
            method: 'GET',
            url: `https://api.github.com/gists/${encodeURIComponent(GIST_ID)}`,
            headers: getGithubHeaders(false),
        });

        if (res.status < 200 || res.status >= 300) {
            throw new Error(`Gist fetch failed: ${res.status} ${res.statusText || ''}`.trim());
        }

        const data = safeJsonParse(res.responseText, null);
        if (!data || typeof data !== 'object') {
            throw new Error('Gist fetch failed: invalid GitHub response');
        }

        const file = data?.files?.[GIST_FILENAME];
        if (!file) return {};

        let content = (typeof file.content === 'string') ? file.content : '';

        // A GitHub API a nagyobb Gist-fájlokat csonkolhatja. Ilyenkor a raw URL kell.
        if ((file.truncated || !content) && file.raw_url) {
            const raw = await userscriptHttpRequest({
                method: 'GET',
                url: file.raw_url,
                headers: { 'Authorization': `Bearer ${GIST_TOKEN}` },
            });
            if (raw.status < 200 || raw.status >= 300) {
                throw new Error(`Gist raw fetch failed: ${raw.status} ${raw.statusText || ''}`.trim());
            }
            content = raw.responseText || '';
        }

        if (!content.trim()) return {};

        const blob = safeJsonParse(content, null);
        if (!blob || typeof blob !== 'object' || Array.isArray(blob)) {
            throw new Error(`A Gist fájl nem érvényes JSON objektum: ${GIST_FILENAME}`);
        }
        return blob;
    }

    async function pushGistBlob(blob) {
        const res = await userscriptHttpRequest({
            method: 'PATCH',
            url: `https://api.github.com/gists/${encodeURIComponent(GIST_ID)}`,
            headers: getGithubHeaders(true),
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(blob, null, 2)
                    }
                }
            })
        });

        if (res.status < 200 || res.status >= 300) {
            throw new Error(`Gist update failed: ${res.status} ${res.statusText || ''}`.trim());
        }
    }

    function createSyncedStorage() {
        let gistCache = null;
        let pushTimer = null;
        let inited = false;
        let syncSuspended = false;

        // Csak az ebben a futásban ténylegesen módosított helyi kulcsok
        // szólhatnak bele a következő Gist írásba. A localStorage egyébként cache.
        const dirtyWrites = new Set();
        const dirtyDeletes = new Set();

        function keyShouldSync(key) {
            return SYNC_KEYS.includes(key);
        }

        function listLocalKeysToSync() {
            return Array.from(new Set(SYNC_KEYS));
        }

        function normalizeRemoteValue(value) {
            if (typeof value !== 'string') return value;
            return safeJsonParse(value, value);
        }

        function normalizeRemoteBlob(blob) {
            const out = {};
            for (const [key, value] of Object.entries(blob || {})) {
                out[key] = normalizeRemoteValue(value);
            }
            return out;
        }

        function readLocalValue(key) {
            const raw = localStorage.getItem(key);
            return raw == null ? null : safeJsonParse(raw, raw);
        }

        function writeLocalValueDirect(key, value) {
            if (value == null) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(value));
        }

        function toTimestamp(value) {
            const n = parseInt(value, 10);
            return Number.isFinite(n) ? n : 0;
        }

        function filterLocalGalleryAfterReset(items, resetTs) {
            if (!Array.isArray(items) || !resetTs) return Array.isArray(items) ? items : [];

            return items.filter(it => {
                if (!it?.url) return false;
                const createdTs = Date.parse(it.createdAt || '');
                return Number.isFinite(createdTs) && createdTs > resetTs;
            });
        }

        function mergeForKey(key, remoteVal, localVal) {
            if (remoteVal == null) return localVal;
            if (localVal == null) return remoteVal;

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

            if (key === KEYS.KEK.GALLERY) {
                const r = Array.isArray(remoteVal) ? remoteVal : [];
                const l = Array.isArray(localVal) ? localVal : [];
                const byUrl = new Map();

                // A Gist-elemek kerülnek be először. A helyi lista csak az ebben
                // a futásban hozzáadott/módosított elemekkel egészítheti ki őket.
                for (const it of [...r, ...l]) {
                    if (!it?.url) continue;
                    const prev = byUrl.get(it.url);
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
                return merged.filter(it => it?.url && !deleted[it.url]);
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

            if (key === KEYS.KEK.GALLERY_RESET_TS) {
                return Math.max(toTimestamp(remoteVal), toTimestamp(localVal));
            }

            // Ezt csak dirty helyi írás esetén hívjuk: ilyenkor a friss helyi
            // módosítás nyer. Nem dirty kulcsnál a Gist pontos értéke kerül le.
            return localVal;
        }

        function applyRemoteBlob(remoteBlob) {
            const remote = normalizeRemoteBlob(remoteBlob);
            const hasOwn = key => Object.prototype.hasOwnProperty.call(remote, key);
            const remoteResetTs = hasOwn(KEYS.KEK.GALLERY_RESET_TS)
                ? toTimestamp(remote[KEYS.KEK.GALLERY_RESET_TS])
                : 0;
            const seenResetTs = toTimestamp(localStorage.getItem(KEYS.KEK.GALLERY_SEEN_RESET_TS));

            // A sorrend fontos: előbb a törlési tombstone és a reset, utána a
            // galéria, hogy a galéria merge már a legfrissebb törléseket lássa.
            const orderedKeys = [
                KEYS.KEK.GALLERY_DELETED,
                KEYS.KEK.GALLERY_RESET_TS,
                ...listLocalKeysToSync().filter(key => ![
                    KEYS.KEK.GALLERY,
                    KEYS.KEK.GALLERY_DELETED,
                    KEYS.KEK.GALLERY_RESET_TS,
                ].includes(key)),
                KEYS.KEK.GALLERY,
            ];

            for (const key of orderedKeys) {
                if (dirtyDeletes.has(key)) continue;

                const localIsDirty = dirtyWrites.has(key);

                // Nem módosított helyi kulcsnál a Gist az egyetlen igazságforrás.
                // Ha a kulcs nincs a Gistben, a régi helyi cache-t is eltávolítjuk.
                if (!localIsDirty) {
                    writeLocalValueDirect(key, hasOwn(key) ? remote[key] : null);
                    continue;
                }

                // Dirty kulcsnál megőrizzük a friss helyi változtatást, de
                // előtte beemeljük az időközben más gépről érkezett adatokat.
                let localVal = readLocalValue(key);

                if (key === KEYS.KEK.GALLERY && remoteResetTs > seenResetTs) {
                    localVal = filterLocalGalleryAfterReset(localVal, remoteResetTs);
                }

                if (hasOwn(key)) {
                    localVal = mergeForKey(key, remote[key], localVal);
                }

                writeLocalValueDirect(key, localVal);
            }

            if (remoteResetTs > seenResetTs) {
                localStorage.setItem(KEYS.KEK.GALLERY_SEEN_RESET_TS, String(remoteResetTs));
            }

            gistCache = remote;
            const gallery = readLocalValue(KEYS.KEK.GALLERY);
            return {
                galleryCount: Array.isArray(gallery) ? gallery.length : 0,
            };
        }

        async function pullAndMergeNow() {
            if (!ENABLE_GIST_SYNC) return { galleryCount: 0 };
            const remote = await fetchGistBlob();
            return applyRemoteBlob(remote);
        }

        async function init() {
            if (inited) return;
            inited = true;
            if (!ENABLE_GIST_SYNC) return;

            try {
                await pullAndMergeNow();
            } catch (e) {
                console.warn('[PH Power Tools] Gist sync (pull) failed:', e);
            }
        }

        function deepEqualJson(a, b) {
            return JSON.stringify(a) === JSON.stringify(b);
        }

        async function doPushNow() {
            if (!ENABLE_GIST_SYNC) return { ok: false, disabled: true };

            const maxAttempts = 3;
            let lastError = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const fetchedRemote = await fetchGistBlob();

                    // Pull mindig megelőzi a push-t. A nem dirty helyi cache-t
                    // felülírja a Gist, a dirty kulcsokat biztonságosan merge-eli.
                    applyRemoteBlob(fetchedRemote);
                    const remote = normalizeRemoteBlob(fetchedRemote);

                    if (!dirtyWrites.size && !dirtyDeletes.size) {
                        gistCache = remote;
                        return { ok: true, changed: false };
                    }

                    const merged = { ...remote };

                    for (const key of listLocalKeysToSync()) {
                        if (dirtyDeletes.has(key)) {
                            delete merged[key];
                            continue;
                        }

                        // Régi vagy üres localStorage-cache soha ne kerüljön fel.
                        // Csak a futás során ténylegesen módosított kulcsokat írjuk.
                        if (!dirtyWrites.has(key)) continue;

                        const localVal = readLocalValue(key);
                        if (localVal == null) continue;

                        const remoteVal = normalizeRemoteValue(merged[key]);
                        merged[key] = mergeForKey(key, remoteVal, localVal);
                    }

                    await pushGistBlob(merged);

                    const after = normalizeRemoteBlob(await fetchGistBlob());
                    if (!deepEqualJson(after, merged)) {
                        throw new Error('A Gist ellenőrző visszaolvasása eltérő tartalmat adott.');
                    }

                    dirtyWrites.clear();
                    dirtyDeletes.clear();
                    gistCache = after;
                    return { ok: true, changed: true };
                } catch (e) {
                    lastError = e;
                    console.warn(`[PH Power Tools] Gist push attempt ${attempt}/${maxAttempts} failed:`, e);
                    if (attempt < maxAttempts) {
                        await new Promise(r => setTimeout(r, 150 + Math.floor(Math.random() * 250)));
                    }
                }
            }

            throw lastError || new Error('Gist sync failed after retries');
        }

        function schedulePush() {
            if (!ENABLE_GIST_SYNC || syncSuspended) return;
            if (pushTimer) clearTimeout(pushTimer);
            pushTimer = setTimeout(() => {
                pushTimer = null;
                doPushNow().catch(e => {
                    console.warn('[PH Power Tools] Scheduled Gist sync failed:', e);
                });
            }, 2000);
        }

        async function cancelTimerAndRun(fn) {
            if (pushTimer) {
                clearTimeout(pushTimer);
                pushTimer = null;
            }
            return await fn();
        }

        return {
            init,
            suspendSync() {
                syncSuspended = true;
                if (pushTimer) {
                    clearTimeout(pushTimer);
                    pushTimer = null;
                }
            },
            resumeSync() {
                syncSuspended = false;
                if (dirtyWrites.size || dirtyDeletes.size) schedulePush();
            },
            // Importkor a változatlan helyi értékek is bekerüljenek az új Gistbe.
            markImportKeysDirty(keys) {
                for (const key of keys) {
                    if (!keyShouldSync(key)) continue;
                    if (localStorage.getItem(key) === null) {
                        dirtyWrites.delete(key);
                        dirtyDeletes.add(key);
                    } else {
                        dirtyDeletes.delete(key);
                        dirtyWrites.add(key);
                    }
                }
                schedulePush();
            },
            async flush() {
                return cancelTimerAndRun(doPushNow);
            },
            async syncNow() {
                return cancelTimerAndRun(async () => {
                    const pulled = await pullAndMergeNow();
                    await doPushNow();
                    return pulled;
                });
            },
            getItem(key) { return localStorage.getItem(key); },
            setItem(key, value) {
                const prev = localStorage.getItem(key);
                if (prev === value) return;

                localStorage.setItem(key, value);

                if (keyShouldSync(key)) {
                    dirtyDeletes.delete(key);
                    dirtyWrites.add(key);
                    schedulePush();
                }
            },
            removeItem(key) {
                localStorage.removeItem(key);
                if (keyShouldSync(key)) {
                    dirtyWrites.delete(key);
                    dirtyDeletes.add(key);
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

    // A márka elsődleges gombszíne önmagában nem feltétlenül olvasható
    // sötét felületen (különösen a Mobilaréna kék témáján). Külön token kell
    // a gombok HÁTTÉRszínéhez és a kis méretű szöveg/ikon KIEMELÉSÉHEZ.
    // Utóbbit WCAG szerinti, legalább 7:1-es alapkontrasztra korrigáljuk.
    function phPtParseRgb(value) {
        const raw = String(value || '').trim();
        const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hex) {
            const h = hex[1].length === 3
                ? hex[1].split('').map(ch => ch + ch).join('') : hex[1];
            return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
        }
        // color-mix() eredménye modern böngészőben color(srgb ...) is lehet.
        const srgb = raw.match(/^color\(srgb\s+(.+)\)$/i);
        if (srgb) {
            const values = srgb[1].trim().split(/[\s,\/]+/).filter(Boolean);
            if (values.length < 3 || (values[3] && parseFloat(values[3]) <= 0)) return null;
            const channels = values.slice(0, 3).map(value => parseFloat(value) * 255);
            if (channels.some(channel => !Number.isFinite(channel))) return null;
            return channels.map(channel => Math.max(0, Math.min(255, Math.round(channel))));
        }
        const rgb = raw.match(/^rgba?\((.+)\)$/i);
        if (!rgb) return null;
        const parts = rgb[1].trim().split(/[\s,\/]+/).filter(Boolean);
        if (parts.length < 3) return null;
        const channels = parts.slice(0, 3).map(part => part.endsWith('%')
            ? parseFloat(part) * 2.55 : parseFloat(part));
        if (channels.some(channel => !Number.isFinite(channel))) return null;
        if (parts.length >= 4 && parseFloat(parts[3]) <= 0) return null;
        return channels.map(channel => Math.max(0, Math.min(255, Math.round(channel))));
    }

    function phPtLuminance(rgb) {
        const [r, g, b] = rgb.map(v => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function phPtContrast(a, b) {
        const x = phPtLuminance(a);
        const y = phPtLuminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }

    function phPtReadableAccent(accent, surface, dark) {
        const MIN_CONTRAST = 7; // Kis feliratokon, enyhén színezett kártyákon is jól olvasható.
        if (phPtContrast(accent, surface) >= MIN_CONTRAST) return accent;
        const goal = dark ? [255, 255, 255] : [0, 0, 0];
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 20; i++) {
            const t = (lo + hi) / 2;
            const mixed = accent.map((v, j) => Math.round(v + (goal[j] - v) * t));
            if (phPtContrast(mixed, surface) >= MIN_CONTRAST) hi = t;
            else lo = t;
        }
        return accent.map((v, j) => Math.round(v + (goal[j] - v) * hi));
    }

    function phPtSyncSitePalette() {
        if (!document.body) return;

        // A márka gombszínét továbbra is a weboldal adja, de a rajta lévő
        // feliratnak és a sötét háttéren álló kiemeléseknek külön kontrasztja van.
        const probe = document.createElement('button');
        probe.type = 'button';
        probe.className = 'btn btn-forum btn-primary';
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText = 'position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none;';
        document.body.appendChild(probe);
        const accentSample = getComputedStyle(probe).backgroundColor;
        probe.remove();

        const dark = document.body.dataset.theme === 'dark';
        const surface = phPtParseRgb(getComputedStyle(document.body)
            .getPropertyValue('--ph-ui-bg')) || (dark ? [36, 37, 38] : [255, 255, 255]);
        const accent = phPtParseRgb(accentSample) || [79, 127, 178];
        const ink = phPtReadableAccent(accent, surface, dark);
        const onAccent = phPtContrast(accent, [255, 255, 255]) >=
            phPtContrast(accent, [0, 0, 0]) ? '#ffffff' : '#000000';
        const toCss = rgb => `rgb(${rgb.join(', ')})`;

        document.body.style.setProperty('--ph-ui-accent', toCss(accent));
        document.body.style.setProperty('--ph-ui-accent-fg', onAccent);
        document.body.style.setProperty('--ph-ui-accent-ink', toCss(ink));
    }

    function phPtSyncThemeAttr() {
        const isDark = phPtDetectDark();
        document.body.dataset.theme = isDark ? "dark" : "light";
        phPtSyncSitePalette();
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
        phPtSyncSitePalette();
        const li = document.createElement('li');
        li.id = 'ph-power-tools-dropdown';
        li.className = 'dropdown';

        li.innerHTML = `
            <a href="javascript:;" class="nav-btn dropdown-toggle ph-power-btn"
                data-toggle="dropdown"
                title="PH Power Tools beállítások">
                <span class="fas fa-sliders-h fa-fw"></span>
            </a>
            <div class="dropdown-menu dropdown-menu-right ph-power-menu">
                <div class="ph-menu-head">
                    <div class="ph-menu-title-wrap">
                        <span class="ph-menu-mark"><span class="fas fa-bolt"></span></span>
                        <span>
                            <strong class="ph-menu-title">PH Power Tools</strong>
                            <small class="ph-menu-subtitle">Fórum finomhangolása</small>
                        </span>
                    </div>
                    <div class="ph-menu-actions">
                        ${(savedSettings.colorize || savedSettings.msgAnchorHighlight) ? `
                            <button type="button"
                                    id="ph-open-colors"
                                    class="ph-icon-btn"
                                    title="Hozzászólás színek"
                                    aria-label="Hozzászólás színek">
                                <span class="fas fa-palette"></span>
                            </button>
                        ` : ``}

                        <button type="button"
                                id="ph-open-backup"
                                class="ph-icon-btn"
                                title="Beállítások importálása / exportálása"
                                aria-label="Beállítások importálása / exportálása">
                            <span class="fas fa-file-export"></span>
                        </button>

                        <button type="button"
                                id="ph-open-secrets"
                                class="ph-icon-btn"
                                title="Kulcsok és szinkron"
                                aria-label="Kulcsok és szinkron">
                            <span class="fas fa-cog"></span>
                        </button>
                    </div>
                </div>
                <div class="ph-accordion">
                    ${Object.entries(settingGroups).map(([groupKey, group]) => `
                        <div class="ph-acc-group">
                            <button type="button"
                                    class="ph-acc-header"
                                    data-group="${groupKey}"
                                    aria-expanded="${group.defaultOpen ? 'true' : 'false'}">
                                <span>${group.label}</span>
                                <i class="ph-acc-arrow fas fa-chevron-down fa-fw"></i>
                            </button>
                            <div class="ph-acc-body ${group.defaultOpen ? 'open' : ''}">
                                <div class="ph-setting-list">
                                    ${group.keys.map(key => `
                                        <button type="button"
                                                class="dropdown-item ph-setting-row"
                                                data-key="${key}"
                                                data-active="${draftSettings[key] ? 'true' : 'false'}"
                                                aria-pressed="${draftSettings[key] ? 'true' : 'false'}">
                                            <span class="ph-setting-copy">
                                                <span class="ph-setting-label">
                                                    ${prettyName(key)}
                                                    ${tooltips[key] ? `<i class="fas fa-info-circle ph-tooltip-icon" data-tooltip="${tooltips[key]}"></i>` : ''}
                                                </span>
                                            </span>
                                            <span class="ph-toggle-state" aria-hidden="true">
                                                <span class="ph-switch-knob"></span>
                                            </span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="ph-menu-footer">
                    <span class="ph-menu-dirty" aria-live="polite">Nincs mentetlen módosítás</span>
                    <button class="btn btn-sm btn-forum btn-primary ph-apply-btn" disabled>
                        Mentés
                    </button>
                </div>
            </div>
        `;

        // ===== Secrets modal =====
        if (!document.getElementById('ph-secrets-modal')) {
            const modal = document.createElement('div');
            modal.id = 'ph-secrets-modal';
            modal.className = 'ph-pt-modal';

            modal.innerHTML = `
                <div id="ph-secrets-panel" class="ph-pt-dialog ph-pt-dialog-wide"
                     role="dialog" aria-modal="true" aria-labelledby="ph-secrets-title">
                    <div class="ph-dialog-head">
                        <div class="ph-dialog-title-wrap">
                            <span class="ph-dialog-mark"><span class="fas fa-key"></span></span>
                            <span>
                                <strong id="ph-secrets-title" class="ph-dialog-title">Kulcsok és szinkron</strong>
                                <small class="ph-dialog-subtitle">PH Power Tools kapcsolat- és API-beállítások</small>
                            </span>
                        </div>
                        <div class="ph-dialog-head-actions">
                            <span class="ph-sync-state">
                                <span id="ph-sync-status-icon"></span>
                                <span>Gist</span>
                            </span>
                            <button type="button" class="ph-icon-btn ph-dialog-close" id="ph-secrets-close"
                                    title="Bezárás" aria-label="Bezárás">
                                <span class="fas fa-times"></span>
                            </button>
                        </div>
                    </div>

                    <div class="ph-dialog-body">
                        <div class="ph-field-grid">
                            <label class="ph-field">
                                <span class="ph-field-label">GitHub Gist Token</span>
                                <input id="ph-secret-gist-token" type="text" class="form-control form-control-sm ph-field-input"
                                       placeholder="github_pat_...">
                            </label>

                            <label class="ph-field">
                                <span class="ph-field-label">Gist ID</span>
                                <input id="ph-secret-gist-id" type="text" class="form-control form-control-sm ph-field-input"
                                       placeholder="0123456789abcdef...">
                            </label>

                            <label class="ph-field">
                                <span class="ph-field-label">Gist fájlnév</span>
                                <input id="ph-secret-gist-filename" type="text" class="form-control form-control-sm ph-field-input"
                                       placeholder="pl. ph_forum_settings.json">
                            </label>

                            <label class="ph-field">
                                <span class="ph-field-label">
                                    kek.sh API key
                                    <a href="https://kek.sh/settings/api" target="_blank" rel="noopener noreferrer"
                                       class="ph-field-help">API kulcs</a>
                                </span>
                                <input id="ph-secret-kek-key" type="text" class="form-control form-control-sm ph-field-input"
                                       placeholder="0123456789abcdef...">
                            </label>
                        </div>
                    </div>

                    <div class="ph-dialog-footer">
                        <span id="ph-secret-status" class="ph-dialog-status" aria-live="polite"></span>
                        <span class="ph-dialog-note">Mentés után újratöltés történik.</span>
                        <div class="ph-dialog-buttons">
                            <button type="button" class="btn btn-sm btn-forum ph-secondary-btn" id="ph-secret-clear">Törlés</button>
                            <button type="button" class="btn btn-sm btn-forum btn-primary" id="ph-secret-save">
                                Mentés
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        }

        // ===== Beállítások biztonsági mentése / visszaállítása =====
        if (!document.getElementById('ph-backup-modal')) {
            const backupModal = document.createElement('div');
            backupModal.id = 'ph-backup-modal';
            backupModal.className = 'ph-pt-modal';
            backupModal.innerHTML = `
                <div class="ph-pt-dialog ph-pt-dialog-wide" role="dialog" aria-modal="true"
                     aria-labelledby="ph-backup-title">
                    <div class="ph-dialog-head">
                        <div class="ph-dialog-title-wrap">
                            <span class="ph-dialog-mark"><span class="fas fa-file-export"></span></span>
                            <span>
                                <strong id="ph-backup-title" class="ph-dialog-title">Beállítások mentése</strong>
                                <small class="ph-dialog-subtitle">Exportálás és importálás JSON-fájlból</small>
                            </span>
                        </div>
                        <button type="button" class="ph-icon-btn ph-dialog-close" id="ph-backup-close"
                                title="Bezárás" aria-label="Bezárás"><span class="fas fa-times"></span></button>
                    </div>
                    <div class="ph-dialog-body ph-backup-body">
                        <section class="ph-backup-section">
                            <strong class="ph-backup-heading"><span class="fas fa-download"></span> Exportálás</strong>
                            <p>Kapcsolók, egyéni színek, rejtett felhasználók és mentett nézetállapotok letöltése.</p>
                            <label class="ph-backup-option" data-enabled="false">
                                <span class="ph-backup-option-copy">Olvasottsági adatok és kek.sh képgaléria mentése is</span>
                                <span class="ph-backup-option-control">
                                    <input type="checkbox" id="ph-backup-extra" class="ph-backup-toggle">
                                    <span class="ph-backup-switch" aria-hidden="true"><span class="ph-backup-switch-knob"></span></span>
                                    <strong class="ph-backup-option-state" aria-hidden="true">KI</strong>
                                </span>
                            </label>
                            <label class="ph-backup-option" data-enabled="false">
                                <span class="ph-backup-option-copy">API-kulcsok és Gist-kapcsolati adatok mentése is</span>
                                <span class="ph-backup-option-control">
                                    <input type="checkbox" id="ph-backup-secrets" class="ph-backup-toggle">
                                    <span class="ph-backup-switch" aria-hidden="true"><span class="ph-backup-switch-knob"></span></span>
                                    <strong class="ph-backup-option-state" aria-hidden="true">KI</strong>
                                </span>
                            </label>
                            <div id="ph-backup-sensitive-warning" class="ph-backup-sensitive-warning" role="note" hidden>
                                <span class="fas fa-exclamation-triangle" aria-hidden="true"></span>
                                <span class="ph-backup-sensitive-copy">
                                    A fájl a GitHub Gist tokent, Gist ID-t, fájlnevet és a kek.sh API-kulcsot
                                    <strong>titkosítatlanul</strong> tartalmazza. Ne oszd meg, és csak biztonságos helyen tárold!
                                </span>
                            </div>
                            <button type="button" id="ph-backup-export"
                                    class="btn btn-sm btn-forum btn-primary">
                                <span class="fas fa-download"></span> Exportálás (.json)
                            </button>
                        </section>
                        <section class="ph-backup-section">
                            <strong class="ph-backup-heading"><span class="fas fa-upload"></span> Importálás</strong>
                            <p>Korábban exportált PH Power Tools-fájl betöltése. Az importált beállítások
                               felülírják a jelenlegieket; előtte megerősítést kérünk.</p>
                            <input type="file" id="ph-backup-file" accept=".json,.txt,application/json,text/plain" hidden>
                            <button type="button" id="ph-backup-import"
                                    class="btn btn-sm btn-forum ph-secondary-btn">
                                <span class="fas fa-folder-open"></span> Fájl kiválasztása…
                            </button>
                        </section>
                        <div class="ph-backup-hint">
                            <span class="fas fa-shield-alt"></span>
                            <span>
                                Az API-/Gist-kulcsok mentése külön kapcsolható.
                                A galéria bizalmas tokeneket is tartalmazhat.
                                Aktív Gist-szinkron esetén az olvasottsági és
                                galériaadatok összeolvadhatnak a távoli adatokkal.
                            </span>
                        </div>
                    </div>
                    <div class="ph-dialog-footer">
                        <span id="ph-backup-status" class="ph-dialog-status ph-backup-status" aria-live="polite"></span>
                        <div class="ph-dialog-buttons">
                            <button type="button" id="ph-backup-done" class="btn btn-sm btn-forum ph-secondary-btn">Bezárás</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(backupModal);
        }

        // ===== Colorize Colors modal =====
        if (!document.getElementById('ph-colors-modal')) {
            const modal = document.createElement('div');
            modal.id = 'ph-colors-modal';
            modal.className = 'ph-pt-modal';

            modal.innerHTML = `
                <div id="ph-colors-panel" class="ph-pt-dialog ph-colors-dialog"
                     role="dialog" aria-modal="true" aria-labelledby="ph-colors-title">
                    <div class="ph-dialog-head">
                        <div class="ph-dialog-title-wrap">
                            <span class="ph-dialog-mark"><span class="fas fa-palette"></span></span>
                            <span>
                                <strong id="ph-colors-title" class="ph-dialog-title">Hozzászólás színek</strong>
                                <small class="ph-dialog-subtitle">Világos és sötét téma kiemelései</small>
                            </span>
                        </div>
                        <button type="button" class="ph-icon-btn ph-dialog-close" id="ph-colors-close"
                                title="Bezárás" aria-label="Bezárás">
                            <span class="fas fa-times"></span>
                        </button>
                    </div>
                    <div class="ph-dialog-body">
                        <div id="ph-colors-body"></div>
                    </div>
                    <div class="ph-dialog-footer">
                        <span class="ph-dialog-note">A módosítások mentéskor lépnek életbe.</span>
                        <div class="ph-dialog-buttons">
                            <button type="button" class="btn btn-sm btn-forum ph-secondary-btn" id="ph-colors-reset">Alaphelyzet</button>
                            <button type="button" class="btn btn-sm btn-forum btn-primary" id="ph-colors-save">
                                Mentés
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function applyColorsTheme() {
            phPtSyncThemeAttr();
        }

        function renderColorsModal(settings) {
            const modal = document.getElementById("ph-colors-modal");
            const body = modal?.querySelector("#ph-colors-body");
            if (!modal || !body) return;

            const pal = settings.colorizePalette || DEFAULT_COLORIZE_PALETTE;

            const colorizeFields = [
                { key: "own",         label: "Saját" },
                { key: "reply",       label: "Válasz" },
                { key: "akcio",       label: "#akció" },
                { key: "focusAuthor", label: "Fókusz: szerző" },
                { key: "focusReply",  label: "Fókusz: válasz" },
            ];

            const hashFields = [
                { key: "hashHighlight", label: "Üzenet kiemelés" },
            ];

            const enabledColorize = !!savedSettings.colorize;
            const enabledHash = !!savedSettings.msgAnchorHighlight;

            const fields =
                enabledColorize && enabledHash ? [...colorizeFields, ...hashFields]
                    : enabledColorize ? colorizeFields
                        : enabledHash ? hashFields
                            : [];

            if (!fields.length) {
                body.innerHTML = `<div class="ph-empty-state">Nincs bekapcsolt színezős funkció.</div>`;
                return;
            }

            body.innerHTML = `
                <div class="ph-color-grid">
                    ${["light","dark"].map(theme => `
                        <section class="ph-color-card" data-preview-theme="${theme}">
                            <div class="ph-color-card-title">
                                <span class="fas ${theme === "light" ? "fa-sun" : "fa-moon"}"></span>
                                ${theme === "light" ? "Világos" : "Sötét"}
                            </div>
                            <div class="ph-color-rows">
                                ${fields.map(f => `
                                    <label class="ph-color-row">
                                        <span>${f.label}</span>
                                        <input type="color"
                                            class="ph-color-input"
                                            data-theme="${theme}"
                                            data-k="${f.key}"
                                            value="${pal?.[theme]?.[f.key] || DEFAULT_COLORIZE_PALETTE[theme][f.key]}">
                                    </label>
                                `).join("")}
                            </div>
                        </section>
                    `).join("")}
                </div>
            `;
        }

        function applySecretsTheme() {
            phPtSyncThemeAttr();
        }

        container.prepend(li);

        const openBtn = li.querySelector('#ph-open-secrets');
        const modal = document.getElementById('ph-secrets-modal');
        const openColorsBtn = li.querySelector('#ph-open-colors');
        const colorsModal = document.getElementById('ph-colors-modal');

        let colorsDraftPalette = null;

        const backupModal = document.getElementById('ph-backup-modal');
        const openBackupBtn = li.querySelector('#ph-open-backup');
        const backupStatus = backupModal?.querySelector('#ph-backup-status');
        const backupFileInput = backupModal?.querySelector('#ph-backup-file');
        const backupExportBtn = backupModal?.querySelector('#ph-backup-export');
        const backupImportBtn = backupModal?.querySelector('#ph-backup-import');
        const backupExtraInput = backupModal?.querySelector('#ph-backup-extra');
        const backupSecretsInput = backupModal?.querySelector('#ph-backup-secrets');
        const backupSensitiveWarning = backupModal?.querySelector('#ph-backup-sensitive-warning');

        function refreshBackupOptions() {
            for (const input of [backupExtraInput, backupSecretsInput]) {
                if (!input) continue;
                const row = input.closest('.ph-backup-option');
                if (!row) continue;
                row.dataset.enabled = input.checked ? 'true' : 'false';
                const state = row.querySelector('.ph-backup-option-state');
                if (state) state.textContent = input.checked ? 'BE' : 'KI';
            }
            if (backupSensitiveWarning) backupSensitiveWarning.hidden = !backupSecretsInput?.checked;
        }

        backupExtraInput?.addEventListener('change', refreshBackupOptions);
        backupSecretsInput?.addEventListener('change', refreshBackupOptions);
        refreshBackupOptions();

        function setBackupBusy(busy) {
            if (backupExportBtn) backupExportBtn.disabled = busy;
            if (backupImportBtn) backupImportBtn.disabled = busy;
            if (backupExtraInput) backupExtraInput.disabled = busy;
            if (backupSecretsInput) backupSecretsInput.disabled = busy;
        }

        function closeBackupModal() {
            if (backupModal) backupModal.style.display = 'none';
            // Bizalmas adatok exportálásához minden alkalommal új döntés szükséges.
            if (backupSecretsInput) backupSecretsInput.checked = false;
            refreshBackupOptions();
        }

        openBackupBtn?.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            li.querySelector('.dropdown-toggle')?.click();
            setTimeout(() => {
                phPtSyncThemeAttr();
                if (backupSecretsInput) backupSecretsInput.checked = false;
                refreshBackupOptions();
                if (backupStatus) backupStatus.textContent = '';
                if (backupModal) backupModal.style.display = 'flex';
            }, 0);
        });

        backupModal?.addEventListener('click', event => {
            if (event.target === backupModal) closeBackupModal();
        });
        backupModal?.querySelector('#ph-backup-close')?.addEventListener('click', closeBackupModal);
        backupModal?.querySelector('#ph-backup-done')?.addEventListener('click', closeBackupModal);

        backupExportBtn?.addEventListener('click', async () => {
            setBackupBusy(true);
            try {
                const includeExtras = !!backupExtraInput?.checked;
                const includeSecrets = !!backupSecretsInput?.checked;
                const backup = await makeSettingsBackup(includeExtras, includeSecrets);
                const json = JSON.stringify(backup, null, 2);
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `ph-power-tools-${includeSecrets ? 'with-secrets' : 'settings'}-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                if (backupStatus) backupStatus.textContent = includeSecrets
                    ? 'A bizalmas adatokat is tartalmazó mentés letöltése elindult.'
                    : 'A letöltés elindult.';
            } catch (error) {
                console.error('[PH Power Tools] Backup export failed:', error);
                if (backupStatus) backupStatus.textContent = `Exportálási hiba: ${error.message}`;
            } finally {
                setBackupBusy(false);
            }
        });

        backupImportBtn?.addEventListener('click', () => backupFileInput?.click());
        backupFileInput?.addEventListener('change', async () => {
            const file = backupFileInput.files?.[0];
            backupFileInput.value = ''; // Ugyanazt a fájlt később ismét ki lehessen választani.
            if (!file) return;
            setBackupBusy(true);
            if (backupStatus) backupStatus.textContent = 'A mentés ellenőrzése…';
            let modified = false;
            try {
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error('A fájl túl nagy (maximum 10 MB).');
                }
                const backup = JSON.parse(await file.text());
                const { updates, includesExtras, includesSecrets, importedSecrets, exportedAt } =
                    prepareSettingsBackupImport(backup);
                const date = Date.parse(exportedAt);
                const displayDate = Number.isFinite(date)
                    ? new Date(date).toLocaleString('hu-HU') : 'ismeretlen';
                const extraMessage = includesExtras
                    ? '\nA mentés képgaléria- és olvasottsági adatokat is tartalmaz.' : '';
                const secretMessage = includesSecrets
                    ? '\nA mentés API-/Gist-kulcsokat is tartalmaz; a jelenlegi kapcsolati adatokat felülírja.' : '';
                const syncMessage = includesSecrets && importedSecrets.gistToken && importedSecrets.gistId
                    ? '\nA visszaállított Gist-kapcsolatra a beállítások szinkronizálódnak.' : '';
                const confirmed = window.confirm(
                    `PH Power Tools beállítások importálása\n\n` +
                    `Mentés dátuma: ${displayDate}\n` +
                    `A mentés ${updates.length} tárolási bejegyzést állít vissza, felülírva a jelenlegi értékeket.` +
                    `${extraMessage}${secretMessage}${syncMessage}\n\nFolytatod?`
                );
                if (!confirmed) {
                    if (backupStatus) backupStatus.textContent = 'Importálás megszakítva.';
                    return;
                }

                const previousValues = updates.map(([key]) => [key, storage.getItem(key)]);
                const previousSecrets = includesSecrets ? await loadSecrets() : null;
                storage.suspendSync();
                try {
                    for (const [key, value] of updates) {
                        if (value === null) storage.removeItem(key);
                        else storage.setItem(key, value);
                    }
                    if (includesSecrets) {
                        // A régi Gist-kapcsolattal egyetlen importált adat se menjen ki.
                        await saveSecrets(importedSecrets);
                        activateSecrets(importedSecrets);
                    }
                    // A Gistbe az importált értékek kerüljenek akkor is, ha a
                    // helyi gyorsítótárban azonos szöveg szerepelt.
                    storage.markImportKeysDirty(updates.map(([key]) => key));
                } catch (writeError) {
                    // Tárolási hiba esetén állítsuk vissza a korábbi helyi állapotot.
                    for (const [key, previous] of previousValues) {
                        try {
                            if (previous === null) storage.removeItem(key);
                            else storage.setItem(key, previous);
                        } catch (rollbackError) {
                            console.warn('[PH Power Tools] Backup rollback failed:', key, rollbackError);
                        }
                    }
                    if (includesSecrets) {
                        try {
                            await saveSecrets(previousSecrets);
                            activateSecrets(previousSecrets);
                        } catch (rollbackError) {
                            console.warn('[PH Power Tools] Secret rollback failed:', rollbackError);
                        }
                    }
                    throw writeError;
                } finally {
                    storage.resumeSync();
                }
                modified = true;
                await storage.flush();
                if (backupStatus) backupStatus.textContent = 'Importálás kész. Az oldal újratöltődik…';
                location.reload();
            } catch (error) {
                console.error('[PH Power Tools] Backup import failed:', error);
                if (backupStatus) {
                    backupStatus.textContent = modified
                        ? `Helyi import kész, de a Gist-szinkron hibázott: ${error.message}. Ellenőrizd a kapcsolatot, majd importálj újra.`
                        : `Importálási hiba: ${error.message}`;
                }
            } finally {
                setBackupBusy(false);
            }
        });


        function openColorsModal() {
            if (!colorsModal) return;
            applyColorsTheme();

            const currentSettings = getMergedSettings();
            colorsDraftPalette = structuredClone(currentSettings.colorizePalette || DEFAULT_COLORIZE_PALETTE);

            // render: a draftból
            renderColorsModal({ colorizePalette: colorsDraftPalette });

            colorsModal.style.display = "flex";
        }

        function closeColorsModal() {
            if (!colorsModal) return;
            colorsModal.style.display = "none";
            colorsDraftPalette = null;
        }

        // 🎨 gomb katt: nyit
        openColorsBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // zárjuk a dropdownot, majd nyissuk a modalt a következő tick-ben
            li.querySelector('.dropdown-toggle')?.click();
            setTimeout(openColorsModal, 0);
        });

        // háttér katt: zár
        colorsModal?.addEventListener('click', (e) => {
            if (e.target === colorsModal) closeColorsModal();
        });

        // X katt: zár
        colorsModal?.querySelector('#ph-colors-close')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeColorsModal();
        });

        // Mentés: SETTINGS-be ment + sync flush + reload
        colorsModal?.querySelector('#ph-colors-save')?.addEventListener('click', async (e) => {
            e.preventDefault();

            const currentSettings = getMergedSettings();
            const newPal = structuredClone(currentSettings.colorizePalette || DEFAULT_COLORIZE_PALETTE);

            colorsModal.querySelectorAll('input[type="color"][data-theme][data-k]').forEach(inp => {
                const theme = inp.dataset.theme;
                const k = inp.dataset.k;
                newPal[theme][k] = inp.value;
            });

            currentSettings.colorizePalette = newPal;

            storage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
            await storage.flush();

            colorsModal.style.display = "none";
            location.reload();
        });

        // Alaphelyzet: DEFAULT
        colorsModal?.querySelector('#ph-colors-reset')?.addEventListener('click', (e) => {
            e.preventDefault();

            colorsDraftPalette = structuredClone(DEFAULT_COLORIZE_PALETTE);
            renderColorsModal({ colorizePalette: colorsDraftPalette });
        });

        async function openSecretsModal() {
            if (!modal) return;
            applySecretsTheme();

            const s = await loadSecrets();

            const syncIcon = modal.querySelector('#ph-sync-status-icon');
            const syncState = modal.querySelector('.ph-sync-state');
            if (syncIcon) {
                const active = !!(
                    (s.gistToken || '').trim() &&
                    (s.gistId || '').trim() &&
                    ((s.gistFilename || DEFAULT_GIST_FILENAME).trim())
                );

                if (active) {
                    syncIcon.style.background = 'limegreen';
                    syncState.title = 'Szinkron: aktív (Gist beállítva)';
                } else {
                    syncIcon.style.background = '#9aa0a6';
                    syncState.title = 'Szinkron: inaktív (hiányzó Gist adatok)';
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

            // zárjuk a dropdownot, majd nyissuk a modalt a következő tick-ben
            li.querySelector('.dropdown-toggle')?.click();
            setTimeout(openSecretsModal, 0);
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
        if (!document.body.dataset.phModalsEscBound) {
            document.body.dataset.phModalsEscBound = "1";

            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;

                const secretsModal = document.getElementById('ph-secrets-modal');
                const colorsModal  = document.getElementById('ph-colors-modal');
                const backupModal  = document.getElementById('ph-backup-modal');

                if (backupModal?.style.display === 'flex') {
                    backupModal.style.display = 'none';
                    return;
                }

                // Először a színek modalt zárjuk, ha az van nyitva
                if (colorsModal?.style.display === 'flex') {
                    colorsModal.style.display = 'none';
                    return;
                }

                // Utána a secrets modalt
                if (secretsModal?.style.display === 'flex') {
                    secretsModal.style.display = 'none';
                    return;
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
        const menu = li.querySelector('.dropdown-menu');

        function resetAccordionHeights() {
            li.querySelectorAll('.ph-acc-body').forEach(body => {
                body.style.maxHeight = null;
            });
        }

        function applyAccordionHeights() {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    li.querySelectorAll('.ph-acc-body.open').forEach(body => {
                        body.style.maxHeight = body.scrollHeight + "px";
                    });
                });
            });
        }

        const dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.attributeName === 'class') {
                    const isOpen = menu.classList.contains('show');
                    if (isOpen) {
                        applyAccordionHeights();
                    } else {
                        resetAccordionHeights();
                    }
                }
            });
        });

        dropdownObserver.observe(menu, { attributes: true });

        toggleBtn.addEventListener('click', () => {
            setTimeout(() => toggleBtn.blur(), 50);
        });

        // Dropdown item click
        li.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', e => {
                e.stopPropagation();

                const key = item.dataset.key;
                draftSettings[key] = !draftSettings[key];

                const active = !!draftSettings[key];
                item.dataset.active = active ? 'true' : 'false';
                item.setAttribute('aria-pressed', active ? 'true' : 'false');

                const isDirty = JSON.stringify(draftSettings) !== JSON.stringify(savedSettings);
                applyBtn.disabled = !isDirty;
                const dirtyLabel = li.querySelector('.ph-menu-dirty');
                if (dirtyLabel) {
                    dirtyLabel.textContent = isDirty ? 'Mentetlen módosítások' : 'Nincs mentetlen módosítás';
                    dirtyLabel.classList.toggle('is-dirty', isDirty);
                }
            });
        });

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
                const allHeaders = li.querySelectorAll('.ph-acc-header');

                const body = header.nextElementSibling;
                const isOpen = body.classList.contains('open');

                // close all
                allBodies.forEach(b => {
                    b.style.maxHeight = null;
                    b.classList.remove('open');
                });
                allHeaders.forEach(h => h.setAttribute('aria-expanded', 'false'));

                // open clicked if it wasn't open
                if (!isOpen) {
                    body.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + "px";
                    header.setAttribute('aria-expanded', 'true');
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
            body {
                --ph-ui-bg: #ffffff;
                --ph-ui-fg: #202124;
                --ph-ui-muted: #6b7280;
                --ph-ui-border: rgba(17, 24, 39, 0.11);
                --ph-ui-soft: rgba(17, 24, 39, 0.045);
                --ph-ui-hover: rgba(17, 24, 39, 0.07);
                --ph-ui-accent: #4f7fb2;
                --ph-ui-accent-fg: #ffffff;
                --ph-ui-accent-ink: #245d92;
                --ph-ui-success: #146a42;
                --ph-ui-danger: #a72230;
                --ph-ui-warning: #94520d;
                --ph-ui-shadow: 0 16px 42px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
            }
            body[data-theme="dark"] {
                --ph-ui-bg: #242526;
                --ph-ui-fg: #f1f3f4;
                --ph-ui-muted: #bdc3cc;
                --ph-ui-accent-ink: #91c9ff;
                --ph-ui-success: #79d5a0;
                --ph-ui-danger: #ff98a2;
                --ph-ui-warning: #f4bf66;
                --ph-ui-border: rgba(255, 255, 255, 0.11);
                --ph-ui-soft: rgba(255, 255, 255, 0.05);
                --ph-ui-hover: rgba(255, 255, 255, 0.08);
                --ph-ui-shadow: 0 16px 42px rgba(0, 0, 0, 0.44), 0 2px 8px rgba(0, 0, 0, 0.25);
            }

            #ph-power-tools-dropdown {
                --ph-menu-bg: var(--ph-ui-bg);
                --ph-menu-fg: var(--ph-ui-fg);
                --ph-menu-muted: var(--ph-ui-muted);
                --ph-menu-border: var(--ph-ui-border);
                --ph-menu-soft: var(--ph-ui-soft);
                --ph-menu-hover: var(--ph-ui-hover);
                --ph-menu-accent: var(--ph-ui-accent);
                --ph-menu-accent-text: var(--ph-ui-accent-ink);
                --ph-menu-accent-soft: color-mix(in srgb, var(--ph-ui-accent) 16%, transparent);
                --ph-menu-shadow: var(--ph-ui-shadow);
            }
            .ph-power-menu {
                width: 306px;
                min-width: 306px;
                max-height: min(68vh, 620px);
                padding: 0 !important;
                overflow: hidden;
                color: var(--ph-menu-fg);
                background: var(--ph-menu-bg);
                border: 1px solid var(--ph-menu-border);
                border-radius: 12px;
                box-shadow: var(--ph-menu-shadow);
            }
            .ph-menu-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 10px 11px 9px;
                border-bottom: 1px solid var(--ph-menu-border);
            }
            .ph-menu-title-wrap,
            .ph-dialog-title-wrap {
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 9px;
            }
            .ph-menu-mark,
            .ph-dialog-mark {
                width: 28px;
                height: 28px;
                flex: 0 0 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                color: var(--ph-ui-accent-ink);
                background: color-mix(in srgb, var(--ph-ui-accent) 15%, transparent);
            }
            .ph-menu-title,
            .ph-menu-subtitle,
            .ph-dialog-title,
            .ph-dialog-subtitle {
                display: block;
                line-height: 1.18;
            }
            .ph-menu-title,
            .ph-dialog-title {
                font-size: 13px;
                font-weight: 700;
                color: var(--ph-ui-fg);
            }
            .ph-menu-subtitle,
            .ph-dialog-subtitle {
                margin-top: 2px;
                font-size: 10.5px;
                color: var(--ph-ui-muted);
                font-weight: 500;
            }
            .ph-menu-actions,
            .ph-dialog-head-actions,
            .ph-dialog-buttons {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ph-icon-btn {
                width: 28px;
                height: 28px;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--ph-ui-border);
                border-radius: 8px;
                color: var(--ph-ui-muted);
                background: var(--ph-ui-soft);
                cursor: pointer;
                transition: background 140ms ease, color 140ms ease, border-color 140ms ease, transform 140ms ease;
            }
            .ph-icon-btn:hover,
            .ph-icon-btn:focus-visible {
                color: var(--ph-ui-accent-ink);
                background: color-mix(in srgb, var(--ph-ui-accent) 14%, transparent);
                border-color: color-mix(in srgb, var(--ph-ui-accent) 38%, transparent);
                outline: none;
            }
            .ph-icon-btn:active {
                transform: scale(0.96);
            }
            .ph-accordion {
                max-height: calc(min(68vh, 620px) - 96px);
                padding: 6px;
                overflow-y: auto;
                overscroll-behavior: contain;
                scrollbar-width: thin;
            }
            .ph-acc-group {
                position: relative;
                overflow: hidden;
                border: 1px solid var(--ph-menu-border);
                border-radius: 9px;
                background: var(--ph-menu-soft);
                transition: border-color 140ms ease;
            }
            .ph-acc-group + .ph-acc-group {
                margin-top: 6px;
            }
            .ph-acc-group:has(.ph-acc-header[aria-expanded="true"]) {
                border-color: color-mix(in srgb, var(--ph-menu-accent) 34%, var(--ph-menu-border));
            }
            .ph-acc-group:has(.ph-acc-header[aria-expanded="true"])::before {
                content: '';
                position: absolute;
                z-index: 2;
                top: 0;
                bottom: 0;
                left: 0;
                width: 11px;
                box-sizing: border-box;
                box-shadow: inset 3px 0 0 var(--ph-menu-accent);
                border-right: 0;
                border-radius: 8px 0 0 8px;
                pointer-events: none;
            }
            .ph-acc-header {
                width: 100%;
                border: 0;
                padding: 7px 9px;
                font: inherit;
                font-size: 10.5px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: var(--ph-menu-muted);
                background: color-mix(in srgb, var(--ph-menu-bg) 72%, transparent);
                border-radius: 0;
                transition: background 140ms ease, color 140ms ease;
            }
            .ph-acc-header:hover,
            .ph-acc-header:focus-visible {
                color: var(--ph-menu-fg);
                background: var(--ph-menu-hover);
                outline: none;
            }
            .ph-acc-header[aria-expanded="true"] {
                color: var(--ph-menu-fg);
                background: color-mix(in srgb, var(--ph-ui-accent) 11%, var(--ph-menu-bg));
            }
            .ph-acc-arrow {
                width: 18px;
                height: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: var(--ph-menu-hover);
                font-size: 9px;
                transition: transform 180ms ease, background 140ms ease;
            }
            .ph-acc-header[aria-expanded="true"] .ph-acc-arrow {
                color: var(--ph-menu-accent-text);
                background: color-mix(in srgb, var(--ph-menu-accent) 16%, transparent);
                transform: rotate(180deg);
            }
            .ph-acc-body {
                max-height: 0;
                overflow: hidden;
                border-top: 0 solid transparent;
                transition: max-height 230ms cubic-bezier(0.4, 0, 0.2, 1);
            }
            .ph-acc-body.open {
                border-top-width: 1px;
                border-top-color: var(--ph-menu-border);
            }
            .ph-setting-list {
                padding: 3px 5px 5px;
            }
            .ph-setting-row.dropdown-item {
                width: 100%;
                min-height: 34px;
                margin: 1px 0;
                padding: 5px 7px 5px 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                border: 0;
                border-radius: 7px;
                color: var(--ph-menu-fg) !important;
                background: transparent !important;
                white-space: normal;
                text-align: left;
                box-shadow: none !important;
                transition: background 120ms ease;
            }
            .ph-setting-row.dropdown-item:hover,
            .ph-setting-row.dropdown-item:focus-visible {
                background: var(--ph-menu-hover) !important;
                outline: none;
            }
            .ph-setting-copy {
                min-width: 0;
                display: flex;
                align-items: center;
            }
            .ph-setting-label {
                min-width: 0;
                font-size: 12.5px;
                font-weight: 500;
                line-height: 1.18;
            }
            .ph-toggle-state {
                position: relative;
                width: 30px;
                height: 18px;
                flex: 0 0 30px;
                display: inline-flex;
                align-items: center;
                padding: 2px;
                border-radius: 999px;
                background: color-mix(in srgb, var(--ph-menu-muted) 28%, transparent);
                transition: background 160ms ease, box-shadow 160ms ease;
            }
            .ph-switch-knob {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
                transform: translateX(0);
                transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
            }
            .ph-setting-row[data-active="true"] .ph-toggle-state {
                background: var(--ph-menu-accent);
                box-shadow: 0 0 0 2px var(--ph-menu-accent-soft);
            }
            .ph-setting-row[data-active="true"] .ph-switch-knob {
                transform: translateX(12px);
            }
            .ph-menu-footer {
                min-height: 44px;
                padding: 7px 9px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                border-top: 1px solid var(--ph-menu-border);
                background: color-mix(in srgb, var(--ph-menu-bg) 95%, var(--ph-menu-fg));
            }
            .ph-menu-dirty {
                min-width: 0;
                font-size: 10.5px;
                color: var(--ph-menu-muted);
                transition: color 140ms ease;
            }
            .ph-menu-dirty.is-dirty {
                color: var(--ph-menu-accent-text);
                font-weight: 600;
            }
            .ph-apply-btn,
            .ph-dialog-buttons .btn {
                flex: 0 0 auto;
                min-width: 78px;
                min-height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                border-radius: 7px;
            }
            .ph-apply-btn:disabled {
                cursor: default;
                opacity: 0.45;
            }

            /* Közös Power Tools popup-megjelenés. */
            .ph-pt-modal {
                position: fixed;
                inset: 0;
                z-index: 10050;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 14px;
                background: rgba(0, 0, 0, 0.48);
                backdrop-filter: blur(3px);
            }
            .ph-pt-dialog {
                width: min(520px, calc(100vw - 28px));
                max-height: min(86dvh, 760px);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                color: var(--ph-ui-fg);
                background: var(--ph-ui-bg) !important;
                border: 1px solid var(--ph-ui-border) !important;
                border-radius: 14px !important;
                box-shadow: var(--ph-ui-shadow) !important;
            }
            .ph-pt-dialog-wide {
                width: min(590px, calc(100vw - 28px));
            }
            .ph-dialog-head {
                min-height: 50px;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                border-bottom: 1px solid var(--ph-ui-border);
            }
            .ph-dialog-body {
                min-height: 0;
                padding: 12px;
                overflow: auto;
            }
            .ph-dialog-footer {
                min-height: 46px;
                padding: 8px 10px;
                display: flex;
                align-items: center;
                gap: 9px;
                border-top: 1px solid var(--ph-ui-border);
                background: color-mix(in srgb, var(--ph-ui-bg) 95%, var(--ph-ui-fg));
            }
            .ph-dialog-note,
            .ph-dialog-status {
                font-size: 10.5px;
                color: var(--ph-ui-muted);
            }
            .ph-dialog-status {
                color: var(--ph-ui-accent-ink);
                font-weight: 600;
            }
            .ph-dialog-note {
                margin-left: auto;
            }
            .ph-dialog-buttons {
                flex: 0 0 auto;
            }
            .ph-pt-dialog .btn {
                border-radius: 7px;
            }
            .ph-power-menu .btn-primary,
            .ph-pt-dialog .btn-primary {
                color: var(--ph-ui-accent-fg) !important;
                background: var(--ph-ui-accent) !important;
                border-color: var(--ph-ui-accent) !important;
            }
            .ph-secondary-btn {
                color: var(--ph-ui-fg) !important;
                background: var(--ph-ui-soft) !important;
                border-color: var(--ph-ui-border) !important;
            }
            .ph-secondary-btn:hover,
            .ph-secondary-btn:focus-visible {
                color: var(--ph-ui-accent-ink) !important;
                background: color-mix(in srgb, var(--ph-ui-accent) 12%, transparent) !important;
                border-color: color-mix(in srgb, var(--ph-ui-accent) 34%, transparent) !important;
            }
            .ph-sync-state {
                height: 26px;
                padding: 0 8px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: 1px solid var(--ph-ui-border);
                border-radius: 999px;
                color: var(--ph-ui-muted);
                background: var(--ph-ui-soft);
                font-size: 10.5px;
                font-weight: 600;
            }
            #ph-sync-status-icon {
                width: 8px;
                height: 8px;
                display: inline-block;
                border-radius: 999px;
                box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 10%, transparent);
            }
            .ph-field-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .ph-field {
                min-width: 0;
                margin: 0;
            }
            .ph-field-label {
                min-height: 18px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
                color: var(--ph-ui-muted);
                font-size: 10.5px;
                font-weight: 700;
                letter-spacing: 0.02em;
            }
            .ph-field-help {
                color: var(--ph-ui-accent-ink) !important;
                font-size: 10px;
                font-weight: 600;
                text-decoration: none !important;
            }
            .ph-field-input.form-control {
                height: 33px;
                padding: 5px 8px;
                color: var(--ph-ui-fg);
                background: var(--ph-ui-soft);
                border: 1px solid var(--ph-ui-border);
                border-radius: 7px;
                box-shadow: none;
            }
            .ph-field-input.form-control:focus {
                border-color: var(--ph-ui-accent-ink);
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--ph-ui-accent) 16%, transparent);
            }
            .ph-color-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .ph-color-card {
                overflow: hidden;
                border-radius: 10px;
                border: 1px solid rgba(0,0,0,0.12);
            }
            .ph-color-card[data-preview-theme="light"] {
                color: #212529;
                background: #fff;
                border-color: rgba(0,0,0,0.12);
            }
            .ph-color-card[data-preview-theme="dark"] {
                color: #f1f1f1;
                background: #2b2b2b;
                border-color: rgba(255,255,255,0.14);
            }
            .ph-color-card-title {
                padding: 8px 9px;
                display: flex;
                align-items: center;
                gap: 6px;
                border-bottom: 1px solid currentColor;
                border-bottom-color: color-mix(in srgb, currentColor 13%, transparent);
                font-size: 11.5px;
                font-weight: 700;
            }
            .ph-color-rows {
                padding: 5px 7px;
            }
            .ph-color-row {
                min-height: 32px;
                margin: 0;
                padding: 3px 2px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                font-size: 11.5px;
            }
            .ph-color-row + .ph-color-row {
                border-top: 1px solid color-mix(in srgb, currentColor 8%, transparent);
            }
            .ph-color-input {
                width: 38px;
                height: 24px;
                padding: 0;
                border: 0;
                border-radius: 6px;
                background: transparent;
                cursor: pointer;
            }

            /* Beállítások importálása / exportálása. */
            .ph-backup-body {
                display: grid;
                gap: 10px;
            }
            .ph-backup-section {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 9px;
                padding: 12px;
                border: 1px solid var(--ph-ui-border);
                border-radius: 10px;
                background: var(--ph-ui-soft);
            }
            .ph-backup-heading {
                display: flex;
                align-items: center;
                gap: 7px;
                font-size: 12px;
                color: var(--ph-ui-fg);
            }
            .ph-backup-heading .fas {
                color: var(--ph-ui-accent-ink);
            }
            .ph-backup-section p {
                margin: 0;
                font-size: 11.5px;
                line-height: 1.45;
                color: var(--ph-ui-muted);
            }
            /* Látható, billentyűzettel is vezérelhető BE/KI kapcsolók. */
            .ph-backup-option {
                width: 100%;
                min-height: 43px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin: 0;
                padding: 8px 10px;
                border: 1px solid var(--ph-ui-border);
                border-radius: 9px;
                background: var(--ph-ui-bg);
                color: var(--ph-ui-fg);
                cursor: pointer;
                box-sizing: border-box;
            }
            .ph-backup-option[data-enabled="true"] {
                border-color: color-mix(in srgb, var(--ph-ui-accent) 65%, var(--ph-ui-border));
                background: color-mix(in srgb, var(--ph-ui-accent) 8%, var(--ph-ui-bg));
            }
            .ph-backup-option-copy {
                flex: 1 1 auto;
                font-size: 11.5px;
                font-weight: 600;
                line-height: 1.35;
            }
            .ph-backup-option-control {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                flex: 0 0 auto;
            }
            .ph-backup-toggle {
                position: absolute !important;
                inset: 0;
                opacity: 0 !important;
                width: 100%;
                height: 100%;
                margin: 0 !important;
                cursor: pointer;
                z-index: 1;
            }
            .ph-backup-switch {
                width: 34px;
                height: 20px;
                display: inline-flex;
                align-items: center;
                padding: 3px;
                border-radius: 999px;
                box-sizing: border-box;
                background: color-mix(in srgb, var(--ph-ui-muted) 55%, var(--ph-ui-bg));
                transition: background 160ms ease;
                pointer-events: none;
            }
            .ph-backup-switch-knob {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.24);
                transform: translateX(0);
                transition: transform 160ms ease;
            }
            .ph-backup-toggle:checked + .ph-backup-switch {
                background: var(--ph-ui-accent);
            }
            .ph-backup-toggle:checked + .ph-backup-switch .ph-backup-switch-knob {
                transform: translateX(14px);
            }
            .ph-backup-toggle:focus-visible + .ph-backup-switch {
                outline: 2px solid var(--ph-ui-accent-ink);
                outline-offset: 3px;
            }
            .ph-backup-option-state {
                min-width: 22px;
                font-size: 11px;
                font-weight: 800;
                text-align: center;
                color: var(--ph-ui-muted);
                letter-spacing: .03em;
            }
            .ph-backup-option[data-enabled="true"] .ph-backup-option-state {
                color: var(--ph-ui-accent-ink);
            }
            .ph-backup-option:has(.ph-backup-toggle:disabled) {
                opacity: .55;
                cursor: default;
            }
            .ph-backup-sensitive-warning {
                display: flex;
                align-items: flex-start;
                gap: 7px;
                padding: 9px 10px;
                border: 1px solid color-mix(in srgb, #c9811b 45%, var(--ph-ui-border));
                border-radius: 9px;
                background: color-mix(in srgb, #c9811b 9%, var(--ph-ui-bg));
                color: var(--ph-ui-fg);
                font-size: 11px;
                line-height: 1.45;
            }
            .ph-backup-sensitive-warning[hidden] {
                display: none !important;
            }
            .ph-backup-sensitive-warning .fas {
                flex: 0 0 auto;
                color: var(--ph-ui-warning);
                margin-top: 2px;
            }
            .ph-backup-sensitive-copy {
                flex: 1 1 auto;
                min-width: 0;
                overflow-wrap: break-word;
            }
            .ph-backup-section .btn {
                min-height: 30px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .ph-backup-hint {
                display: flex;
                align-items: flex-start;
                gap: 7px;
                font-size: 10.5px;
                line-height: 1.4;
                color: var(--ph-ui-muted);
            }
            .ph-backup-hint .fas {
                margin-top: 2px;
            }
            .ph-backup-status {
                flex: 1 1 auto;
                min-width: 0;
                overflow-wrap: anywhere;
            }

            /* Rejtett felhasználók szerkesztő. */
            .ph-editor-overlay {
                display: flex;
            }
            .ph-editor-panel {
                width: min(620px, calc(100vw - 28px));
            }
            .dual-list-container {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 38px minmax(0, 1fr);
                align-items: stretch;
                gap: 8px;
            }
            .dual-list-column {
                min-width: 0;
            }
            .dual-list-label {
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 22px;
                margin-bottom: 5px;
                color: var(--ph-ui-muted);
                font-size: 10.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            .dual-list {
                min-height: 170px;
                max-height: 300px;
                padding: 5px;
                overflow-y: auto;
                border: 1px solid var(--ph-ui-border);
                border-radius: 9px;
                background: var(--ph-ui-soft);
                scrollbar-width: thin;
            }
            .dual-list:empty::after {
                content: 'Nincs elem';
                display: block;
                padding: 14px 8px;
                color: var(--ph-ui-muted);
                font-size: 11px;
                text-align: center;
            }
            .dual-list-item {
                padding: 6px 7px;
                cursor: pointer;
                border: 1px solid transparent;
                border-radius: 6px;
                color: var(--ph-ui-fg);
                background: var(--ph-ui-bg);
                font-size: 12px;
                line-height: 1.2;
                transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
            }
            .dual-list-item + .dual-list-item {
                margin-top: 3px;
            }
            .dual-list-item:hover {
                border-color: color-mix(in srgb, var(--ph-ui-accent) 28%, transparent);
                background: color-mix(in srgb, var(--ph-ui-accent) 8%, var(--ph-ui-bg));
            }
            .dual-list-item.selected {
                color: var(--ph-ui-accent-fg);
                background: var(--ph-ui-accent);
                border-color: var(--ph-ui-accent);
            }
            .dual-list-buttons {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 6px;
            }
            .ph-dual-move {
                width: 34px;
                height: 34px;
            }
            .ph-dual-mobile {
                display: none;
            }
            .ph-hidden-summary {
                margin-left: 0;
                margin-right: auto;
            }
            .ph-empty-state {
                padding: 18px 10px;
                color: var(--ph-ui-muted);
                background: var(--ph-ui-soft);
                border: 1px dashed var(--ph-ui-border);
                border-radius: 9px;
                font-size: 11.5px;
                text-align: center;
            }
            .editor-buttons {
                margin-left: auto;
            }

            .ph-tooltip {
                white-space: pre-line;
                hyphens: auto;
                overflow-wrap: break-word;
                position: fixed;
                background: rgba(18, 20, 23, 0.94);
                color: white;
                padding: 7px 9px;
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 7px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.24);
                font-size: 12px;
                line-height: 1.35;
                z-index: 10060;
                display: none;
                pointer-events: none;
                max-width: min(320px, calc(100vw - 24px));
            }
            .ph-tooltip-icon {
                margin-left: 5px;
                color: var(--ph-menu-muted);
                cursor: help;
                font-size: 11px;
            }

            @media (max-width: 991.98px) {
                .ph-power-btn + .dropdown-menu {
                    display: none !important;
                    position: absolute !important;
                    left: 0 !important;
                }
                .ph-power-btn + .dropdown-menu.show {
                    display: block !important;
                }
                ul.navbar-nav.navbar-buttons {
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                ul.navbar-nav.navbar-buttons::-webkit-scrollbar {
                    display: none;
                }
                #ph-power-tools-dropdown .dropdown-menu.ph-power-menu {
                    position: fixed !important;
                    width: auto !important;
                    min-width: 0 !important;
                    left: 8px !important;
                    right: 8px !important;
                    top: 44px !important;
                    max-height: calc(100dvh - 56px) !important;
                    z-index: 2000 !important;
                }
                .ph-pt-modal { z-index: 100050 !important; }
                .ph-tooltip { z-index: 100060 !important; }
                #header-sticky:has(#ph-power-tools-dropdown .ph-power-menu.show) {
                    z-index: 100030 !important;
                    overflow: visible !important;
                }
                #header-sticky:has(#ph-power-tools-dropdown .ph-power-menu.show) .navbar-buttons {
                    overflow: visible !important;
                }
                #header-sticky #ph-power-tools-dropdown:has(> .ph-power-menu.show) {
                    position: relative !important;
                    z-index: 100031 !important;
                }
                .ph-accordion {
                    max-height: calc(100dvh - 150px);
                }
                .ph-setting-row.dropdown-item {
                    min-height: 40px;
                    padding: 8px;
                }
            }
            @media (max-width: 575.98px) {
                .ph-pt-modal {
                    width: 100vw;
                    height: 100dvh;
                    padding: 8px;
                    box-sizing: border-box;
                    align-items: center;
                    justify-content: center;
                }
                .ph-pt-dialog,
                .ph-pt-dialog-wide,
                .ph-editor-panel {
                    width: 100%;
                    max-height: calc(100dvh - 16px);
                    border-radius: 14px !important;
                }
                .ph-field-grid {
                    grid-template-columns: 1fr;
                }
                .ph-color-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 6px;
                }
                .ph-colors-dialog .ph-dialog-body,
                .ph-editor-panel .ph-dialog-body {
                    padding: 8px;
                }
                .ph-color-card-title {
                    padding: 6px;
                    gap: 4px;
                    font-size: 10.5px;
                }
                .ph-color-rows {
                    padding: 4px;
                }
                .ph-color-row {
                    min-height: 30px;
                    padding: 2px 0;
                    gap: 4px;
                    font-size: 10.5px;
                }
                .ph-color-row > span {
                    min-width: 0;
                    overflow-wrap: anywhere;
                }
                .ph-color-input {
                    width: 32px;
                    height: 22px;
                    flex: 0 0 32px;
                }
                .ph-dialog-footer {
                    flex-wrap: nowrap;
                    gap: 6px;
                }
                .ph-dialog-note {
                    flex: 1 1 auto;
                    min-width: 0;
                    width: auto;
                    margin-left: 0;
                    margin-right: auto;
                    font-size: 10px;
                    line-height: 1.2;
                }
                .ph-dialog-status:empty {
                    display: none;
                }
                .ph-dialog-buttons {
                    flex: 0 0 auto;
                    margin-left: 0;
                    gap: 4px;
                }
                .ph-dialog-footer .btn {
                    min-width: 78px;
                    min-height: 30px;
                }
                .dual-list-container {
                    grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr);
                    gap: 5px;
                }
                .dual-list-buttons {
                    flex-direction: column;
                    gap: 5px;
                }
                .ph-dual-desktop {
                    display: inline-block;
                }
                .ph-dual-mobile {
                    display: none;
                }
                .ph-dual-move {
                    width: 30px;
                    height: 30px;
                }
                .dual-list-label {
                    min-height: 28px;
                    align-items: flex-end;
                    margin-bottom: 4px;
                    font-size: 9.5px;
                    line-height: 1.15;
                    letter-spacing: 0;
                    text-transform: none;
                }
                .dual-list {
                    min-height: 150px;
                    max-height: 240px;
                    padding: 4px;
                }
                .dual-list-item {
                    padding: 5px 4px;
                    font-size: 11px;
                    overflow-wrap: anywhere;
                }
            }
            @media (min-width: 520px) and (max-width: 991.98px) {
                #ph-power-tools-dropdown .dropdown-menu.ph-power-menu {
                    width: 306px !important;
                    left: auto !important;
                    right: 8px !important;
                }
            }
            @media (prefers-reduced-motion: reduce) {
                .ph-acc-body,
                .ph-acc-arrow,
                .ph-switch-knob,
                .ph-toggle-state,
                .ph-setting-row.dropdown-item,
                .ph-icon-btn,
                .dual-list-item {
                    transition: none !important;
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
        const isNyeremenyjatek = isOnPage("nyeremenyjatek");

        const hasThreadLists = !!document.querySelector(
            '.user-thread-list-lms, .user-thread-list-fav'
        );

        if (!isTema && !isPrivat && !isNyeremenyjatek && !hasThreadLists) return;

        const modules = [
            { name: "messageScroller", when: () => isTema, fn: messageScroller },
            { name: "colorize", when: () => isTema && savedSettings.colorize, fn: colorize },
            { name: "messageChainPopup", when: () => isTema && savedSettings.messageChainPopup, fn: messageChainPopup },
            { name: "markNewPosts", when: () => isTema && savedSettings.markNewPosts, fn: markNewPosts },
            { name: "linkRedirect", when: () => isTema && savedSettings.linkRedirect, fn: linkRedirect },
            { name: "msgAnchorHighlight", when: () => isTema && savedSettings.msgAnchorHighlight, fn: msgAnchorHighlight },
            { name: "offHider", when: () => isTema && savedSettings.offHider, fn: offHider },
            { name: "wideView", when: () => isTema && savedSettings.wideView, fn: wideView },
            { name: "threadView", when: () => isTema && savedSettings.threadView, fn: threadView },
            { name: "modernView", when: () => isTema && savedSettings.modernView, fn: modernView },
            { name: "keyboardNavigation", when: () => isTema && savedSettings.keyboardNavigation, fn: keyboardNavigation },
            { name: "hideUsers", when: () => isTema && savedSettings.hideUsers, fn: hideUsers },
            { name: "extraSmilies", when: () => (isTema || isPrivat) && savedSettings.extraSmilies, fn: extraSmilies },
            { name: "kekShUploader", when: () => (isTema || isPrivat) && savedSettings.kekShUploader, fn: kekShUploader },
            { name: "giveawayAnswerChecker", when: () => isNyeremenyjatek && savedSettings.giveawayAnswerChecker, fn: giveawayAnswerChecker },
            { name: "stickySidebar", when: () => savedSettings.stickySidebar, fn: stickySidebar },
            { name: "mobileScrollNav", when: () => isTema && savedSettings.mobileScrollNav, fn: mobileScrollNav },
            { name: "sortThreadListsByNewPosts", when: () => hasThreadLists && savedSettings.sortThreadListsByNewPosts, fn: sortThreadListsByNewPosts },
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

        function paletteToCssVars(pal, theme) {
            const p = pal?.[theme] || DEFAULT_COLORIZE_PALETTE[theme];
            return `
                --ph-pt-own: ${p.own};
                --ph-pt-reply: ${p.reply};
                --ph-pt-akcio: ${p.akcio};
                --ph-pt-focus-author: ${p.focusAuthor};
                --ph-pt-focus-reply: ${p.focusReply};
                --ph-pt-hash-highlight: ${p.hashHighlight};
            `;
        }

        function injectColorizeCssOnce() {
            const pal = savedSettings.colorizePalette || DEFAULT_COLORIZE_PALETTE;

            injectStyleOnce("ph-pt-colorize-style", `
                body[data-theme="light"] { ${paletteToCssVars(pal, "light")} }
                body[data-theme="dark"]  { ${paletteToCssVars(pal, "dark")} }
            
                .message .message-body.ph-pt-colorize { transition: all 0.2s ease; } 
                .message .message-body.ph-pt-akcio        { background-color: var(--ph-pt-akcio) !important; }
                .message-content-replied .message-content.ph-pt-akcio { background-color: var(--ph-pt-akcio) !important; }
                .message .message-body.ph-pt-own          { background-color: var(--ph-pt-own) !important; }
                .message .message-body.ph-pt-reply        { background-color: var(--ph-pt-reply) !important; }
                .message .message-body.ph-pt-focus-author { background-color: var(--ph-pt-focus-author) !important; }
                .message .message-body.ph-pt-focus-reply  { background-color: var(--ph-pt-focus-reply) !important; }
            
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
            return msg.querySelector(".message-head-user .user-title .user-link")?.textContent?.trim() || "";
        }

        function getRepliedTo(msg) {
            return msg.querySelector(".message-head-infos .message-reply .user-title .user-link")?.textContent?.trim() || "";
        }

        /**********************
         * FŐ SZÍNEZÉS
         **********************/
        function recolorAll() {
            document.querySelectorAll(".message").forEach(msg => {
                const body = msg.querySelector(".message-body");
                if (!body) return;

                // base class
                body.classList.add("ph-pt-colorize");

                // reset state classes
                body.classList.remove(
                    "ph-pt-akcio",
                    "ph-pt-own",
                    "ph-pt-reply",
                    "ph-pt-focus-author",
                    "ph-pt-focus-reply"
                );

                const bodyClone = body.cloneNode(true);
                bodyClone.querySelector('.message-content-replied')?.remove();
                const text = lower(bodyClone.textContent);
                const author = getAuthor(msg);
                const replied = getRepliedTo(msg);

                // 1) #akció
                if (AKCIO_KEYWORDS.some(k => text.includes(k))) {
                    body.classList.add("ph-pt-akcio");
                }

                // 1b) #akció az idézett (collapsed) blokkban – ha az idézet maga akciós
                const repliedContent = body.querySelector('.message-content-replied');
                if (repliedContent) {
                    const repliedInner = repliedContent.querySelector('.message-content') ?? repliedContent;
                    const repliedText = lower(repliedContent.textContent);
                    if (AKCIO_KEYWORDS.some(k => repliedText.includes(k))) {
                        repliedInner.classList.add("ph-pt-akcio");
                    } else {
                        repliedInner.classList.remove("ph-pt-akcio");
                    }
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

                // 3) Saját / válasz
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

            const msg = e.target.closest(".message");
            if (!msg) return;

            const author = getAuthor(msg);
            if (!author) return;

            selectedUser = (selectedUser === author) ? null : author;
            recolorAll();
        }

        function attachAvatarHandlers() {
            const selectors = [
                ".message-head-user .user-face",
                ".message-body-user .user-face"
            ];

            document.querySelectorAll(selectors.join(", ")).forEach(img => {
                img.style.cursor = "pointer";
                img.removeEventListener("click", onAvatarClick);
                img.addEventListener("click", onAvatarClick);
            });
        }

        /**********************
         * INIT
         **********************/
        function init() {
            attachAvatarHandlers();
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

    // A Lánc funkció a beállított színezéstől független beszélgetés-előnézet.
    // Eloszor a betoltott hozzaszolasokat mutatja; a hianyzo elozmenyeket es
    // kesobbi valaszokat igeny szerint mas temaoldalakrol is hozza tudja adni.
    // Csak a kivalasztott hozzaszolas sajat agait jeleniti meg (testveragat nem).
    function messageChainPopup() {
        const STYLE_ID = 'ph-pt-chain-popup-style';
        const MODAL_ID = 'ph-pt-chain-modal';
        const qs = (root, selector) => root?.querySelector(selector) || null;
        let lastTrigger = null;
        let previousOverflow = '';
        let previousFocus = null;
        let connectorObserver = null;
        let connectorFrame = null;
        let chainSession = null;
        // A forum URL-je szabadon kerheto 200-as, 1-tol indulva illesztett
        // hsz-tartomanyt tamogat (pl. #89605 -> hsz_89601-89800.html).
        // Egy kattintasra legfeljebb nehany ilyen oldalt vizsgalunk at.
        const CHAIN_PAGE_SIZE = 200;
        const MAX_REPLY_PAGES_PER_CLICK = 3;
        const MAX_ANCESTOR_PAGES_PER_CLICK = 3;
        // A korabbi session.pageCache csak a popup egyetlen megnyitasara elt.
        // Az egyazon bongeszo-oldalon megnyitott Lánc popupok kozott is megosztjuk
        // a mar letoltott 200-as oldalakat. A cache csak memoriaban letezik:
        // lapfrissiteskor torlodik; lejar es LRU alapon korlatozott meretu.
        const CHAIN_CACHE_TTL_MS = 10 * 60 * 1000;
        const CHAIN_CACHE_MAX_PAGES = 10;
        const chainPageCache = new Map();

        injectStyleOnce(STYLE_ID, `
            #${MODAL_ID}.ph-pt-modal {
                z-index: 100100 !important;
            }
            #${MODAL_ID} .ph-pt-chain-dialog {
                width: min(800px, calc(100vw - 28px));
                max-height: min(88dvh, 900px);
                min-height: 0;
            }
            #${MODAL_ID} .ph-pt-chain-subtitle {
                display: block;
                margin-top: 3px;
                color: var(--ph-ui-muted);
                font-size: 11px;
                line-height: 1.35;
            }
            #${MODAL_ID} .ph-pt-chain-list {
                display: block;
                min-height: 0;
                overflow: auto;
                overscroll-behavior: contain;
                scrollbar-width: thin;
                padding: 12px;
            }
            /* A vonalak a gorgetheto tartalommal egyutt mozognak, nem a popupra
               vannak rogzitve. A kartyak elott, sajat bal oldali savban futnak. */
            #${MODAL_ID} .ph-pt-chain-tree {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-left: 23px;
                min-width: 0;
                box-sizing: border-box;
                isolation: isolate;
            }
            #${MODAL_ID} .ph-pt-chain-connectors {
                position: absolute;
                inset: 0;
                display: block;
                width: 100%;
                height: 100%;
                overflow: visible;
                pointer-events: none;
                z-index: 0;
            }
            #${MODAL_ID} .ph-pt-chain-edge {
                fill: none;
                stroke: color-mix(in srgb, var(--ph-ui-muted) 62%, var(--ph-ui-bg));
                stroke-width: 2.2px;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            #${MODAL_ID} .ph-pt-chain-edge[data-focus="true"] {
                stroke: var(--ph-ui-accent-ink, #477baa);
            }
            #${MODAL_ID} .ph-pt-chain-node {
                fill: var(--ph-ui-bg);
                stroke: color-mix(in srgb, var(--ph-ui-muted) 62%, var(--ph-ui-bg));
                stroke-width: 2px;
            }
            #${MODAL_ID} .ph-pt-chain-node[data-current="true"] {
                fill: var(--ph-ui-accent);
                stroke: var(--ph-ui-bg);
                stroke-width: 2.5px;
            }
            #${MODAL_ID} .ph-pt-chain-item {
                position: relative;
                z-index: 1;
                min-width: 0;
                flex: 0 0 auto;
                box-sizing: border-box;
                margin: 0 0 0 min(var(--ph-pt-chain-indent, 0px), 112px);
                border: 1px solid var(--ph-ui-border);
                border-left: 3px solid color-mix(in srgb, var(--ph-ui-muted) 45%, transparent);
                border-radius: 10px;
                background: var(--ph-ui-bg);
                overflow: hidden;
            }
            #${MODAL_ID} .ph-pt-chain-item[data-selected="true"] {
                border-color: var(--ph-ui-accent);
                border-left: 4px solid var(--ph-ui-accent);
                background: color-mix(in srgb, var(--ph-ui-accent) 7%, var(--ph-ui-bg));
            }
            #${MODAL_ID} .ph-pt-chain-item-head {
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 10px 11px;
                border-bottom: 1px solid var(--ph-ui-border);
            }
            #${MODAL_ID} .ph-pt-chain-avatar {
                display: flex;
                flex: 0 0 34px;
                width: 34px;
                height: 34px;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                border-radius: 50%;
                background: var(--ph-ui-soft);
            }
            #${MODAL_ID} .ph-pt-chain-avatar img {
                display: block;
                max-width: 100%;
                max-height: 100%;
                object-fit: cover;
            }
            #${MODAL_ID} .ph-pt-chain-author {
                flex: 1 1 auto;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
                color: var(--ph-ui-fg);
                font-size: 13px;
                line-height: 1.25;
            }
            #${MODAL_ID} .ph-pt-chain-author strong {
                overflow-wrap: anywhere;
            }
            #${MODAL_ID} .ph-pt-chain-author small {
                color: var(--ph-ui-muted);
                font-size: 11px;
            }
            #${MODAL_ID} .ph-pt-chain-meta {
                flex: 0 1 auto;
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
                line-height: 1.2;
            }
            #${MODAL_ID} .ph-pt-chain-post-link {
                color: var(--ph-ui-accent-ink) !important;
                font-size: 12px;
                font-weight: 700;
                text-decoration: none;
            }
            #${MODAL_ID} .ph-pt-chain-post-link:hover {
                text-decoration: underline;
            }
            #${MODAL_ID} .ph-pt-chain-time {
                color: var(--ph-ui-muted);
                font-size: 10.5px;
                text-align: right;
                overflow-wrap: anywhere;
            }
            #${MODAL_ID} .ph-pt-chain-label {
                align-self: flex-start;
                margin: 7px 11px 0;
                padding: 2px 7px;
                border-radius: 5px;
                background: var(--ph-ui-soft);
                color: var(--ph-ui-muted);
                font-size: 10.5px;
                font-weight: 650;
            }
            #${MODAL_ID} .ph-pt-chain-item[data-selected="true"] .ph-pt-chain-label {
                background: color-mix(in srgb, var(--ph-ui-accent) 20%, var(--ph-ui-bg));
                color: var(--ph-ui-accent-ink);
            }
            #${MODAL_ID} .ph-pt-chain-post-content {
                min-width: 0;
                padding: 8px 11px 12px;
                color: var(--ph-ui-fg);
                font-size: 13px;
                line-height: 1.5;
                overflow-wrap: anywhere;
                word-break: normal;
            }
            /* A popup hozzaszolasszovegenek hattere pontosan az alap forumnezet
               colorize-palettaszine. A fejlec es a szegely ennek a szinnek a
               visszafogott/kontrasztos valtozata, a korabbi kartyas dizajnnal.
               A szinprioritas megegyezik az eredeti colorize szabalyaval. */
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content.ph-pt-akcio) {
                --ph-pt-card-mark: var(--ph-pt-akcio);
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content.ph-pt-own) {
                --ph-pt-card-mark: var(--ph-pt-own);
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content.ph-pt-reply) {
                --ph-pt-card-mark: var(--ph-pt-reply);
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content.ph-pt-focus-author) {
                --ph-pt-card-mark: var(--ph-pt-focus-author);
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content.ph-pt-focus-reply) {
                --ph-pt-card-mark: var(--ph-pt-focus-reply);
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            )) {
                --ph-pt-card-edge: color-mix(in srgb, var(--ph-pt-card-mark) 75%, var(--ph-ui-fg));
                border-color: color-mix(in srgb, var(--ph-pt-card-edge) 82%, var(--ph-ui-border));
                border-left: 4px solid var(--ph-pt-card-edge);
                background: var(--ph-pt-card-mark);
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            )) > .ph-pt-chain-item-head {
                background: color-mix(in srgb, var(--ph-pt-card-mark) 62%, var(--ph-ui-bg));
            }
            #${MODAL_ID} .ph-pt-chain-item:has(> .ph-pt-chain-post-content:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            )) > .ph-pt-chain-post-content {
                /* Ugyanaz a teljes, keveretlen szin, mint a klasszikus message-body-n. */
                background-color: var(--ph-pt-card-mark) !important;
            }
            /* A kivalasztott kartyat tovabbra is az eredeti kek akcentus jeloli,
               a sajat/valasz/akcio/fokusz kartyaszin ettol meg ervenyesul. */
            #${MODAL_ID} .ph-pt-chain-item[data-selected="true"]:has(> .ph-pt-chain-post-content:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            )) {
                border-color: var(--ph-ui-accent);
                border-left-color: var(--ph-ui-accent);
            }
            #${MODAL_ID} .ph-pt-chain-post-content > :first-child { margin-top: 0 !important; }
            #${MODAL_ID} .ph-pt-chain-post-content > :last-child { margin-bottom: 0 !important; }
            #${MODAL_ID} .ph-pt-chain-post-content img,
            #${MODAL_ID} .ph-pt-chain-post-content video {
                max-width: 100% !important;
                height: auto;
            }
            #${MODAL_ID} .ph-pt-chain-post-content pre,
            #${MODAL_ID} .ph-pt-chain-post-content code {
                max-width: 100%;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }
            #${MODAL_ID} .ph-pt-chain-post-content a {
                overflow-wrap: anywhere;
            }
            #${MODAL_ID} .ph-pt-chain-empty {
                padding: 10px 12px;
                border: 1px dashed var(--ph-ui-border);
                border-radius: 9px;
                color: var(--ph-ui-muted);
                font-size: 12px;
            }
            #${MODAL_ID} .ph-pt-chain-footer {
                justify-content: space-between;
            }
            #${MODAL_ID} .ph-pt-chain-more {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                padding: 11px 8px;
                border: 1px dashed var(--ph-ui-border);
                border-radius: 9px;
                background: var(--ph-ui-soft);
                text-align: center;
            }
            #${MODAL_ID} .ph-pt-chain-more + .ph-pt-chain-tree,
            #${MODAL_ID} .ph-pt-chain-tree + .ph-pt-chain-more {
                margin-top: 10px;
            }
            #${MODAL_ID} .ph-pt-chain-more-button {
                max-width: 100%;
                border: 1px solid var(--ph-ui-border);
                border-radius: 7px;
                padding: 7px 12px;
                color: var(--ph-ui-accent-ink);
                background: var(--ph-ui-bg);
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            #${MODAL_ID} .ph-pt-chain-more-button:hover:not(:disabled) {
                border-color: var(--ph-ui-accent);
                background: color-mix(in srgb, var(--ph-ui-accent) 10%, var(--ph-ui-bg));
            }
            #${MODAL_ID} .ph-pt-chain-more-button:disabled {
                cursor: wait;
                opacity: .65;
            }
            #${MODAL_ID} .ph-pt-chain-more-status {
                max-width: 100%;
                color: var(--ph-ui-muted);
                font-size: 11px;
                line-height: 1.4;
                overflow-wrap: anywhere;
            }
            #${MODAL_ID} .ph-pt-chain-hint {
                min-width: 0;
                max-width: 70%;
                color: var(--ph-ui-muted);
                font-size: 10.5px;
                line-height: 1.35;
            }
            @media (max-width: 575.98px) {
                #${MODAL_ID} .ph-pt-chain-dialog { width: 100%; max-height: calc(100dvh - 16px); }
                #${MODAL_ID} .ph-pt-chain-list { padding: 9px; }
                #${MODAL_ID} .ph-pt-chain-tree { gap: 8px; padding-left: 18px; }
                #${MODAL_ID} .ph-pt-chain-item {
                    margin-left: min(var(--ph-pt-chain-indent, 0px), 66px);
                }
                #${MODAL_ID} .ph-pt-chain-item-head { padding: 8px; gap: 7px; }
                #${MODAL_ID} .ph-pt-chain-avatar { flex-basis: 30px; width: 30px; height: 30px; }
                #${MODAL_ID} .ph-pt-chain-post-content { padding: 8px; font-size: 12.5px; }
                #${MODAL_ID} .ph-pt-chain-hint { font-size: 10px; }
            }
        `);

        function ensureModal() {
            let modal = document.getElementById(MODAL_ID);
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = MODAL_ID;
            modal.className = 'ph-pt-modal';
            modal.innerHTML = `
                <section class="ph-pt-dialog ph-pt-chain-dialog" role="dialog" aria-modal="true"
                         aria-labelledby="ph-pt-chain-title" aria-describedby="ph-pt-chain-count">
                    <header class="ph-dialog-head">
                        <div class="ph-dialog-title-wrap">
                            <span class="ph-dialog-mark" aria-hidden="true"><span class="fas fa-link"></span></span>
                            <span>
                                <strong class="ph-dialog-title" id="ph-pt-chain-title">Hozzászólás-lánc</strong>
                                <small class="ph-pt-chain-subtitle" id="ph-pt-chain-count"></small>
                            </span>
                        </div>
                        <button type="button" class="ph-icon-btn ph-dialog-close" data-chain-close
                                title="Bezárás" aria-label="Lánc bezárása">
                            <span class="fas fa-times"></span>
                        </button>
                    </header>
                    <div class="ph-dialog-body ph-pt-chain-list" id="ph-pt-chain-list" role="list"></div>
                    <footer class="ph-dialog-footer ph-pt-chain-footer">
                        <span class="ph-pt-chain-hint" id="ph-pt-chain-hint"></span>
                        <button type="button" class="btn btn-sm btn-forum ph-secondary-btn" data-chain-close>Bezárás</button>
                    </footer>
                </section>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', event => {
                if (event.target === modal || event.target.closest('[data-chain-close]')) {
                    event.preventDefault();
                    closeModal();
                }
            });
            return modal;
        }

        // A forum sajat hozzaszolas-sorrendje (a = novekvo, d = csokkeno).
        // A megjelenitesi modulok (Modern / Thread) atrendezhetik a DOM-ot,
        // ezert a rendezest nem a hozzaszolasok aktualis DOM-sorrendjebol talaljuk ki.
        function getForumMessageDirection() {
            const menus = document.querySelectorAll(
                'ul.nav-settings li[data-rios-action-pref-mod*="mode=msg"]'
            );
            for (const menu of menus) {
                for (const option of menu.querySelectorAll('.dropdown-item.active[data-pref]')) {
                    try {
                        const direction = JSON.parse(option.dataset.pref).dir;
                        if (direction === 'a' || direction === 'd') return direction;
                    } catch { /* Egy nem sorrendet tartalmazo beallitas nem befolyasolhatja a popupot. */ }
                }
                // Tartalek: az aktiv rendezesi elem hianyzik, de a gomb kiirja az iranyt.
                const label = menu.querySelector('.dropdown-toggle b')?.textContent?.trim().toLowerCase();
                if (label?.startsWith('csökken')) return 'd';
                if (label?.startsWith('növekv')) return 'a';
            }
            return 'a';
        }

        function getChain(startLi, extraPosts = []) {
            // A letoltott oldalak DOM-ja el van valasztva az eredeti oldaltol.
            // Az eredeti hozzaszolasokat nem rakjuk vissza a forum listajaba.
            const all = Array.from(document.querySelectorAll('li[data-id]'))
                .filter(li => li.querySelector(':scope > .message'));
            const seenIds = new Set(all.map(li => li.dataset.id));
            for (const li of extraPosts) {
                if (!seenIds.has(li.dataset.id)) {
                    all.push(li);
                    seenIds.add(li.dataset.id);
                }
            }
            const byId = new Map(all.map(li => [li.dataset.id, li]));
            const children = new Map();
            for (const li of all) {
                const parentId = li.dataset.rplid;
                if (!parentId || parentId === li.dataset.id) continue;
                if (!children.has(parentId)) children.set(parentId, []);
                children.get(parentId).push(li);
            }

            const visited = new Set([startLi.dataset.id]);
            const parents = [];
            let current = startLi;
            let hasMissingParent = false;
            let missingParentId = '';
            while (current.dataset.rplid && current.dataset.rplid !== '0') {
                const parentId = current.dataset.rplid;
                const parent = byId.get(parentId);
                if (!parent) {
                    hasMissingParent = true;
                    missingParentId = parentId;
                    break;
                }
                if (visited.has(parentId)) break;
                visited.add(parentId);
                parents.unshift(parent);
                current = parent;
            }

            const items = parents.map((li, depth) => ({li, depth, role: 'parent'}));
            items.push({li: startLi, depth: parents.length, role: 'selected'});
            // Iteratív preorder bejárás, az aktuális oldalon szereplő válaszágakra.
            const childVisited = new Set(visited);
            const todo = (children.get(startLi.dataset.id) || []).map(li => ({li, depth: parents.length + 1})).reverse();
            while (todo.length) {
                const {li, depth} = todo.pop();
                if (childVisited.has(li.dataset.id)) continue;
                childVisited.add(li.dataset.id);
                items.push({li, depth, role: 'reply'});
                const next = children.get(li.dataset.id) || [];
                for (let i = next.length - 1; i >= 0; i--) {
                    todo.push({li: next[i], depth: depth + 1});
                }
            }
            // Az adott tematikus lancon belul a hozzaszolas-azonosito az ido szerinti
            // sorrend: az elozo- / valaszszerep es a behuzas ettol nem valtozik.
            const direction = getForumMessageDirection();
            const multiplier = direction === 'd' ? -1 : 1;
            items.sort((a, b) => multiplier * (Number(a.li.dataset.id) - Number(b.li.dataset.id)));
            return {items, hasMissingParent, missingParentId, direction};
        }

        // Másolat az oldalon már megjelenített tartalomból, újrahasznosított
        // DOM-azonosítók, eseményattribútumok és űrlapvezérlők nélkül.
        function cloneMessageContent(original, sourceUrl = location.href) {
            const clone = original.cloneNode(true);
            clone.removeAttribute('id');
            clone.className = 'ph-pt-chain-post-content';
            clone.querySelectorAll('script, style, iframe, object, embed, form, input, textarea, select, button, audio, video, canvas').forEach(el => el.remove());
            for (const el of [clone, ...clone.querySelectorAll('*')]) {
                for (const attr of [...el.attributes]) {
                    const name = attr.name.toLowerCase();
                    if (name === 'id' || name === 'contenteditable' || name.startsWith('on') || name.startsWith('data-')) {
                        el.removeAttribute(attr.name);
                    }
                }
                if (el.tagName === 'A') {
                    const href = el.getAttribute('href') || '';
                    if (/^(https?:\/\/|\/|#)/i.test(href)) {
                        el.setAttribute('href', new URL(href, sourceUrl).href);
                        el.target = '_blank';
                        el.rel = 'noopener noreferrer';
                    } else el.removeAttribute('href');
                }
                // A mas oldalrol letoltott tartalom relativ kephivatkozasai
                // ne az aktualis temaoldal vagy az about:blank alapjat kapjak.
                if (el.tagName === 'IMG') {
                    const src = el.getAttribute('src') || '';
                    if (/^(https?:\/\/|\/|data:image\/)/i.test(src)) {
                        el.setAttribute('src', new URL(src, sourceUrl).href);
                    } else if (src) el.removeAttribute('src');
                }
            }
            return clone;
        }

        function makePostCard({li, depth, role}, remoteUrls = new Map()) {
            const id = li.dataset.id;
            const sourceUrl = remoteUrls.get(id) || location.href;
            const msg = qs(li, ':scope > .message');
            const author = qs(msg, '.message-head-user .user-title .user-link')
                || qs(msg, '.message-head-user .user-title')
                || qs(msg, '.message-body-user .user-title');
            const rank = qs(msg, '.message-head-user .user-class');
            const avatar = qs(msg, '.message-head-user .user-face img');
            const time = qs(msg, '.message-head-infos time');
            const content = qs(msg, '.message-body-main > .rtif-content.message-content')
                || qs(msg, '.message-body-main > .message-content');

            const article = document.createElement('article');
            article.className = 'ph-pt-chain-item';
            article.dataset.postId = id;
            article.dataset.selected = role === 'selected' ? 'true' : 'false';
            article.dataset.parentId = li.dataset.rplid || '';
            article.style.setProperty('--ph-pt-chain-indent', `${depth * 17}px`);
            article.setAttribute('role', 'listitem');
            const header = document.createElement('div');
            header.className = 'ph-pt-chain-item-head';
            const face = document.createElement('span');
            face.className = 'ph-pt-chain-avatar';
            if (avatar?.getAttribute('src')) {
                const img = document.createElement('img');
                const imageSrc = avatar.getAttribute('src');
                img.src = new URL(imageSrc, sourceUrl).href;
                img.alt = '';
                img.loading = 'lazy';
                face.appendChild(img);
            } else {
                face.innerHTML = '<span class="fas fa-user" aria-hidden="true"></span>';
            }
            header.appendChild(face);
            const authorBox = document.createElement('span');
            authorBox.className = 'ph-pt-chain-author';
            const authorName = document.createElement('strong');
            authorName.textContent = author?.textContent?.trim() || 'Ismeretlen szerző';
            authorBox.appendChild(authorName);
            if (rank?.textContent?.trim()) {
                const authorRank = document.createElement('small');
                authorRank.textContent = rank.textContent.trim();
                authorBox.appendChild(authorRank);
            }
            header.appendChild(authorBox);
            const meta = document.createElement('span');
            meta.className = 'ph-pt-chain-meta';
            const link = document.createElement('a');
            link.className = 'ph-pt-chain-post-link';
            link.href = remoteUrls.has(id) ? `${sourceUrl}#msg${id}` : `#msg${id}`;
            link.dataset.chainJump = id;
            link.title = 'Ugrás az eredeti hozzászólásra';
            link.textContent = `#${id}`;
            meta.appendChild(link);
            if (time?.textContent?.trim()) {
                const timeLabel = document.createElement('time');
                timeLabel.className = 'ph-pt-chain-time';
                timeLabel.textContent = time.textContent.trim();
                meta.appendChild(timeLabel);
            }
            header.appendChild(meta);
            article.appendChild(header);
            // A valaszvonalak jelzik az elozmenyeket es valaszokat;
            // csak a kivalasztott hozzaszolast jeloljuk szovegesen.
            if (role === 'selected') {
                const badge = document.createElement('span');
                badge.className = 'ph-pt-chain-label';
                badge.textContent = 'Kiválasztott hozzászólás';
                article.appendChild(badge);
            }
            const postContent = content ? cloneMessageContent(content, sourceUrl) : document.createElement('div');
            if (!content) {
                postContent.className = 'ph-pt-chain-post-content';
                postContent.textContent = 'A hozzászólás szövege itt nem érhető el.';
            }
            // Nem szamolunk uj szinezesi szabalyokat: az eredeti hozzaszolas
            // torzserol vesszuk at a colorize modul mar eldontott allapotat.
            // Ez az akciokat, a sajat/nekem szolo valaszokat es az avatarfokuszt
            // is pontosan ugyanugy kezeli. Kikapcsolt szinezesnel semmit sem masolunk.
            if (savedSettings.colorize) {
                const originalBody = qs(msg, '.message-body');
                // A letoltott hozzaszolasokra a fooram szinezo modulja nem fut le.
                // Azonos logikaval kiszamoljuk a szinezosztalyt az ottani adatokbol.
                if (remoteUrls.has(id) && originalBody) colorizeFetchedPost(msg, originalBody);
                for (const colorClass of [
                    'ph-pt-akcio', 'ph-pt-own', 'ph-pt-reply',
                    'ph-pt-focus-author', 'ph-pt-focus-reply'
                ]) {
                    if (originalBody?.classList.contains(colorClass)) {
                        postContent.classList.add(colorClass);
                    }
                }
            }
            article.appendChild(postContent);
            return article;
        }

        // A Thread nezethez hasonlo, valódi szulo-gyermek kapcsolatot ábrázoló
        // folytonos könyökvonalak. A sorrend bármilyen lehet (csökkenőben a
        // válasz gyakran a szülő FELETT áll), ezért mért DOM-koordinátákból rajzolunk.
        // A vonalak a kártyák mellett futnak, nem takarják a hozzászólásszöveget.
        function drawChainConnectors() {
            const modal = document.getElementById(MODAL_ID);
            if (!modal || modal.style.display !== 'flex') return;
            const tree = modal.querySelector('.ph-pt-chain-tree');
            const svg = tree?.querySelector('.ph-pt-chain-connectors');
            if (!tree || !svg) return;

            const bounds = tree.getBoundingClientRect();
            const width = tree.clientWidth;
            const height = tree.scrollHeight;
            if (width <= 0 || height <= 0) return;
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            const nodes = new Map();
            for (const article of tree.querySelectorAll('.ph-pt-chain-item')) {
                const head = article.querySelector('.ph-pt-chain-item-head');
                if (!head) continue;
                const cardBox = article.getBoundingClientRect();
                const headBox = head.getBoundingClientRect();
                nodes.set(article.dataset.postId, {
                    id: article.dataset.postId,
                    parent: article.dataset.parentId,
                    selected: article.dataset.selected === 'true',
                    x: Math.max(7, cardBox.left - bounds.left - 11),
                    y: headBox.top - bounds.top + Math.min(23, headBox.height / 2)
                });
            }

            const ns = 'http://www.w3.org/2000/svg';
            const fragment = document.createDocumentFragment();
            const radius = 5.5;
            // Először a vonalakat rajzoljuk, a csomópontok csak ezután kerülnek
            // föléjük, így a vonal nem halad át a kis körökön.
            for (const node of nodes.values()) {
                const parent = nodes.get(node.parent);
                if (!parent || node.id === parent.id) continue;
                const dx = node.x - parent.x;
                const dy = node.y - parent.y;
                if (Math.abs(dy) < 1) continue;
                const sign = Math.sign(dy);
                const corner = Math.min(10, Math.max(0, dx / 2), Math.abs(dy) / 3);
                const d = dx >= 9 && corner > 1
                    ? `M ${parent.x} ${parent.y + sign * radius} V ${node.y - sign * corner} ` +
                      `Q ${parent.x} ${node.y} ${parent.x + corner} ${node.y} ` +
                      `H ${node.x - radius}`
                    : `M ${parent.x} ${parent.y + sign * radius} V ${node.y - sign * radius}`;
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('class', 'ph-pt-chain-edge');
                path.setAttribute('d', d);
                path.dataset.chainFrom = parent.id;
                path.dataset.chainTo = node.id;
                path.dataset.focus = parent.selected || node.selected ? 'true' : 'false';
                fragment.appendChild(path);
            }
            for (const node of nodes.values()) {
                const dot = document.createElementNS(ns, 'circle');
                dot.setAttribute('class', 'ph-pt-chain-node');
                dot.setAttribute('cx', node.x);
                dot.setAttribute('cy', node.y);
                dot.setAttribute('r', radius);
                dot.dataset.chainNodeId = node.id;
                dot.dataset.current = node.selected ? 'true' : 'false';
                fragment.appendChild(dot);
            }
            svg.replaceChildren(fragment);
        }

        function scheduleChainConnectors() {
            if (connectorFrame !== null) return;
            connectorFrame = requestAnimationFrame(() => {
                connectorFrame = null;
                drawChainConnectors();
            });
        }

        // A hivatkozasok temaazonos alapurl-je: nem kerunk kulso domaint.
        function getTopicBasePath() {
            return location.pathname.match(/^(\/tema\/[^/]+\/)/)?.[1] || '';
        }

        function topicPageUrl(base, first, last = first) {
            return new URL(`${base}hsz_${first}-${last}.html`, location.origin).href;
        }

        // Az azonosito szerinti fix, 200 hozzaszolasos lapokra igazodunk,
        // nem az eppen megnyitott (akar egyetlen hozzaszolast mutato) nezetre.
        // 89605 -> 89601-89800, 89801 -> 89801-90000, 200 -> 1-200.
        function chainPageRange(postId) {
            const first = Math.floor((postId - 1) / CHAIN_PAGE_SIZE) * CHAIN_PAGE_SIZE + 1;
            return {first, last: first + CHAIN_PAGE_SIZE - 1};
        }

        function latestPostIdFromPager(base, localMax) {
            let latest = localMax;
            for (const a of document.querySelectorAll('a[href*="/hsz_"]')) {
                try {
                    const url = new URL(a.getAttribute('href'), location.href);
                    if (url.origin !== location.origin || !url.pathname.startsWith(base)) continue;
                    const match = url.pathname.match(/\/hsz_(\d+)-(\d+)\.html$/);
                    if (match) latest = Math.max(latest, Number(match[1]), Number(match[2]));
                } catch { /* Hibas lapozolinket kihagyjuk. */ }
            }
            return latest;
        }

        // A szinezo modul a levalasztott (hatterben letoltott) DOM-on nem fut.
        // Az eredeti prioritasokat es az aktualis avatar-fokuszt reprodukaljuk.
        function colorizeFetchedPost(msg, body) {
            const author = qs(msg, '.message-head-user .user-title .user-link')?.textContent?.trim() || '';
            const replyTo = qs(msg, '.message-head-infos .message-reply .user-title .user-link')?.textContent?.trim() || '';
            const currentName = document.querySelector('.dropdown-menu h6 a[href^="/tag/"]')?.textContent?.trim() || '__NINCS_BEJELENTKEZVE__';
            const focusedBody = document.querySelector('.message-body.ph-pt-focus-author');
            const focusedName = focusedBody?.closest('.message')?.querySelector('.message-head-user .user-title .user-link')?.textContent?.trim() || '';
            const textClone = body.cloneNode(true);
            textClone.querySelector('.message-content-replied')?.remove();
            const text = textClone.textContent.toLowerCase();
            body.classList.remove('ph-pt-akcio', 'ph-pt-own', 'ph-pt-reply', 'ph-pt-focus-author', 'ph-pt-focus-reply');
            if (text.includes('#akció') || text.includes('#akcio')) body.classList.add('ph-pt-akcio');
            if (focusedName && author === focusedName) body.classList.add('ph-pt-focus-author');
            else if (focusedName && replyTo === focusedName) body.classList.add('ph-pt-focus-reply');
            else if (author.toLowerCase() === currentName.toLowerCase()) body.classList.add('ph-pt-own');
            else if (replyTo.toLowerCase() === currentName.toLowerCase()) body.classList.add('ph-pt-reply');
        }

        async function fetchTopicPosts(session, url) {
            const response = await fetch(url, {
                credentials: 'same-origin',
                signal: session.controller.signal,
                headers: {'Accept': 'text/html'}
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const finalUrl = new URL(response.url || url, location.href);
            if (finalUrl.origin !== location.origin || !finalUrl.pathname.startsWith(session.topicBase)) {
                throw new Error('A fórum másik oldalra irányította a kérést.');
            }
            const html = await response.text();
            if (html.length > 10 * 1024 * 1024) throw new Error('A letöltött oldal túl nagy.');
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            const lis = Array.from(parsed.querySelectorAll('li[data-id]'))
                .filter(li => /^\d+$/.test(li.dataset.id || '') && li.querySelector(':scope > .message'));
            return {lis, finalUrl: finalUrl.href};
        }

        // Az elozmenyek es valaszok ugyanazokat a 200-as oldalakat hasznaljak.
        // Az elso sikeres lekeres utan a tartalmat a kovetkezo popupmegnyitasoknal
        // is ujra felhasznaljuk, a helyi session remotePosts terkepet feltoltve.
        // A cache-kulcs tartalmazza a domaint es temat, a requestedLast pedig
        // megkulonbozteti a reszleges utolso oldalt a teljes 200-as tartomanytol.
        function rememberChainPage(key, page) {
            const now = Date.now();
            for (const [oldKey, oldPage] of chainPageCache) {
                if (now - oldPage.savedAt > CHAIN_CACHE_TTL_MS) chainPageCache.delete(oldKey);
            }
            chainPageCache.delete(key);
            chainPageCache.set(key, page);
            while (chainPageCache.size > CHAIN_CACHE_MAX_PAGES) {
                chainPageCache.delete(chainPageCache.keys().next().value);
            }
        }

        async function loadChainPage(session, first, last) {
            const key = `${location.origin}${session.topicBase}${chainPageRange(first).first}`;
            const now = Date.now();
            // A globalis cache-ben lehet ujabb / teljesebb valtozat is,
            // mint az adott popup korabbi roviditett tartomanya.
            const usable = [session.pageCache.get(key), chainPageCache.get(key)]
                .filter(entry => entry && now - entry.savedAt <= CHAIN_CACHE_TTL_MS
                    && entry.requestedLast >= last);
            const pageFromCache = usable.sort((a, b) => b.requestedLast - a.requestedLast)[0];
            let page = pageFromCache || null;
            // Egy 200-as lap teljes lekerese fedezhet rovidebb intervallumot is,
            // de a korabbi rovid oldal nem valthat ki egy kesobbi teljes oldalt.
            const cached = !!page;
            if (!page) {
                const url = topicPageUrl(session.topicBase, first, last);
                const {lis, finalUrl} = await fetchTopicPosts(session, url);
                if (session !== chainSession || session.controller?.signal.aborted) {
                    throw new DOMException('Megszakitott betoltes', 'AbortError');
                }
                const posts = lis.filter(li => {
                    const id = Number(li.dataset.id);
                    return id >= first && id <= last;
                });
                page = {posts, finalUrl, requestedLast: last, savedAt: Date.now()};
                rememberChainPage(key, page);
            } else {
                // LRU: a nemreg hasznalt lap maradjon legtovabb a memoriaban.
                rememberChainPage(key, page);
            }
            session.pageCache.set(key, page);
            // A levalasztott DOM csomopontoket MINDEN uj munkamenethez atvesszuk.
            // Nem eleg a page objektumot visszaadni: a getChain a remotePosts-ot olvassa.
            for (const li of page.posts) {
                const id = li.dataset.id;
                const number = Number(id);
                if (number >= first && number <= last && !session.remotePosts.has(id) && !session.localIds.has(id)) {
                    session.remotePosts.set(id, li);
                    session.remoteUrls.set(id, page.finalUrl);
                }
            }
            return {posts: page.posts, finalUrl: page.finalUrl, cached};
        }

        // Az elozmeny ID-ja ismert: eloszor a teljes, ot tartalmazo 200-as
        // oldalt kerjuk le. Egyetlen oldalon tobb egymasra epulo elozo
        // hozzaszolas is lehet, amit a getChain azonnal felismer.
        async function loadAncestors(session) {
            const oldIds = new Set(getChain(session.startLi, session.remotePosts.values()).items
                .filter(item => item.role === 'parent').map(item => item.li.dataset.id));
            let scanned = 0;
            const checked = new Set();
            while (scanned < MAX_ANCESTOR_PAGES_PER_CLICK && session === chainSession) {
                const chain = getChain(session.startLi, session.remotePosts.values());
                const id = chain.missingParentId;
                if (!id || !/^\d+$/.test(id) || Number(id) < 1 || checked.has(id)) break;
                checked.add(id);
                const {first, last} = chainPageRange(Number(id));
                const {cached} = await loadChainPage(session, first, last);
                if (!cached) scanned++;
                // A lekerdezett intervallumban nincs ilyen uzenet: torolve lehet,
                // vagy a szerver nem adja ki. Azonos oldalt nem toltunk ujra.
                if (!session.remotePosts.has(id) && !session.localIds.has(id)) {
                    session.ancestorsExhausted = true;
                    session.status.parents = `A(z) #${id} előzmény nem érhető el.`;
                    break;
                }
            }
            const chain = getChain(session.startLi, session.remotePosts.values());
            const count = chain.items.filter(item => item.role === 'parent' && !oldIds.has(item.li.dataset.id)).length;
            if (!session.ancestorsExhausted) {
                session.status.parents = count ? `${count} előzmény betöltve.` : 'Nincs több betölthető előzmény.';
            }
        }

        // A tovabbi valaszokhoz nincs ismert ID-lista, de 200-as blokkonkent
        // atvizsgalhatjuk az ujabb hozzaszolasokat. A keresesi kurzor mindig
        // a fix blokk vegeig lep (nem az aktualis, pl. 25-os nezet szerint).
        // Csak a tenylegesen a kivalasztott agba tartozo elemek latszanak.
        async function loadReplies(session) {
            const oldIds = new Set(getChain(session.startLi, session.remotePosts.values()).items.map(item => item.li.dataset.id));
            let scanned = 0;
            let newReplies = 0;
            while (scanned < MAX_REPLY_PAGES_PER_CLICK && session === chainSession) {
                if (session.cursor >= session.latestId || session.repliesExhausted) break;
                const {first, last} = chainPageRange(session.cursor + 1);
                // A tema legutolso oldala lehet 200-nal rovidebb.
                const to = Number.isFinite(session.latestId) ? Math.min(last, session.latestId) : last;
                const {posts} = await loadChainPage(session, first, to);
                scanned++;
                session.cursor = to;
                // Ures lekeres csak akkor allitja le a keresest, ha mar nincs
                // ismert kesobbi oldal; torolt ID-blokkokat tovabb leptetjuk.
                if (!posts.length && (!Number.isFinite(session.latestId) || to >= session.latestId)) {
                    session.repliesExhausted = true;
                    break;
                }
                const chain = getChain(session.startLi, session.remotePosts.values());
                newReplies = chain.items.filter(item => item.role === 'reply' && !oldIds.has(item.li.dataset.id)).length;
                if (newReplies) break;
            }
            if (newReplies) session.status.replies = `${newReplies} kapcsolódó válasz betöltve.`;
            else if (session.repliesExhausted || session.cursor >= session.latestId) {
                session.status.replies = 'A beolvasott oldalak végéig nem találtam több kapcsolódó választ.';
            } else {
                session.status.replies = `A következő ${scanned} (legfeljebb 200 hozzászólásos) oldalon nem volt kapcsolódó válasz. Kereshetsz tovább.`;
            }
        }

        function hasMoreChainPage(session, side, chain) {
            if (!session.topicBase) return false;
            if (side === 'parents') return !session.ancestorsExhausted && !!chain.missingParentId && /^\d+$/.test(chain.missingParentId);
            return !session.repliesExhausted && session.cursor < session.latestId;
        }

        function makeLoadMore(session, side, chain) {
            const showButton = hasMoreChainPage(session, side, chain);
            const note = session.status[side];
            if (!showButton && !note) return null;
            const block = document.createElement('div');
            block.className = 'ph-pt-chain-more';
            block.dataset.chainMore = side;
            if (showButton) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ph-pt-chain-more-button';
                button.dataset.chainLoad = side;
                button.textContent = side === 'parents' ? 'További előzmények betöltése' : 'További válaszok betöltése';
                button.disabled = session.busy;
                block.appendChild(button);
            }
            if (note) {
                const label = document.createElement('span');
                label.className = 'ph-pt-chain-more-status';
                label.setAttribute('role', 'status');
                label.textContent = note;
                block.appendChild(label);
            }
            return block;
        }

        function renderChain(session, initial = false) {
            const modal = document.getElementById(MODAL_ID);
            if (!modal || session !== chainSession) return;
            const list = modal.querySelector('#ph-pt-chain-list');
            // Uj hozzaszolasok beszu'rasa ne allitsa vissza a scrollt a kivalasztottra.
            // Az elso lathato kartyat a kepernyon ugyanott tartjuk.
            const listBounds = list.getBoundingClientRect();
            const firstVisible = initial ? null : [...list.querySelectorAll('.ph-pt-chain-item')].find(card =>
                card.getBoundingClientRect().bottom > listBounds.top + 1);
            const anchorId = firstVisible?.dataset.postId || '';
            const anchorTop = firstVisible ? firstVisible.getBoundingClientRect().top - listBounds.top : 0;
            const oldScroll = list.scrollTop;
            const {items, hasMissingParent, direction, missingParentId} = getChain(session.startLi, session.remotePosts.values());
            connectorObserver?.disconnect();
            if (connectorFrame !== null) cancelAnimationFrame(connectorFrame);
            connectorFrame = null;
            list.replaceChildren();
            const topSide = direction === 'd' ? 'replies' : 'parents';
            const bottomSide = direction === 'd' ? 'parents' : 'replies';
            const top = makeLoadMore(session, topSide, {missingParentId});
            if (top) list.appendChild(top);
            const tree = document.createElement('div');
            tree.className = 'ph-pt-chain-tree';
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'ph-pt-chain-connectors');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            tree.appendChild(svg);
            const fragment = document.createDocumentFragment();
            for (const item of items) fragment.appendChild(makePostCard(item, session.remoteUrls));
            tree.appendChild(fragment);
            list.appendChild(tree);
            const bottom = makeLoadMore(session, bottomSide, {missingParentId});
            if (bottom) list.appendChild(bottom);
            modal.querySelector('#ph-pt-chain-title').textContent = `Hozzászólás-lánc · #${session.startLi.dataset.id}`;
            const ancestors = items.filter(item => item.role === 'parent').length;
            const replies = items.length - ancestors - 1;
            modal.querySelector('#ph-pt-chain-count').textContent =
                `${items.length} hozzászólás · ${ancestors} előzmény · ${replies} válasz · ${direction === 'd' ? 'csökkenő' : 'növekvő'} sorrend`;
            modal.querySelector('#ph-pt-chain-hint').textContent =
                hasMissingParent && !session.ancestorsExhausted
                    ? 'Az előzmények más oldalon is folytatódhatnak. Csak a kapcsolódó hozzászólások láthatók.'
                    : 'A betöltött fórumoldalakról csak a kapcsolódó hozzászólások láthatók.';
            if (initial) {
                list.scrollTop = 0;
                revealSelectedChainPost(list);
            } else if (anchorId) {
                const newAnchor = [...tree.querySelectorAll('.ph-pt-chain-item')].find(card => card.dataset.postId === anchorId);
                if (newAnchor) {
                    list.scrollTop = oldScroll + newAnchor.getBoundingClientRect().top - list.getBoundingClientRect().top - anchorTop;
                } else list.scrollTop = oldScroll;
            } else list.scrollTop = oldScroll;
            drawChainConnectors();
            if (typeof ResizeObserver === 'function') {
                connectorObserver = new ResizeObserver(scheduleChainConnectors);
                connectorObserver.observe(tree);
                tree.querySelectorAll('.ph-pt-chain-item').forEach(card => connectorObserver.observe(card));
            }
            document.fonts?.ready?.then(scheduleChainConnectors);
        }

        async function expandChain(side, button) {
            const session = chainSession;
            if (!session || session.busy || !session.topicBase || !['parents', 'replies'].includes(side)) return;
            session.busy = true;
            session.status[side] = '';
            session.controller = new AbortController();
            button.disabled = true;
            button.textContent = 'Betöltés…';
            try {
                if (side === 'parents') await loadAncestors(session);
                else await loadReplies(session);
            } catch (error) {
                if (error.name === 'AbortError' || session !== chainSession) return;
                session.status[side] = `A betöltés sikertelen: ${error.message}. Próbáld újra.`;
            } finally {
                if (session === chainSession) {
                    session.busy = false;
                    session.controller = null;
                    renderChain(session);
                    const next = document.querySelector(`#${MODAL_ID} [data-chain-load="${side}"]`);
                    next?.focus({preventScroll: true});
                }
            }
        }

        function closeModal() {
            const modal = document.getElementById(MODAL_ID);
            if (!modal || modal.style.display !== 'flex') return;
            chainSession?.controller?.abort();
            chainSession = null;
            connectorObserver?.disconnect();
            modal.style.display = 'none';
            document.body.style.overflow = previousOverflow;
            if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
            const focusTarget = previousFocus?.isConnected ? previousFocus : lastTrigger;
            focusTarget?.focus?.({preventScroll: true});
            previousFocus = null;
        }

        // Megnyitaskor a kijelolt hozzaszolas legyen azonnal lathato.
        // Csak a popup sajat gorgetoelemet mozgatjuk; tovabbi betolteskor
        // a felhasznalo altal beallitott gorgetesi poziciot megtartjuk.
        function revealSelectedChainPost(list) {
            const selected = list.querySelector('.ph-pt-chain-item[data-selected="true"]');
            if (!selected) return;
            const listRect = list.getBoundingClientRect();
            const selectedRect = selected.getBoundingClientRect();
            const selectedTop = selectedRect.top - listRect.top + list.scrollTop;
            const visibleHeight = Math.min(selectedRect.height, list.clientHeight);
            list.scrollTop = Math.max(0, selectedTop - (list.clientHeight - visibleHeight) / 2);
        }

        function openModal(li, trigger) {
            chainSession?.controller?.abort();
            const modal = ensureModal();
            const localPosts = Array.from(document.querySelectorAll('li[data-id]'))
                .filter(post => post.querySelector(':scope > .message'));
            const localIds = new Set(localPosts.map(post => post.dataset.id));
            const maxId = Math.max(0, ...localPosts.map(post => Number(post.dataset.id) || 0));
            const topicBase = getTopicBasePath();
            const onLatestPage = /\/friss\.html$/.test(location.pathname);
            const latestFromPager = topicBase ? latestPostIdFromPager(topicBase, maxId) : maxId;
            chainSession = {
                startLi: li,
                topicBase,
                localIds,
                remotePosts: new Map(),
                remoteUrls: new Map(),
                // Csak e munkamenet gyors hozzaferese; az oldalak globalis
                // chainPageCache-je tuleli a popup bezarasat is.
                pageCache: new Map(),
                cursor: maxId,
                latestId: onLatestPage ? maxId : (latestFromPager > maxId ? latestFromPager : Infinity),
                ancestorsExhausted: false,
                repliesExhausted: false,
                status: {parents: '', replies: ''},
                busy: false,
                controller: null
            };
            previousOverflow = document.body.style.overflow;
            previousFocus = document.activeElement;
            if (lastTrigger && lastTrigger !== trigger) lastTrigger.setAttribute('aria-expanded', 'false');
            lastTrigger = trigger;
            trigger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            modal.style.display = 'flex';
            renderChain(chainSession, true);
            modal.querySelector('[data-chain-close]')?.focus({preventScroll: true});
        }

        // Az iframe nélküli beágyazott tartalomképek a betöltés után is
        // változtathatják a kártyamagasságot. A capture esemény nem görget.
        document.addEventListener('load', event => {
            if (event.target?.closest?.(`#${MODAL_ID} .ph-pt-chain-tree`)) {
                scheduleChainConnectors();
            }
        }, true);
        window.addEventListener('resize', scheduleChainConnectors);

        // Eseménydelegálás: az AJAX-szal betöltött hozzászólások is működnek.
        document.addEventListener('click', event => {
            const loadButton = event.target.closest(`#${MODAL_ID} [data-chain-load]`);
            if (loadButton) {
                event.preventDefault();
                expandChain(loadButton.dataset.chainLoad, loadButton);
                return;
            }
            const chainButton = event.target.closest('.ph-pt-chain-link');
            if (chainButton) {
                event.preventDefault();
                event.stopPropagation();
                const post = chainButton.closest('li[data-id]');
                if (post) openModal(post, chainButton);
                return;
            }
            const jump = event.target.closest(`#${MODAL_ID} [data-chain-jump]`);
            if (jump) {
                const target = document.querySelector(`li[data-id="${jump.dataset.chainJump}"]`);
                closeModal();
                // Az aktuális hash újrakattintása önmagában nem görget.
                if (location.hash === `#msg${jump.dataset.chainJump}` && target) {
                    requestAnimationFrame(() => target.scrollIntoView({behavior: 'smooth', block: 'start'}));
                }
            }
        }, true);

        document.addEventListener('keydown', event => {
            const modal = document.getElementById(MODAL_ID);
            if (modal?.style.display !== 'flex') return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                closeModal();
            } else if (event.key === 'Tab') {
                const nodes = [...modal.querySelectorAll('a[href], button:not([disabled])')]
                    .filter(el => el.getClientRects().length);
                if (!nodes.length) return;
                const first = nodes[0], last = nodes[nodes.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        }, true);

        function attachChainLinks() {
            document.querySelectorAll('li[data-id] .message-head-btns').forEach(opts => {
                if (qs(opts, '.ph-pt-chain-link')) {
                    const existing = qs(opts, '.ph-pt-chain-link');
                    existing.title = 'Hozzászólás-lánc megtekintése';
                    existing.setAttribute('aria-label', 'Hozzászólás-lánc megtekintése');
                    existing.setAttribute('aria-haspopup', 'dialog');
                    if (!existing.hasAttribute('aria-expanded')) existing.setAttribute('aria-expanded', 'false');
                    return;
                }
                const button = document.createElement('a');
                button.className = 'ph-pt-chain-link message-btn';
                button.href = 'javascript:;';
                button.role = 'button';
                button.title = 'Hozzászólás-lánc megtekintése';
                button.setAttribute('aria-label', 'Hozzászólás-lánc megtekintése');
                button.setAttribute('aria-haspopup', 'dialog');
                button.setAttribute('aria-expanded', 'false');
                button.innerHTML = '<span class="fas fa-link fa-fw"></span> <span class="ph-pt-chain-text d-none d-sm-inline">Lánc</span>';
                opts.prepend(button);
            });
        }
        attachChainLinks();
        // Csak a hozzászóláslisták változására reagálunk, a popup tartalmára nem.
        const observer = new MutationObserver(records => {
            if (records.some(record => [...record.addedNodes].some(node =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node.matches?.('li[data-id], .message-head-btns') || node.querySelector?.('li[data-id] .message-head-btns, .message-head-btns'))))) {
                attachChainLinks();
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    }

    function linkRedirect() {
        // Konfiguráció
        const phDomains = ["prohardver.hu", "mobilarena.hu", "gamepod.hu", "itcafe.hu", "logout.hu", "fototrend.hu"];
        const forbiddenPaths = ["/fooldal", "/nyeremenyjatek", "/cikk", "/hir", "/teszt", "/foto"];

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
        const pal = savedSettings.colorizePalette || DEFAULT_COLORIZE_PALETTE;
        const l = pal?.light?.hashHighlight || DEFAULT_COLORIZE_PALETTE.light.hashHighlight;
        const d = pal?.dark?.hashHighlight  || DEFAULT_COLORIZE_PALETTE.dark.hashHighlight;

        injectStyleOnce("ph-pt-msg-anchor-highlight-style", `
            body[data-theme="light"] {
                --ph-pt-hash-highlight: ${l};
            }
            body[data-theme="dark"] {
                --ph-pt-hash-highlight: ${d};
            }
            li[data-id] .message-head.hash-highlight {
                background-color: var(--ph-pt-hash-highlight) !important;
                transition: background-color 0.2s ease;
            }
            /* A rejtett szerzok osszecsukott uzeneteinel a kijelolt fejlec
               nem latszik: ilyenkor a lathato Rejtett savot is kiemeljuk.
               A CSS a fejlec allapotat koveti, uj sav beszurasakor is. */
            li[data-id]:has(> :is(.message, .message-off) > .message-head.hash-highlight) > .hidden-bar {
                background: var(--ph-pt-hash-highlight) !important;
                color: var(--ph-ui-fg) !important;
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
            return [...document.querySelectorAll('li[data-id]')];
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

            document.querySelectorAll('li[data-id] .message-head.hash-highlight')
                .forEach(head => head.classList.remove('hash-highlight'));

            const post = document.querySelector(`li[data-id="${msgId}"]`)
                ?? findClosestPost(getPosts(), msgId);

            const head = post?.querySelector(
                ':scope > :is(.message, .message-off) > .message-head'
            );

            head?.classList.add('hash-highlight');
        }

        function scrollToHashMsg() {
            const m = window.location.hash.match(/^#msg(\d+)$/);
            if (!m) return false;

            return window.phPtMessageScroller?.scrollToMsgId?.(m[1]) || false;
        }

        function tryScrollToHashMsg(n = 5) {
            if (cancelInitialHashScroll) return;
            if (n <= 0) return;

            if (scrollToHashMsg()) return;

            setTimeout(() => {
                tryScrollToHashMsg(n - 1);
            }, 600);
        }

        function onHashChange() {
            if (window.location.hash === lastHash) return;
            lastHash = window.location.hash;

            highlightHashMsg();

            if (window.location.hash.match(/^#msg\d+$/)) {
                tryScrollToHashMsg(5);
            }
        }

        /**********************
         * DUPLA KATT: kijelölés
         **********************/
        document.addEventListener("dblclick", (e) => {
            const header = e.target.closest(".message-head");
            if (!header) return;

            const li = header.closest("li[data-id]");
            if (!li) return;

            const id = li.dataset.id;
            if (!id) return;

            e.preventDefault();
            location.hash = "#msg" + id;
        });

        let cancelInitialHashScroll = false;

        function bindInitialScrollCancelEvents() {
            const cancel = () => {
                cancelInitialHashScroll = true;
            };

            window.addEventListener('wheel', cancel, { once: true, passive: true });
            window.addEventListener('touchstart', cancel, { once: true, passive: true });
            window.addEventListener('keydown', cancel, { once: true });
        }

        /**********************
         * INIT
         **********************/
        // Az első #msg-hez görgetést csak az inicializáláskor ütemezzük.
        // Korábban a body minden DOM-módosítása (pl. a navigációs panel
        // frissítése) újabb késleltetett görgetést indított, amely egy későbbi
        // navigációt is megzavarhatott.
        let initialHashChecked = false;

        function init() {
            const firstRun = !initialHashChecked;
            initialHashChecked = true;
            lastHash = window.location.hash;
            highlightHashMsg();

            if (firstRun && /^#msg\d+$/.test(lastHash)) {
                const initialHash = lastHash;
                bindInitialScrollCancelEvents();

                setTimeout(() => {
                    if (!cancelInitialHashScroll && window.location.hash === initialHash) {
                        tryScrollToHashMsg(5);
                    }
                }, 1200);
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

    // Közös láthatósági ellenőrzés a billentyűzetes és a mobilnavigációhoz.
    // Az OFF-elrejtés kapcsolójából indulunk ki, így animáció közben sem
    // választható ki egy éppen eltűnő hozzászólás. Kikapcsolva az OFF-ok
    // azonnal visszakerülhetnek a navigálható elemek közé.
    function isOffExcludedFromNavigation(li) {
        if (!li || !savedSettings.offHider ||
            storage.getItem(KEYS.STATE.HIDE_OFF) !== 'enabled') return false;

        // A fórum az OFF-jelölést gyakran közvetlenül a LI-n tárolja;
        // máskor a belső .message/.message-off elem hordozza.
        if (li.classList.contains('message-off')) return true;
        const message = li.querySelector(':scope > .message, :scope > .message-off');
        return !!message && (message.classList.contains('message-off') ||
            message.textContent.includes('[OFF]'));
    }

    function isNavigableForumPost(li) {
        return !!li && li.matches('li[data-id]') &&
            !li.classList.contains('ph-tv-branch-hidden') &&
            !li.classList.contains('ph-tv-off-hidden') &&
            !isOffExcludedFromNavigation(li);
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
            /* A Modern és Thread nézetben a teljes LI-t animáljuk, nem csak
               a belső üzenetet: a kártya és a köze is folyamatosan összecsukódik. */
            ul.ph-mv-active:not(.ph-tv-active) > li.ph-mv-off-transitioning,
            ul.ph-tv-active > li.ph-tv-off-transitioning {
                box-sizing: border-box !important;
                overflow: hidden !important;
                transition: height 380ms cubic-bezier(.4, 0, .2, 1),
                            margin-bottom 380ms cubic-bezier(.4, 0, .2, 1),
                            opacity 310ms ease !important;
            }
            @media (prefers-reduced-motion: reduce) {
                ul.ph-mv-active:not(.ph-tv-active) > li.ph-mv-off-transitioning,
                ul.ph-tv-active > li.ph-tv-off-transitioning {
                    transition: none !important;
                }
            }
        `);

        const STORAGE_KEY = KEYS.STATE.HIDE_OFF;
        const STATUS = { ON: 'enabled', OFF: 'disabled' };

        let offHidden = storage.getItem(STORAGE_KEY) === STATUS.ON;
        const buttons = [];

        function getOffPosts() {
            return Array.from(document.querySelectorAll('.message-off, .message')).filter(post =>
                post.textContent.includes('[OFF]') || post.classList.contains('message-off')
            );
        }

        // Az OFF jelölés lehet közvetlenül a LI-n vagy a belső .message elemen.
        // Mindkét kártyás nézetben az egész sort animáljuk, hogy a kártyák
        // közötti térköz se ugorjon hirtelen a végállapotra.
        const CARD_OFF_DURATION = 380;
        const cardTransitions = new Map();
        const animatedProperties = ['height', 'margin-bottom', 'opacity', 'transition'];

        function getAnimatedCardRow(post) {
            const row = post.closest('li');
            if (!row) return null;
            if (row.parentElement?.matches('ul.ph-mv-active:not(.ph-tv-active)')) return row;
            if (row.matches('li[data-id]') && row.parentElement?.matches('ul.ph-tv-active')) return row;
            return null;
        }

        function setPostHidden(post, hidden) {
            post.classList.remove('off-post-animate');
            post.classList.toggle('off-post-hidden', hidden);
            post.style.display = hidden ? 'none' : '';
            post.style.maxHeight = '';
        }

        function saveAnimatedStyle(row) {
            return animatedProperties.map(name => [
                name, row.style.getPropertyValue(name), row.style.getPropertyPriority(name)
            ]);
        }

        function restoreAnimatedStyle(row, entries) {
            for (const [name, value, priority] of entries) {
                if (value) row.style.setProperty(name, value, priority);
                else row.style.removeProperty(name);
            }
        }

        function animateCardRow(row, posts, hide) {
            const inThread = row.parentElement?.classList.contains('ph-tv-active');
            const transitionClass = inThread ? 'ph-tv-off-transitioning' : 'ph-mv-off-transitioning';
            const previous = cardTransitions.get(row);
            const fromHeight = previous ? row.getBoundingClientRect().height
                : (hide ? row.getBoundingClientRect().height : 0);
            const fromGap = previous ? parseFloat(getComputedStyle(row).marginBottom) || 0
                : (hide ? parseFloat(getComputedStyle(row).marginBottom) || 0 : 0);
            const fromOpacity = previous ? parseFloat(getComputedStyle(row).opacity)
                : (hide ? 1 : 0);
            const original = previous ? previous.original : saveAnimatedStyle(row);
            if (previous) previous.cancel();

            // A Thread nézet a teljes LI-t display:none-ra állítja a rejtés
            // VÉGÉN. Megjelenítéskor ezt még a magasságmérés előtt oldjuk fel.
            if (!hide) {
                posts.forEach(post => setPostHidden(post, false));
                if (inThread) row.classList.remove('ph-tv-off-hidden');
            }

            // Egy már becsukott válaszág láthatatlan gyermekein nincs mit
            // animálni, a kapcsoló állapotát mégis szinkronban kell tartani.
            if ((inThread && row.classList.contains('ph-tv-branch-hidden')) ||
                window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                posts.forEach(post => setPostHidden(post, hide));
                if (inThread) row.classList.toggle('ph-tv-off-hidden', hide);
                restoreAnimatedStyle(row, original);
                row.classList.remove('ph-mv-off-transitioning', 'ph-tv-off-transitioning');
                return;
            }

            // Az animált height:0 mellett is a teljes tartalomméretet kapjuk.
            const fullHeight = Math.max(row.scrollHeight, row.getBoundingClientRect().height);
            const fullGap = 9; // Mindkét kártyás nézet alapértelmezett térköze.
            const startHeight = previous ? fromHeight : (hide ? fullHeight : 0);
            const startGap = previous ? fromGap
                : (hide ? parseFloat(getComputedStyle(row).marginBottom) || fullGap : 0);
            const startOpacity = Number.isFinite(fromOpacity) ? fromOpacity : (hide ? 1 : 0);

            row.classList.add(transitionClass);
            row.style.setProperty('transition', 'none', 'important');
            row.style.setProperty('height', `${Math.max(0, startHeight)}px`, 'important');
            row.style.setProperty('margin-bottom', `${Math.max(0, startGap)}px`, 'important');
            row.style.setProperty('opacity', String(startOpacity), 'important');
            void row.offsetHeight;

            const record = {
                original,
                raf: 0,
                timeout: 0,
                cancel() {
                    cancelAnimationFrame(this.raf);
                    clearTimeout(this.timeout);
                    row.removeEventListener('transitionend', onTransitionEnd);
                    cardTransitions.delete(row);
                },
                finish() {
                    if (cardTransitions.get(row) !== this) return;
                    this.cancel();
                    posts.forEach(post => setPostHidden(post, hide));
                    // A rejtett sor csak a magassági animáció végén kerül ki
                    // a Thread fából, ekkor már nincs hirtelen layout-ugrás.
                    if (inThread) row.classList.toggle('ph-tv-off-hidden', hide);
                    restoreAnimatedStyle(row, original);
                    row.classList.remove(transitionClass);
                    // Több tucat OFF kártyánál elég a végén egyszer értesíteni
                    // a navigációt és a Thread nézet összekötőinek rajzolóját.
                    if (!cardTransitions.size) {
                        document.dispatchEvent(new Event('ph-pt-off-visibility-changed'));
                    }
                }
            };
            function onTransitionEnd(event) {
                if (event.target === row && event.propertyName === 'height') record.finish();
            }
            cardTransitions.set(row, record);
            row.addEventListener('transitionend', onTransitionEnd);
            record.raf = requestAnimationFrame(() => {
                if (cardTransitions.get(row) !== record) return;
                row.style.removeProperty('transition');
                row.style.setProperty('height', `${hide ? 0 : fullHeight}px`, 'important');
                row.style.setProperty('margin-bottom', `${hide ? 0 : fullGap}px`, 'important');
                row.style.setProperty('opacity', hide ? '0' : '1', 'important');
            });
            record.timeout = setTimeout(() => record.finish(), CARD_OFF_DURATION + 90);
        }

        // Nézetváltáskor és válaszág-összecsukáskor ne maradjanak inline
        // méretek, félbemaradt átmenetek vagy fantom-térközök.
        for (const eventName of ['ph-pt-modern-deactivating',
            'ph-pt-thread-deactivating', 'ph-pt-thread-folds-changing']) {
            document.addEventListener(eventName, () => {
                for (const record of [...cardTransitions.values()]) record.finish();
            });
        }

        function applyVisibility(isInitial = false) {
            const cardRows = new Map();
            getOffPosts().forEach(post => {
                const row = isInitial ? null : getAnimatedCardRow(post);
                if (row) {
                    if (!cardRows.has(row)) cardRows.set(row, []);
                    cardRows.get(row).push(post);
                    return;
                }

                // A hagyományos megjelenés eredeti animációja megmarad.
                if (offHidden) {
                    if (isInitial) {
                        post.style.display = 'none';
                        post.classList.add('off-post-hidden');
                    } else {
                        post.style.maxHeight = post.scrollHeight + "px";
                        post.classList.add('off-post-animate');
                        requestAnimationFrame(() => {
                            post.classList.add('off-post-hidden');
                        });
                    }
                } else {
                    if (isInitial) {
                        post.style.display = '';
                        post.classList.remove('off-post-hidden');
                    } else {
                        if (post.style.display === 'none') post.style.display = '';
                        post.classList.add('off-post-animate');
                        const targetHeight = post.scrollHeight;
                        requestAnimationFrame(() => {
                            post.classList.remove('off-post-hidden');
                            post.style.maxHeight = targetHeight + "px";
                        });
                        setTimeout(() => {
                            if (!offHidden) {
                                post.classList.remove('off-post-animate');
                                post.style.maxHeight = '';
                            }
                        }, 500);
                    }
                }
            });
            for (const [row, posts] of cardRows) {
                animateCardRow(row, posts, offHidden);
            }
            requestAnimationFrame(() => {
                document.dispatchEvent(new Event('ph-pt-off-visibility-changed'));
            });
        }

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
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
        const VIEWPORT_GUTTER_PX = 16;
        const RESIZE_STEP_PX = 20;

        const STYLE_ID = 'ph-wide-center-style';
        const ROW_CLASS = 'ph-center-row';
        const HANDLE_CLASS = 'ph-wide-resize-handle';
        const STORAGE_KEY = KEYS.STATE.WIDE_VIEW;
        const WIDTH_STORAGE_KEY = 'ph_wide_view_center_px';

        const STATUS = { ON: 'enabled', OFF: 'disabled' };
        const buttons = [];

        function clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }

        function getSavedCenterWidth() {
            const value = parseInt(storage.getItem(WIDTH_STORAGE_KEY), 10);
            return Number.isFinite(value) ? value : null;
        }

        function saveCenterWidth(px) {
            storage.setItem(WIDTH_STORAGE_KEY, String(Math.round(px)));
        }

        function clearCenterWidth() {
            storage.removeItem(WIDTH_STORAGE_KEY);
        }

        function getSideMarginRatio() {
            const w = window.innerWidth;
            if (w < 1400) return 0.10;
            if (w < 1800) return 0.15;
            return SIDE_MARGIN_RATIO;
        }

        function getCenterBounds() {
            const viewport = window.innerWidth;

            // Eddig nőhet a center úgy, hogy a bal és jobb panel is megmarad.
            const maxWithLeft = Math.max(
                MIN_CENTER_PX,
                viewport - LEFT_PX - RIGHT_PX - (2 * GAP_PX) - VIEWPORT_GUTTER_PX
            );

            // Ha a user a fenti határon túl húz, a bal panel eltűnik,
            // és annak helyével tovább növelhető a center.
            const maxWithoutLeft = Math.max(
                maxWithLeft,
                viewport - RIGHT_PX - GAP_PX - VIEWPORT_GUTTER_PX
            );

            return {
                min: MIN_CENTER_PX,
                maxWithLeft,
                maxWithoutLeft,
            };
        }

        function getAutoCenterWidth() {
            const viewport = window.innerWidth;
            const usable = viewport * (1 - getSideMarginRatio());
            const { min, maxWithLeft } = getCenterBounds();

            return clamp(
                usable - LEFT_PX - RIGHT_PX - (2 * GAP_PX),
                min,
                maxWithLeft
            );
        }

        function calculateLayout(forcedCenter = null) {
            const { min, maxWithLeft, maxWithoutLeft } = getCenterBounds();
            const savedCenter = getSavedCenterWidth();

            const manualWidth = forcedCenter !== null || savedCenter !== null;
            const requestedCenter =
                forcedCenter ?? savedCenter ?? getAutoCenterWidth();

            // Automatikus módban soha ne lépjük át a bal panellel elérhető maximumot.
            // Kézi méretezésnél viszont engedjük tovább a center szélességét addig,
            // ameddig a bal panel eltüntetése után még kifér.
            const center = clamp(
                requestedCenter,
                min,
                manualWidth ? maxWithoutLeft : maxWithLeft
            );

            // Pont a maxWithLeft értéken még maradjon látható a bal panel.
            // Csak akkor tűnjön el, amikor a user ténylegesen azon túl húz.
            const leftHidden = manualWidth && center > maxWithLeft;

            return {
                total: (leftHidden ? 0 : LEFT_PX) + center + RIGHT_PX + (2 * GAP_PX),
                center,
                baseCenter: center,
                leftHidden,
                maxWithLeft,
                maxWithoutLeft,
            };
        }

        function buildCSS(forcedCenter = null) {
            const { total, center, leftHidden } = calculateLayout(forcedCenter);

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
                    ${leftHidden ? 'display: none !important;' : ''}
                    width: ${LEFT_PX}px !important;
                    flex: 0 0 ${LEFT_PX}px !important;
                }
                #center {
                    position: relative !important;
                    width: ${center}px !important;
                    flex: 0 0 ${center}px !important;
                }
                #right {
                    width: ${RIGHT_PX}px !important;
                    flex: 0 0 ${RIGHT_PX}px !important;
                }

                .${HANDLE_CLASS} {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    right: -7px;
                    width: 14px;
                    z-index: 150;
                    cursor: ew-resize;
                    touch-action: none;
                    user-select: none;
                    outline: none;
                }
                .${HANDLE_CLASS}::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 6px;
                    width: 2px;
                    background: currentColor;
                    opacity: 0;
                    transition: opacity 120ms ease, width 120ms ease;
                }
                
                .${HANDLE_CLASS}:hover::after,
                .${HANDLE_CLASS}:focus-visible::after,
                .${HANDLE_CLASS}.is-dragging::after {
                    width: 3px;
                    opacity: 0.55;
                }
                .${HANDLE_CLASS} .ph-wide-resize-value {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    display: none;
                    padding: 3px 7px;
                    border-radius: 5px;
                    background: rgba(0,0,0,0.78);
                    color: #fff;
                    font-size: 11px;
                    line-height: 1.2;
                    white-space: nowrap;
                    pointer-events: none;
                }
                .${HANDLE_CLASS}.is-dragging .ph-wide-resize-value,
                .${HANDLE_CLASS}:focus-visible .ph-wide-resize-value {
                    display: block;
                }
                html.ph-wide-resizing,
                html.ph-wide-resizing * {
                    cursor: ew-resize !important;
                    user-select: none !important;
                }
            `;
        }

        function updateHandleUI(centerPx = null) {
            const handle = document.querySelector(`.${HANDLE_CLASS}`);
            if (!handle) return;

            const { baseCenter, leftHidden } = calculateLayout(centerPx);
            const { min, maxWithoutLeft } = getCenterBounds();
            const value = handle.querySelector('.ph-wide-resize-value');

            handle.setAttribute('aria-valuemin', String(Math.round(min)));
            handle.setAttribute('aria-valuemax', String(Math.round(maxWithoutLeft)));
            handle.setAttribute('aria-valuenow', String(Math.round(baseCenter)));
            handle.title =
                `Szélesség: ${Math.round(baseCenter)} px` +
                (leftHidden ? ' • bal panel elrejtve' : '') +
                ' • húzás: méretezés • dupla katt: automatikus';

            if (value) value.textContent = `${Math.round(baseCenter)} px`;
        }

        function applyLayout(forcedCenter = null) {
            injectStyleOnce(STYLE_ID, buildCSS(forcedCenter));

            const center = document.querySelector('#center');
            const row = center?.closest('.row');
            if (row) row.classList.add(ROW_CLASS);

            ensureResizeHandle();
            updateHandleUI(forcedCenter);
        }

        function removeLayout() {
            document.getElementById(STYLE_ID)?.remove();
            document.querySelector(`.${HANDLE_CLASS}`)?.remove();

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

        function ensureResizeHandle() {
            const center = document.querySelector('#center');
            if (!center || center.querySelector(`.${HANDLE_CLASS}`)) return;

            const handle = document.createElement('div');
            handle.className = HANDLE_CLASS;
            handle.tabIndex = 0;
            handle.setAttribute('role', 'separator');
            handle.setAttribute('aria-orientation', 'vertical');
            handle.setAttribute('aria-label', 'Széles nézet szélességének állítása');
            handle.innerHTML = `<span class="ph-wide-resize-value"></span>`;

            let dragStartX = 0;
            let dragStartCenter = 0;
            let dragCurrentCenter = 0;
            let dragging = false;

            function finishDrag() {
                if (!dragging) return;
                dragging = false;
                handle.classList.remove('is-dragging');
                document.documentElement.classList.remove('ph-wide-resizing');

                saveCenterWidth(dragCurrentCenter);
                applyLayout();
                updateAllButtons();
            }

            handle.addEventListener('pointerdown', e => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                e.preventDefault();

                const currentCenter = calculateLayout().baseCenter;

                dragging = true;
                dragStartX = e.clientX;
                dragStartCenter = currentCenter;
                dragCurrentCenter = currentCenter;

                handle.classList.add('is-dragging');
                document.documentElement.classList.add('ph-wide-resizing');
                handle.setPointerCapture?.(e.pointerId);
                updateHandleUI(currentCenter);
            });

            handle.addEventListener('pointermove', e => {
                if (!dragging) return;

                // A teljes layout középre van igazítva, ezért a jobb él 1 px-es
                // mozgatásához kb. 2 px-rel kell változtatni a center szélességét.
                const delta = (e.clientX - dragStartX) * 2;
                const { min, maxWithoutLeft } = getCenterBounds();
                const nextCenter = clamp(dragStartCenter + delta, min, maxWithoutLeft);

                dragCurrentCenter = nextCenter;
                applyLayout(nextCenter);
                updateHandleUI(nextCenter);
            });

            handle.addEventListener('pointerup', finishDrag);
            handle.addEventListener('pointercancel', finishDrag);

            handle.addEventListener('dblclick', e => {
                e.preventDefault();
                clearCenterWidth();
                applyLayout();
                updateAllButtons();
            });

            handle.addEventListener('keydown', e => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home') return;
                e.preventDefault();

                if (e.key === 'Home') {
                    clearCenterWidth();
                    applyLayout();
                    updateAllButtons();
                    return;
                }

                const current = calculateLayout().baseCenter;
                const step = e.shiftKey ? RESIZE_STEP_PX * 5 : RESIZE_STEP_PX;
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const { min, maxWithoutLeft } = getCenterBounds();
                const nextCenter = clamp(current + (direction * step), min, maxWithoutLeft);

                saveCenterWidth(nextCenter);
                applyLayout();
                updateAllButtons();
            });

            center.appendChild(handle);
            updateHandleUI();
        }

        window.addEventListener('resize', () => {
            if (isActive()) applyLayout();
        });

        function createToggleButton() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum';
            btn.innerHTML = `<span class="fas fa-expand-arrows-alt fa-fw"></span> Széles nézet`;

            function updateUI() {
                const active = isActive();
                btn.title = active
                    ? 'Széles nézet kikapcsolása'
                    : 'Széles nézet bekapcsolása – a szélesség húzással állítható';
                btn.classList.toggle('btn-primary', active);
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

    // A Thread nézet és a lapos Modern nézet ugyanazt a kártya-CSS-t használja.
    // A válaszfa vonalai, behúzásai és a rendezés kizárólag a Thread modulban vannak.
    function injectPostCardStyles() {
        injectStyleOnce('ph-pt-thread-card-style', `
            ul:is(.ph-tv-active, .ph-mv-active) {
                box-sizing: border-box;
                width: 100%;
                min-width: 0;
                max-width: 100%;
                margin-inline: 0 !important;
                padding: 0 !important;
                list-style: none !important;
                --ph-tv-card-edge: color-mix(in srgb, var(--ph-ui-muted) 28%, transparent);
                --ph-tv-card-head: color-mix(in srgb, var(--ph-ui-bg) 91%, var(--ph-ui-muted) 9%);
                --ph-tv-card-body: color-mix(in srgb, var(--ph-ui-bg) 55%, #b4aa81 45%);
            }
            body[data-theme="dark"] ul:is(.ph-tv-active, .ph-mv-active) {
                --ph-tv-card-head: color-mix(in srgb, var(--ph-ui-bg) 94%, var(--ph-ui-muted) 6%);
                --ph-tv-card-body: color-mix(in srgb, var(--ph-ui-bg) 90%, #a3977a 10%);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) {
                width: 100%;
                max-width: 100%;
                min-width: 0;
                list-style: none !important;
                margin-bottom: 9px !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > :is(.message, .message-off) {
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                border: 1px solid var(--ph-tv-card-edge);
                border-radius: 11px;
                background: var(--ph-ui-bg);
                box-shadow: 0 2px 9px rgba(0, 0, 0, .05);
                overflow: visible; /* A fórum hárompontos menüje ne vágódjon le. */
                container: ph-tv-card / inline-size;
            }
            /* A felhasználó-rejtés a .message max-height-ját 0-ra állítja.
               A kártya overflow:visible értéke különben felülírja a
               .ph-collapsible[data-collapsed] overflow:hidden szabályát, ezért
               a "rejtett" tartalom átlóg a következő válaszkártyára. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message.ph-collapsible[data-collapsed="true"] {
                max-height: 0 !important;
                overflow: hidden !important;
                border-width: 0 !important;
                box-shadow: none !important;
                pointer-events: none !important;
            }
            /* A saját, kattintható rejtéssáv azonos behúzással és szélességgel
               jelenjen meg, mint a Thread nézet többi kártyája. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .hidden-bar {
                position: relative;
                z-index: 3;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                width: 100%;
                min-width: 0;
                min-height: 35px;
                margin: 0;
                padding: 7px 10px;
                border: 1px solid var(--ph-tv-card-edge);
                border-radius: 10px;
                background: color-mix(in srgb, var(--ph-ui-fg) 85%, var(--ph-ui-bg)) !important;
                color: var(--ph-ui-bg) !important;
                font-size: 12px;
                font-weight: 600;
                line-height: 1.25;
                text-align: center;
                overflow-wrap: anywhere;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .hidden-bar:hover {
                background: color-mix(in srgb, var(--ph-ui-fg) 72%, var(--ph-ui-bg)) !important;
            }
            /* A fórum az AJAX-os válaszszerkesztőt külön LI-ként beszúrja az UL-be.
               Ez nem "ph-thread", ezért külön igazítjuk a célhozzászólás gyermekének
               behúzásához. A bal oldali válaszág-sín így nem megy át a szerkesztőn. */
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) {
                position: relative;
                box-sizing: border-box;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0;
                margin: 0 0 9px !important;
                padding: 0 0 0 var(--ph-tv-editor-indent, 26px) !important;
                list-style: none !important;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message {
                display: flex !important;
                flex-direction: column !important;
                gap: 0 !important;
                box-sizing: border-box;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 1px solid var(--ph-tv-card-edge);
                border-radius: 11px;
                background: var(--ph-ui-bg);
                overflow: visible; /* A szerkesztő felugró eszközei nem vághatók le. */
            }
            /* A szerkesztő is egysoros, kéthasábos fejlécet kap:
               szerző balra, Válasz/Új felirat jobbra, a poszt dátumához hasonlóan. */
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-head {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) max-content !important;
                grid-template-rows: auto !important;
                align-items: center !important;
                align-content: center !important;
                justify-content: stretch !important;
                gap: 0 10px !important;
                box-sizing: border-box;
                width: 100% !important;
                min-height: 0 !important;
                height: auto !important;
                margin: 0 !important;
                padding: 6px 10px !important;
                border-radius: 10px 10px 0 0;
                background: var(--ph-tv-card-head);
                border-bottom: 1px solid var(--ph-tv-card-edge);
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-head > .message-head-infos {
                grid-column: 2;
                grid-row: 1;
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: flex-end !important;
                justify-self: end !important;
                align-self: center !important;
                flex: none !important;
                position: static !important;
                float: none !important;
                box-sizing: border-box;
                width: auto !important;
                max-width: 100% !important;
                min-width: 0 !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
                text-align: right !important;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head > .message-head-infos > .message-reply {
                display: none !important;
            }
            /* Asztali kompakt forummod: az "Uj" es "Valasz" jelzes egyarant
               felkover; a mobilmod es a tobbi fejlecelem nem valtozik. */
            @media (min-width: 992px) {
                body ul:is(.ph-tv-active, .ph-mv-active) > li.msg-editor > .message > .message-head > .message-head-infos > span.message-id {
                    font-weight: 700 !important;
                }
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head > .message-head-user {
                grid-column: 1;
                grid-row: 1;
                display: flex !important;
                align-items: center !important;
                justify-self: stretch !important;
                align-self: center !important;
                flex: none !important;
                float: none !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                gap: 7px;
            }
            /* A szerkesztő fejlécében ugyanaz a kompakt, kerek avatar legyen,
               mint a normál Modern/Thread hozzászólásoknál. Az IMG eredeti
               méretét is felül kell írni, nem elegendő az A méretezése. */
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head-user .user-face {
                display: inline-flex !important;
                flex: 0 0 34px !important;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                max-width: 34px !important;
                min-height: 34px !important;
                max-height: 34px !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden;
                border: 1px solid var(--ph-tv-card-edge);
                border-radius: 50%;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head-user .user-face img {
                display: block;
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                object-fit: cover;
                border-radius: 50%;
            }
            /* Szerkeszto: a nev/rang ugyanazzal a sorkozzel jelenjen meg,
               mint a normal hozzaszolasnal, a forum kompakt modjatol fuggetlenul. */
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head-user > .user-text {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                justify-content: center !important;
                gap: 3px !important;
                min-width: 0;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head-user > .user-text > .user-title {
                display: block !important;
                flex: none !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
                color: var(--ph-ui-fg);
                font-weight: 700;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head-user > .user-text > .user-class {
                display: block !important;
                flex: none !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
                color: var(--ph-ui-muted);
                font-size: 12px !important;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-body,
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-body-main,
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .msg-editor-wrapper {
                box-sizing: border-box;
                min-width: 0;
                max-width: 100%;
            }
            /* Mindket forummodban ugyanaz az eredeti valaszcimzett-elem
               jelenjen meg a szerkeszto modlinkjeivel EGY sorban. Csak a
               valasz-szerkesztoket erinti; uj hsz-nel nincs felesleges cimzett. */
            body ul:is(.ph-tv-active, .ph-mv-active) > li.msg-editor > .message > .message-body > .message-body-main > .message-body-infos:has(> .message-reply) {
                display: flex !important;
                visibility: visible !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: wrap !important;
                gap: 4px 10px !important;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                height: auto !important;
                margin: 0 0 6px !important;
                padding: 0 !important;
            }
            body ul:is(.ph-tv-active, .ph-mv-active) > li.msg-editor > .message > .message-body > .message-body-main > .message-body-infos:has(> .message-reply) > .modlinks {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                flex: 0 0 auto !important;
                gap: 5px !important;
                width: auto !important;
                max-width: 100% !important;
                min-width: 0 !important;
                margin: 0 0 0 auto !important;
                padding: 0 !important;
            }
            /* Uj hozzaszolas: a forum kompakt modjaban a modlinks jobbra
               zsugorodik. Mindket forummodban a cim balra, a szerkesztovaltas
               jobbra keruljon; a valaszszerkeszto sorat ne erintse. */
            body ul:is(.ph-tv-active, .ph-mv-active) > li.msg-editor > .message > .message-body > .message-body-main > .message-body-infos:not(:has(> .message-reply)) {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 0 6px !important;
                padding: 0 !important;
                text-align: left !important;
            }
            body ul:is(.ph-tv-active, .ph-mv-active) > li.msg-editor > .message > .message-body > .message-body-main > .message-body-infos:not(:has(> .message-reply)) > .modlinks {
                display: flex !important;
                flex: 1 1 100% !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 5px !important;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                text-align: left !important;
            }
            body ul:is(.ph-tv-active, .ph-mv-active) > li.msg-editor > .message > .message-body > .message-body-main > .message-body-infos:not(:has(> .message-reply)) > .modlinks > [data-rtif-legacy] {
                margin-left: auto !important;
            }
            /* A fehér csíkokat az editor régi margói és az eredeti kártya
               térközei okozták. Az űrlap körüli hely a bézs törzsön BELÜL van,
               így a fejléc alatt és a kártya alján sem marad fehér sáv. */
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-body {
                display: flow-root !important;
                flex: 1 1 auto !important;
                float: none !important;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 0 10px 10px !important;
                background-clip: padding-box;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-body > .message-body-user {
                display: none !important;
            }
            :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-body > .message-body-main {
                display: block !important;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: .5rem .5rem .75rem !important;
                flex: none !important;
                float: none !important;
            }
            @media (max-width: 640px) {
                :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) > .message > .message-head {
                    padding: 6px 8px !important;
                }
                :is(ul.ph-tv-active > li.msg-editor.ph-tv-inline-editor, ul.ph-mv-active > li.msg-editor) .message-head-user .user-face {
                    flex-basis: 29px !important;
                    min-width: 29px !important;
                    max-width: 29px !important;
                    width: 29px !important;
                    min-height: 29px !important;
                    max-height: 29px !important;
                    height: 29px !important;
                }
            }
            /* Egységes KÉTSOROS fejléc valamennyi képernyőméreten.
               A korábbi flex-wrap a három fejlécblokkot széles kijelzőn is
               szétdobhatta, ami jelentős üres függőleges helyet okozott. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-head {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) minmax(0, max-content) !important;
                grid-template-rows: auto auto !important;
                grid-template-areas: 'author info' 'actions actions' !important;
                align-items: center !important;
                align-content: start !important;
                justify-content: stretch !important;
                gap: 3px 9px !important;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 7px 11px 6px !important;
                border: 0;
                border-bottom: 1px solid var(--ph-tv-card-edge);
                border-radius: 10px 10px 0 0;
                color: var(--ph-ui-fg);
                background: var(--ph-tv-card-head);
                overflow: visible;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head > .message-head-user {
                grid-area: author;
                display: flex !important;
                position: static !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 8px !important;
                float: none !important;
                flex: initial !important;
                justify-self: stretch;
                align-self: center;
                box-sizing: border-box;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user .user-face {
                display: inline-flex !important;
                flex: 0 0 34px !important;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                max-width: 34px !important;
                min-height: 34px !important;
                max-height: 34px !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden;
                border: 1px solid var(--ph-tv-card-edge);
                border-radius: 50%;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user .user-face img {
                display: block;
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                object-fit: cover;
                border-radius: 50%;
            }
            /* A nev es a rang mindket forummodban egymas alatt legyen.
               A forum kompakt modja alapbol egy sorba tenne oket. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user > .user-text {
                display: flex !important;
                flex: 1 1 auto !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                justify-content: center !important;
                gap: 3px !important;
                min-width: 0 !important;
                max-width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user > .user-text > .user-class {
                display: block !important;
                flex: none !important;
                width: auto !important;
                max-width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                color: var(--ph-ui-muted) !important;
                font-size: 12px !important;
                line-height: 1.25 !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user .user-title {
                display: flex !important;
                flex: 0 1 auto !important;
                flex-wrap: wrap;
                align-items: baseline;
                gap: 1px 6px;
                min-width: 0;
                max-width: 100%;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user .user-link {
                display: inline-block;
                min-width: 0;
                max-width: 100%;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                color: var(--ph-ui-fg) !important;
                font-weight: 700;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-user .user-title > :not(.user-link) {
                color: var(--ph-ui-muted);
            }
            /* Szám FELÜL, dátum ALATTA; közös, jobbra igazított oszlop. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head > .message-head-infos {
                grid-area: info;
                display: flex !important;
                position: static !important;
                flex: initial !important;
                flex-direction: column !important;
                flex-wrap: nowrap !important;
                align-items: flex-end !important;
                justify-content: center !important;
                justify-self: end !important;
                align-self: center !important;
                gap: 1px !important;
                box-sizing: border-box;
                float: none !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
                color: var(--ph-ui-muted);
                font-size: 12px;
                line-height: 1.25 !important;
                text-align: right !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-infos > :not(.message-reply) {
                position: static !important;
                display: block !important;
                flex: none !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                text-align: right !important;
                line-height: inherit !important;
                overflow-wrap: anywhere;
            }
            /* Egyetlen válasz-címzett szerepeljen a kártyán. A fórum normál
               elrendezésében a törzsbeli .message-body-infos alapból rejtett,
               ezért a fejlécbeli válasz elrejtése önmagában eltüntetné az
               információt. Modern és Thread nézetben mindig a szöveg ELŐTT
               lévő eredeti, kattintható válaszblokk látszódjon. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head > .message-head-infos > .message-reply {
                display: none !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-body > .message-body-main > .message-body-infos:has(> .message-reply) {
                display: block !important;
                visibility: visible !important;
                position: static !important;
                width: auto !important;
                max-width: 100%;
                height: auto !important;
                margin: 0 0 8px !important;
                padding: 0 !important;
                color: var(--ph-ui-muted);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body-infos > .message-reply {
                display: inline-flex !important;
                visibility: visible !important;
                align-items: center;
                flex-wrap: wrap;
                gap: 3px 5px;
                max-width: 100%;
                line-height: 1.4;
            }
            /* Kozos valaszelozmeny-cimke: normal es kompakt forummodban,
               szerkesztoben es meglevo hozzaszolasnal is ugyanaz a kinezet.
               Csak a Modern / Thread kartyakon beluli valaszblokkot erinti. */
            body ul:is(.ph-tv-active, .ph-mv-active) > li:is(.msg-editor, .ph-thread, [data-id], .message-featured) > :is(.message, .message-off) > .message-body > .message-body-main > .message-body-infos > .message-reply {
                display: inline-flex !important;
                visibility: visible !important;
                align-items: center !important;
                justify-content: flex-start !important;
                flex: 0 1 auto !important;
                flex-direction: row !important;
                flex-wrap: nowrap !important;
                gap: 5px !important;
                box-sizing: border-box;
                width: max-content;
                max-width: 100% !important;
                min-width: 0 !important;
                min-height: 24px !important;
                margin: 0 !important;
                padding: 2px 6px !important;
                border: 0 !important;
                border-radius: 6px !important;
                background: color-mix(in srgb, var(--ph-ui-bg) 72%, transparent) !important;
                box-shadow: none !important;
                color: var(--ph-ui-fg) !important;
                line-height: 1.35 !important;
                white-space: nowrap;
                vertical-align: middle;
            }
            body ul:is(.ph-tv-active, .ph-mv-active) > li:is(.msg-editor, .ph-thread, [data-id], .message-featured) > :is(.message, .message-off) > .message-body > .message-body-main > .message-body-infos > .message-reply > :is(.message-id, .user-title) {
                display: inline-flex !important;
                align-items: center !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                line-height: 1.35 !important;
            }
            body ul:is(.ph-tv-active, .ph-mv-active) > li:is(.msg-editor, .ph-thread, [data-id], .message-featured) > :is(.message, .message-off) > .message-body > .message-body-main > .message-body-infos > .message-reply > .user-face {
                display: inline-flex !important;
                flex: 0 0 20px !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box;
                width: 20px !important;
                height: 20px !important;
                min-width: 20px !important;
                max-width: 20px !important;
                min-height: 20px !important;
                max-height: 20px !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
            }
            body ul:is(.ph-tv-active, .ph-mv-active) > li:is(.msg-editor, .ph-thread, [data-id], .message-featured) > :is(.message, .message-off) > .message-body > .message-body-main > .message-body-infos > .message-reply > .user-face img {
                display: block !important;
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                object-fit: contain !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body-infos > .message-reply > .user-face {
                display: inline-flex !important;
                flex: 0 0 20px;
                width: 20px;
                height: 20px;
                align-items: center;
                justify-content: center;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body-infos > .message-reply > .user-face img {
                display: block;
                width: 100% !important;
                height: 100% !important;
                max-width: 100%;
                object-fit: contain;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-infos > .message-id {
                order: -1 !important;
                color: var(--ph-ui-fg) !important;
                font-weight: 650;
            }
            /* Gombsor: kizárólag a fejléc második sora. Több gombnál törik,
               de a gombok nem préselődnek össze és nem lógnak túl. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head > .message-head-btns {
                grid-area: actions;
                display: flex !important;
                position: relative !important;
                flex: initial !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                justify-content: flex-start !important;
                align-content: center;
                gap: 2px 3px !important;
                box-sizing: border-box;
                float: none !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 3px 0 0 !important;
                border-top: 1px solid var(--ph-ui-border);
                white-space: normal !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-btns > :is(a, button, .dropdown, .btn-group) {
                flex: 0 0 auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-btns :is(a.message-btn, button.message-btn),
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-btns > :is(a, button) {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                gap: 4px;
                box-sizing: border-box;
                min-height: 25px !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 2px 6px !important;
                border: 1px solid transparent !important;
                border-radius: 6px;
                background: transparent !important;
                color: var(--ph-ui-fg) !important;
                font-size: 12px;
                font-weight: 600;
                line-height: 1.25;
                text-decoration: none !important;
                white-space: normal !important;
                overflow-wrap: anywhere;
                cursor: pointer;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-btns :is(a.message-btn, button.message-btn):is(:hover, :focus-visible),
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-head-btns > :is(a, button):is(:hover, :focus-visible) {
                background: var(--ph-ui-hover) !important;
                border-color: var(--ph-ui-border) !important;
                color: var(--ph-ui-accent-ink) !important;
                outline-offset: 2px;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-body {
                box-sizing: border-box;
                width: 100%;
                min-width: 0;
                max-width: 100%;
                margin: 0 !important;
                border-radius: 0 0 10px 10px;
                color: var(--ph-ui-fg);
                line-height: 1.5;
                overflow-wrap: anywhere;
            }
            /* A fórum 992px felett a kompakt nézetben nagyobb oldalsó margót ad.
               Mindkét kártyás nézetben minden képernyőszélességnél egységes értéket használunk. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message .message-body-main {
                margin: .5rem .5rem 1rem;
            }
            /* Normál fórumelrendezésben a szerző avatárja, neve és rangja a
               fejlécben és a hozzászólás mellett is szerepel. A kártyás
               Modern ÉS Thread nézetben csak a fejlécben jelenjenek meg. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-body > .message-body-user {
                display: none !important;
            }
            /* A törzs foglalja el a megszűnő profil-oszlop helyét is. A
               szerzői adatok a DOM-ban maradnak: nézetváltáskor visszaállnak. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-body {
                display: block !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-body > .message-body-main {
                display: block;
                box-sizing: border-box;
                width: auto !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: .5rem .5rem 1rem !important;
                flex: none !important;
                float: none !important;
            }
            /* A felhasználó saját színei és a #msg-kiemelés elsőbbséget élveznek. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) > .message > .message-body:not(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author,
                .ph-pt-focus-reply, .hash-highlight
            ) {
                background-color: var(--ph-tv-card-body) !important;
            }
            /* Modern/Thread: a szovegtorzs hattere ugyanaz a teljes palettaszin,
               amelyet az eredeti alap forumnezet colorize szabalyai hasznalnak.
               A fejlec es szegely ebbol szarmazik, a klasszikus CSS erintetlen. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize.ph-pt-akcio) {
                --ph-pt-card-mark: var(--ph-pt-akcio);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize.ph-pt-own) {
                --ph-pt-card-mark: var(--ph-pt-own);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize.ph-pt-reply) {
                --ph-pt-card-mark: var(--ph-pt-reply);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize.ph-pt-focus-author) {
                --ph-pt-card-mark: var(--ph-pt-focus-author);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize.ph-pt-focus-reply) {
                --ph-pt-card-mark: var(--ph-pt-focus-reply);
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            )) {
                --ph-pt-card-edge: color-mix(in srgb, var(--ph-pt-card-mark) 75%, var(--ph-ui-fg));
                border-color: color-mix(in srgb, var(--ph-pt-card-edge) 82%, var(--ph-tv-card-edge)) !important;
                border-left: 4px solid var(--ph-pt-card-edge) !important;
                background: var(--ph-pt-card-mark) !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message:has(> .message-body.ph-pt-colorize:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            )) > .message-head:not(.hash-highlight) {
                background: color-mix(in srgb, var(--ph-pt-card-mark) 62%, var(--ph-tv-card-head)) !important;
            }
            /* Csak a ket kartyas nezetben tartjuk a torzset az alap forum
               eredeti, keveretlen szinevel. A #msg-kiemeles megelozi a fejlecszint. */
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured):not(.msg-editor) > .message > .message-body.ph-pt-colorize:is(
                .ph-pt-akcio, .ph-pt-own, .ph-pt-reply, .ph-pt-focus-author, .ph-pt-focus-reply
            ) {
                background-color: var(--ph-pt-card-mark) !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-content,
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-content-replied {
                min-width: 0;
                max-width: 100%;
                overflow-wrap: anywhere;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-content-replied {
                margin-bottom: 9px;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body img,
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body video,
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body iframe {
                max-width: 100% !important;
            }
            ul:is(.ph-tv-active, .ph-mv-active) > li:is(.ph-thread, [data-id], .message-featured) .message-body :is(pre, table) {
                max-width: 100%;
                overflow-x: auto;
            }
        `);
    }

    function threadView() {
        // A hozzászólások az eredeti UL közvetlen LI elemei maradnak.
        // A kapcsolatok egyetlen, pozíciók alapján rajzolt SVG-rétegen futnak:
        // így a hozzászólások közti margó/padding sem szakíthatja meg a vonalakat.
        const STORAGE_KEY = KEYS.STATE.THREAD_VIEW;
        const STATUS = { ON: 'enabled', OFF: 'disabled' };
        const FOLD_KEY = 'ph_pt_thread_fold_v1:' + location.host + location.pathname + location.search;
        const mobileQuery = window.matchMedia('(max-width: 640px)');
        const SVG_NS = 'http://www.w3.org/2000/svg';

        let ul = null;
        let svg = null;
        let threadActive = false;
        let originalOrder = [];
        let entries = [];
        let postMap = new Map();
        let parentMap = new Map();
        let updateTimer = null;
        let drawFrame = null;
        let hoveredBranch = null;
        let sizeObserver = null;
        let lastListWidth = 0;
        let connectorSignature = null;
        const controls = [];
        const collapsedIds = new Set();
        // A gyakran használt indexek és SVG-elemek csak faújraépítéskor változnak.
        const entryIndexById = new Map();
        const depthById = new Map();
        const indentCache = new Map();
        const connectorCache = new Map();
        let highlightedIds = new Set();

        // A böngészőfülön belül a korábbi összehajtások megmaradnak.
        try {
            const saved = JSON.parse(sessionStorage.getItem(FOLD_KEY) || '[]');
            if (Array.isArray(saved)) {
                for (const id of saved) {
                    if (/^\d+$/.test(String(id))) collapsedIds.add(String(id));
                }
            }
        } catch (error) {
            console.warn('[PH Power Tools] Thread-állapot beolvasása sikertelen:', error);
        }

        injectStyleOnce('ph-pt-thread-view-style', `
            ul.ph-tv-active {
                position: relative !important;
                --ph-tv-line: color-mix(in srgb, var(--ph-ui-muted, #818995) 51%, transparent);
                --ph-tv-line-hover: var(--ph-ui-accent-ink, #477baa);
                --ph-tv-surface: var(--ph-ui-bg, #fff);
                --ph-tv-text: var(--ph-ui-fg, #252525);
                --ph-tv-muted: var(--ph-ui-muted, #74777b);
            }
            ul.ph-tv-active > li.ph-thread {
                position: relative !important;
                box-sizing: border-box;
                min-width: 0;
                margin-left: 0 !important;
                padding-left: var(--ph-tv-indent, 26px) !important;
            }
            /* A vonalakat nem daraboljuk hozzászólásonként: az SVG az egész UL-t lefedi. */
            ul.ph-tv-active > .ph-tv-connections {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                overflow: visible;
                pointer-events: none;
                z-index: 2;
            }
            .ph-tv-connections .ph-tv-path {
                fill: none;
                stroke: var(--ph-tv-line);
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
                pointer-events: none;
                transition: stroke 140ms ease, stroke-width 140ms ease;
            }
            .ph-tv-connections .ph-tv-path-hit {
                fill: none;
                stroke: transparent;
                stroke-width: 16;
                stroke-linecap: round;
                stroke-linejoin: round;
                pointer-events: stroke;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }
            /* Chromium az SVG kattinthato, attetszo hit-pathjara kulon fokuszkeretet
               rajzol. Ez a vastag kek kontur nem a Reddit-szeru agkiemeles resze. */
            .ph-tv-connections .ph-tv-path-hit:focus,
            .ph-tv-connections .ph-tv-path-hit:focus-visible {
                outline: none !important;
            }
            .ph-tv-connections .ph-tv-branch.is-highlighted > .ph-tv-path {
                stroke: var(--ph-tv-line-hover);
                stroke-width: 3;
            }
            ul.ph-tv-active > li.ph-thread > .ph-tv-collapse {
                position: absolute;
                z-index: 5;
                top: 10px;
                left: calc(var(--ph-tv-rail-x, 13px) - 9px);
                width: 18px;
                height: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--ph-tv-line);
                border-radius: 50%;
                background: var(--ph-tv-surface);
                color: var(--ph-tv-muted);
                font-size: 16px;
                font-family: Arial, sans-serif;
                line-height: 1;
                padding: 0;
                cursor: pointer;
                transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
            }
            ul.ph-tv-active > li.ph-thread > .ph-tv-collapse:hover,
            ul.ph-tv-active > li.ph-thread > .ph-tv-collapse:focus-visible,
            ul.ph-tv-active > li.ph-thread.ph-tv-branch-hover > .ph-tv-collapse {
                border-color: var(--ph-tv-line-hover);
                background: color-mix(in srgb, var(--ph-tv-line-hover) 12%, var(--ph-tv-surface));
                color: var(--ph-tv-line-hover);
                outline-offset: 2px;
            }
            /* Összecsukáskor a +/- kapcsoló is látható marad, és az SVG ehhez köt. */
            ul.ph-tv-active > li.ph-tv-collapsed > :not(.ph-tv-collapse):not(.ph-tv-summary) {
                display: none !important;
            }
            ul.ph-tv-active > li.ph-thread > .ph-tv-summary {
                display: none;
                width: 100%;
                min-width: 0;
                align-items: center;
                gap: 7px;
                min-height: 38px;
                margin: 1px 0 5px;
                padding: 7px 11px;
                box-sizing: border-box;
                text-align: left;
                border: 1px solid var(--ph-tv-line);
                border-radius: 9px;
                background: color-mix(in srgb, var(--ph-tv-text) 5%, var(--ph-tv-surface));
                color: var(--ph-tv-text);
                cursor: pointer;
            }
            ul.ph-tv-active > li.ph-thread.ph-tv-collapsed > .ph-tv-summary {
                display: flex;
            }
            ul.ph-tv-active > li.ph-thread > .ph-tv-summary:hover,
            ul.ph-tv-active > li.ph-thread > .ph-tv-summary:focus-visible {
                border-color: var(--ph-tv-line-hover);
                background: color-mix(in srgb, var(--ph-tv-line-hover) 10%, var(--ph-tv-surface));
                outline-offset: 2px;
            }
            .ph-tv-summary-icon {
                flex: 0 0 auto;
                width: 19px;
                height: 19px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: color-mix(in srgb, var(--ph-tv-line-hover) 15%, var(--ph-tv-surface));
                color: var(--ph-tv-line-hover);
                font-size: 15px;
                font-weight: 700;
            }
            .ph-tv-summary-author {
                font-size: 12px;
                font-weight: 700;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            .ph-tv-summary-meta {
                min-width: 0;
                font-size: 11px;
                color: var(--ph-tv-muted);
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            ul.ph-tv-active > li.ph-tv-branch-hidden {
                display: none !important;
            }
            /* An OFF-hidden message must not leave a +/- button or an empty LI. */
            ul.ph-tv-active > li.ph-tv-off-hidden {
                display: none !important;
            }
            /* Az összes művelet a Thread nézet osztott gombjának menüjében van. */
            .ph-tv-control {
                position: relative;
                display: inline-flex;
                align-items: stretch;
                vertical-align: middle;
            }
            .ph-tv-control > .ph-tv-toggle {
                margin-left: 0 !important;
            }
            .ph-tv-control.ph-tv-enabled > .ph-tv-toggle {
                border-top-right-radius: 0 !important;
                border-bottom-right-radius: 0 !important;
            }
            .ph-tv-control > .ph-tv-menu-trigger {
                min-width: 26px;
                margin-left: -1px;
                padding: 0 7px;
                border-top-left-radius: 0 !important;
                border-bottom-left-radius: 0 !important;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }
            .ph-tv-control > .ph-tv-menu-trigger[hidden],
            .ph-tv-menu[hidden] { display: none !important; }
            .ph-tv-menu {
                position: absolute;
                z-index: 1000;
                top: calc(100% + 5px);
                right: 0;
                min-width: 180px;
                padding: 5px;
                box-sizing: border-box;
                border: 1px solid var(--ph-ui-border, #ccc);
                border-radius: 9px;
                background: var(--ph-ui-bg, #fff);
                color: var(--ph-ui-fg, #222);
                box-shadow: var(--ph-ui-shadow, 0 5px 18px rgba(0,0,0,.18));
            }
            .ph-tv-menu .ph-tv-menu-item {
                display: flex;
                align-items: center;
                gap: 9px;
                width: 100%;
                min-height: 32px;
                padding: 7px 9px;
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: inherit;
                font: inherit;
                font-size: 12px;
                text-align: left;
                white-space: nowrap;
                cursor: pointer;
            }
            .ph-tv-menu .ph-tv-menu-item:hover,
            .ph-tv-menu .ph-tv-menu-item:focus-visible {
                background: var(--ph-ui-hover, rgba(127,127,127,.12));
                color: var(--ph-ui-accent-ink, #477baa);
                outline-offset: -2px;
            }
            .ph-tv-menu .ph-tv-menu-item + .ph-tv-menu-item {
                margin-top: 2px;
            }
            @media (max-width: 640px) {
                ul.ph-tv-active > li.ph-thread > .ph-tv-summary { min-height: 34px; padding: 6px 7px; }
            }
            @media (prefers-reduced-motion: reduce) {
                .ph-tv-connections .ph-tv-path,
                ul.ph-tv-active > li.ph-thread > .ph-tv-collapse { transition: none !important; }
            }
        `);

        injectPostCardStyles();

        function saveEnabled(active) {
            storage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
        }

        function saveFolds() {
            try {
                sessionStorage.setItem(FOLD_KEY, JSON.stringify([...collapsedIds]));
            } catch (error) {
                console.warn('[PH Power Tools] Thread-állapot mentése sikertelen:', error);
            }
        }

        function getMessageList(header) {
            let list = header?.nextElementSibling;
            while (list && !(list.tagName === 'UL' && list.classList.length === 0)) {
                list = list.nextElementSibling;
            }
            return list;
        }

        function getPostsInDom() {
            return ul ? [...ul.children].filter(el => el.matches('li[data-id]') && el.dataset.id) : [];
        }

        // Az UL más gyermekei a helyükön maradnak (reklám, lapozó stb.).
        function reorder(posts) {
            const current = getPostsInDom();
            if (current.length !== posts.length) return;
            if (current.every((li, i) => li === posts[i])) return;
            const slots = current.map(li => {
                const slot = document.createComment('ph-thread-position');
                li.replaceWith(slot);
                return slot;
            });
            slots.forEach((slot, i) => slot.replaceWith(posts[i]));
        }

        function getAuthor(li) {
            return li.querySelector(
                '.message-head-user .user-title .user-link, ' +
                '.message-head-user .user-link, ' +
                '.message-body-user .user-title .user-link'
            )?.textContent?.trim() || `#${li.dataset.id}`;
        }

        function makeButton(className, label, callback) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = className;
            btn.setAttribute('aria-label', label);
            btn.title = label;
            btn.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                callback();
            });
            return btn;
        }

        // A mélységi sorrendben egy ág összes eleme összefüggő tartomány.
        // A pozíció és a leszármazottak száma alapján nincs teljes lista-keresés.
        function branchIds(rootId) {
            const start = entryIndexById.get(rootId);
            if (start === undefined) return [];
            const ids = [];
            const end = start + entries[start].descendants + 1;
            for (let i = start; i < end; i++) ids.push(entries[i].id);
            return ids;
        }

        function setHoveredBranch(id) {
            if (hoveredBranch === id) return;
            const selected = id ? new Set(branchIds(id)) : new Set();
            // Csak az előző és az új ág eltérő elemeihez nyúlunk, nem az
            // oldal összes hozzászólásához és az összes SVG-vonalhoz.
            for (const oldId of highlightedIds) {
                if (selected.has(oldId)) continue;
                postMap.get(oldId)?.classList.remove('ph-tv-branch-hover');
                connectorCache.get(oldId)?.group.classList.remove('is-highlighted');
            }
            for (const newId of selected) {
                if (highlightedIds.has(newId)) continue;
                postMap.get(newId)?.classList.add('ph-tv-branch-hover');
                connectorCache.get(newId)?.group.classList.add('is-highlighted');
            }
            hoveredBranch = id;
            highlightedIds = selected;
        }

        function toggleFold(id) {
            if (!threadActive || !postMap.has(id)) return;
            setHoveredBranch(null);
            if (collapsedIds.has(id)) collapsedIds.delete(id);
            else collapsedIds.add(id);
            applyFolds();
            saveFolds();
        }

        function createPostControls(li, id) {
            const collapse = makeButton('ph-tv-collapse', 'Hozzászólás és válaszág összecsukása', () => toggleFold(id));
            collapse.textContent = '−';
            collapse.addEventListener('mouseenter', () => setHoveredBranch(id));
            collapse.addEventListener('mouseleave', () => setHoveredBranch(null));
            // Egeres kattintas utan ne ragadjon be a fokusz miatti agakijeloles.
            // Billentyuzetes fokusznal az agak vizualis visszajelzese megmarad.
            collapse.addEventListener('focus', () => {
                if (collapse.matches(':focus-visible')) setHoveredBranch(id);
            });
            collapse.addEventListener('blur', () => setHoveredBranch(null));

            const summary = makeButton('ph-tv-summary', 'Hozzászólás kibontása', () => toggleFold(id));
            summary.setAttribute('aria-expanded', 'false');
            const icon = document.createElement('span');
            icon.className = 'ph-tv-summary-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '+';
            const author = document.createElement('span');
            author.className = 'ph-tv-summary-author';
            author.textContent = getAuthor(li);
            const meta = document.createElement('span');
            meta.className = 'ph-tv-summary-meta';
            summary.append(icon, author, meta);
            li.append(collapse, summary);
        }

        // offHider hides the .message/.message-off element, not necessarily its LI.
        // Hide the entire row only while thread view is active, to avoid orphan
        // collapse buttons and connectors pointing at invisible OFF posts.
        function isOffPostHidden(li) {
            return li.classList.contains('off-post-hidden') ||
                !!li.querySelector('.message.off-post-hidden, .message-off.off-post-hidden');
        }

        function syncOffVisibility() {
            if (!threadActive) return;
            let changed = false;
            for (const entry of entries) {
                if (entry.li.classList.toggle('ph-tv-off-hidden', isOffPostHidden(entry.li))) {
                    changed = true;
                }
            }
            if (changed) setHoveredBranch(null);
            scheduleConnectorDraw();
        }

        function threadIndentForDepth(depth) {
            const isMobile = mobileQuery.matches;
            const visualDepth = Math.min(Math.max(0, depth), isMobile ? 5 : 11);
            if (indentCache.has(visualDepth)) return indentCache.get(visualDepth);
            // A szélességet egyetlen alkalommal mérjük ki faépítéskor/resize-nál:
            // a soronkénti CSS-írás után végzett clientWidth-olvasás reflow-t okozhat.
            const listWidth = lastListWidth || document.documentElement.clientWidth;
            const readableWidth = Math.min(310, Math.max(170, listWidth * .76));
            const maxIndent = Math.max(24, Math.floor(listWidth - readableWidth));
            const indent = Math.min(26 + visualDepth * (isMobile ? 16 : 22), maxIndent);
            indentCache.set(visualDepth, indent);
            return indent;
        }

        // Nem mozgathatjuk át az AJAX-os szerkesztőt: a fórum eseménykezelői
        // és TinyMCE-állapota a helyén marad. CSS-behúzással tesszük pontosan
        // a megválaszolt hozzászólás gyermekével egy szintre.
        function syncInlineEditors() {
            if (!threadActive || !ul) return;
            for (const editor of ul.querySelectorAll(':scope > li.msg-editor')) {
                const action = editor.querySelector('.msg-form')?.getAttribute('action') || '';
                const targetInAction = action.match(/[?&]rtoid=(\d+)(?:&|$)/)?.[1];
                const replyText = editor.querySelector('.message-head-infos > .message-reply .message-id')?.textContent || '';
                const targetId = targetInAction || replyText.match(/#(\d+)/)?.[1];
                const targetDepth = targetId ? depthById.get(targetId) : undefined;
                const depth = targetDepth === undefined ? 0 : targetDepth + 1;
                const indent = `${threadIndentForDepth(depth)}px`;
                editor.classList.add('ph-tv-inline-editor');
                if (editor.style.getPropertyValue('--ph-tv-editor-indent') !== indent) {
                    editor.style.setProperty('--ph-tv-editor-indent', indent);
                }
            }
        }

        function syncPostUi(entry) {
            const li = entry.li;
            li.classList.add('ph-thread');
            li.classList.toggle('ph-tv-off-hidden', isOffPostHidden(li));
            li.classList.toggle('ph-tv-has-children', entry.descendants > 0);
            // Egy adott LI vezérlőit csak egyszer keressük meg. AJAX-os
            // elemcsere esetén a rebuildTree új entry objektumokat készít.
            if (!entry.ui || entry.ui.button?.parentElement !== li) {
                if (!li.querySelector(':scope > .ph-tv-collapse')) createPostControls(li, entry.id);
                entry.ui = {
                    button: li.querySelector(':scope > .ph-tv-collapse'),
                    meta: li.querySelector(':scope > .ph-tv-summary .ph-tv-summary-meta'),
                    author: li.querySelector(':scope > .ph-tv-summary .ph-tv-summary-author')
                };
            }
            // A változatlan CSS-értékek és szövegek újbóli írása felesleges
            // DOM-módosításokat, megfigyelő-értesítéseket és újrarajzolást okoz.
            const indent = threadIndentForDepth(entry.depth);
            const indentValue = `${indent}px`;
            const railValue = `${indent - 13}px`;
            if (li.style.getPropertyValue('--ph-tv-indent') !== indentValue) {
                li.style.setProperty('--ph-tv-indent', indentValue);
            }
            if (li.style.getPropertyValue('--ph-tv-rail-x') !== railValue) {
                li.style.setProperty('--ph-tv-rail-x', railValue);
            }
            const metaText = entry.descendants > 0
                ? `#${entry.id} · ${entry.descendants} válasz elrejtve`
                : `#${entry.id} · hozzászólás elrejtve`;
            if (entry.ui.meta && entry.ui.meta.textContent !== metaText) {
                entry.ui.meta.textContent = metaText;
            }
            if (entry.ui.author) {
                const authorText = getAuthor(li);
                if (entry.ui.author.textContent !== authorText) entry.ui.author.textContent = authorText;
            }
        }

        function makeSvgNode(tag, attrs) {
            const element = document.createElementNS(SVG_NS, tag);
            for (const [key, value] of Object.entries(attrs || {})) {
                element.setAttribute(key, String(value));
            }
            return element;
        }

        function syncResponsiveWidth(force = false) {
            if (!threadActive || !ul) return;
            const currentWidth = ul.clientWidth;
            if (force || currentWidth !== lastListWidth) {
                lastListWidth = currentWidth;
                indentCache.clear();
                entries.forEach(syncPostUi);
            }
            scheduleConnectorDraw();
        }

        function scheduleConnectorDraw() {
            if (!threadActive || !svg || drawFrame !== null) return;
            drawFrame = requestAnimationFrame(() => {
                drawFrame = null;
                drawConnectors();
            });
        }

        // Az űrlap az UL külön LI-gyermeke. A teljes szerkesztőkártyát
        // vesszük figyelembe, nem csupán a belső contenteditable mezőt:
        // így az avatar/fejléc és a gombsáv sem kerül ágvonal alá.
        function getEditorOcclusions(offsetX, offsetY, width, height) {
            const areas = [];
            const editors = new Set();
            // Az összes lehetséges szerkesztő egyetlen DOM-keresésből jön.
            // A közvetlen LI-szerkesztő mellett az AJAX-os beágyazott is számít.
            for (const editor of ul.querySelectorAll(':scope > li.msg-editor > .message, .msg-editor-wrapper')) {
                if (!editor.matches('.msg-editor-wrapper') || !editor.closest('li.msg-editor')) {
                    editors.add(editor);
                }
            }
            for (const editor of editors) {
                const rect = editor.getBoundingClientRect();
                if (rect.width < 24 || rect.height < 24) continue;
                // A szerkesztő ELŐTTI, bal oldali ágakat nem takarjuk el.
                // A 4px ráhagyás az avatar/border széleit is védi.
                const x1 = Math.max(0, rect.left - offsetX - 4);
                const y1 = Math.max(0, rect.top - offsetY - 4);
                const x2 = Math.min(width, rect.right - offsetX + 4);
                const y2 = Math.min(height, rect.bottom - offsetY + 4);
                if (x2 > x1 && y2 > y1) {
                    areas.push({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
                }
            }
            return areas;
        }

        function drawConnectors() {
            if (!threadActive || !svg || !ul) return;
            // Ekkorra a dinamikusan beszúrt űrlap a válasza mélységéhez
            // igazodik; a méreteket már az új elrendezésben mérjük.
            syncInlineEditors();
            const listRect = ul.getBoundingClientRect();
            const width = Math.max(1, ul.clientWidth);
            const height = Math.max(1, ul.clientHeight);
            const viewBox = `0 0 ${width} ${height}`;
            if (svg.getAttribute('viewBox') !== viewBox) svg.setAttribute('viewBox', viewBox);
            const offsetX = listRect.left + ul.clientLeft;
            const offsetY = listRect.top + ul.clientTop;
            const points = new Map();
            const visible = new Set();

            for (const entry of entries) {
                if (entry.li.classList.contains('ph-tv-branch-hidden') ||
                    entry.li.classList.contains('ph-tv-off-hidden')) continue;
                const button = entry.ui?.button;
                if (!button) continue;
                const rect = button.getBoundingClientRect();
                if (!rect.width || !rect.height) continue;
                points.set(entry.id, {
                    x: rect.left + rect.width / 2 - offsetX,
                    y: rect.top + rect.height / 2 - offsetY,
                    radius: rect.width / 2
                });
                visible.add(entry.id);
            }

            // Egyetlen összefüggő, elágazó útvonal jut minden szülő hozzászólásnak.
            // A valós képernyőkoordináták miatt a margókon át is pontos az illesztés.
            const children = new Map();
            for (const entry of entries) {
                if (!visible.has(entry.id)) continue;
                const parentId = parentMap.get(entry.id);
                if (!parentId || !visible.has(parentId)) continue;
                if (!children.has(parentId)) children.set(parentId, []);
                children.get(parentId).push(entry.id);
            }

            const branches = [];
            for (const [parentId, childIds] of children) {
                const p = points.get(parentId);
                const childPoints = childIds.map(id => points.get(id)).filter(Boolean);
                if (!p || !childPoints.length) continue;
                const last = childPoints[childPoints.length - 1];
                const parts = [];
                const dx = last.x - p.x;
                const startY = p.y + p.radius;
                if (dx >= 10) {
                    // A törzs az utolsó gyermek kerekített könyökénél ér véget;
                    // az összes testvér ehhez a közös, megszakítás nélküli ághoz köt.
                    const endY = last.y - Math.min(10, dx / 2);
                    if (endY > startY) parts.push(`M ${p.x} ${startY} V ${endY}`);
                    for (const child of childPoints) {
                        const corner = Math.min(10, (child.x - p.x) / 2);
                        const endX = child.x - child.radius + 0.7;
                        parts.push(`M ${p.x} ${child.y - corner} Q ${p.x} ${child.y} ` +
                            `${p.x + corner} ${child.y} H ${endX}`);
                    }
                } else {
                    // Maximális behúzásnál a gyermekek X-koordinátája megegyezik
                    // a szülőével. A körgombokat ekkor nem szeli át a törzsvonal.
                    let nextStart = startY;
                    for (const child of childPoints) {
                        const stop = child.y - child.radius;
                        if (stop > nextStart) parts.push(`M ${p.x} ${nextStart} V ${stop}`);
                        nextStart = child.y + child.radius;
                    }
                }
                branches.push({ parentId, d: parts.join(' ') });
            }
            const covered = getEditorOcclusions(offsetX, offsetY, width, height);
            // Méret- és editorváltozás nélkül az új SVG pontosan ugyanaz lenne.
            // Ilyenkor sem a DOM-ot, sem az eseménykezelőket nem építjük újra.
            const signature = JSON.stringify([width, height, branches, covered]);
            if (signature === connectorSignature) return;
            connectorSignature = signature;

            const fragment = document.createDocumentFragment();
            const usedParents = new Set();
            for (const { parentId, d } of branches) {
                let cached = connectorCache.get(parentId);
                if (!cached) {
                    const group = makeSvgNode('g', { 'class': 'ph-tv-branch', 'data-branch-id': parentId });
                    const path = makeSvgNode('path', { 'class': 'ph-tv-path', d });
                    const hit = makeSvgNode('path', {
                        'class': 'ph-tv-path-hit', d, 'role': 'button', 'tabindex': '0',
                        'aria-label': 'Válaszág összecsukása'
                    });
                    const title = makeSvgNode('title');
                    title.textContent = 'Válaszág összecsukása';
                    hit.appendChild(title);
                    hit.addEventListener('mouseenter', () => setHoveredBranch(parentId));
                    hit.addEventListener('mouseleave', () => setHoveredBranch(null));
                    hit.addEventListener('focus', () => {
                        if (hit.matches(':focus-visible')) setHoveredBranch(parentId);
                    });
                    hit.addEventListener('blur', () => setHoveredBranch(null));
                    hit.addEventListener('click', event => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFold(parentId);
                    });
                    hit.addEventListener('keydown', event => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        toggleFold(parentId);
                    });
                    group.append(path, hit);
                    cached = { group, path, hit, d };
                    connectorCache.set(parentId, cached);
                } else if (cached.d !== d) {
                    cached.path.setAttribute('d', d);
                    cached.hit.setAttribute('d', d);
                    cached.d = d;
                }
                cached.group.classList.toggle('is-highlighted', highlightedIds.has(parentId));
                fragment.appendChild(cached.group);
                usedParents.add(parentId);
            }
            for (const parentId of connectorCache.keys()) {
                if (!usedParents.has(parentId)) connectorCache.delete(parentId);
            }
            if (!covered.length) {
                svg.replaceChildren(fragment);
            } else {
                // Az SVG-maszk csak a rajzolást rejti el, a láthatatlan
                // kattintható "hit-path" azonban továbbra is elkapná az
                // egérkattintást. A clipPath mindkettőt kizárja.
                const defs = makeSvgNode('defs');
                let visibleLines = makeSvgNode('g');
                visibleLines.appendChild(fragment);
                covered.forEach((area, index) => {
                    const clipId = `ph-tv-editor-clip-${index}`;
                    const clip = makeSvgNode('clipPath', {
                        id: clipId, clipPathUnits: 'userSpaceOnUse'
                    });
                    const { x, y, width: cutWidth, height: cutHeight } = area;
                    // A második téglalap lyuk a teljes SVG területén;
                    // több szerkesztő esetén a clip-ek metszete érvényesül.
                    const d = `M 0 0 H ${width} V ${height} H 0 Z ` +
                        `M ${x} ${y} H ${x + cutWidth} V ${y + cutHeight} H ${x} Z`;
                    clip.appendChild(makeSvgNode('path', { d, 'clip-rule': 'evenodd' }));
                    defs.appendChild(clip);
                    const layer = makeSvgNode('g', { 'clip-path': `url(#${clipId})` });
                    layer.appendChild(visibleLines);
                    visibleLines = layer;
                });
                svg.replaceChildren(defs, visibleLines);
            }
        }

        // Az eredeti (lapos) LI-sorrendet eltároljuk; a hibás vagy körkörös
        // hivatkozások sem tudnak végtelen fa-bejárást előidézni.
        function rebuildTree() {
            // A DOM-ból érkező új hozzászólások esetén megőrizzük a hover-ágat,
            // de a régi elemekről előbb levesszük a hozzá tartozó osztályokat.
            const previousHover = hoveredBranch;
            if (previousHover) setHoveredBranch(null);
            const current = getPostsInDom();
            const currentSet = new Set(current);
            originalOrder = originalOrder.filter(li => currentSet.has(li));
            const known = new Set(originalOrder);
            for (const li of current) {
                if (!known.has(li)) {
                    originalOrder.push(li);
                    known.add(li);
                }
            }
            postMap = new Map();
            for (const li of originalOrder) {
                if (!postMap.has(li.dataset.id)) postMap.set(li.dataset.id, li);
            }
            if (!postMap.size) return;

            const children = new Map();
            const roots = [];
            for (const li of originalOrder) {
                const id = li.dataset.id;
                const parent = li.dataset.rplid;
                if (parent && parent !== id && postMap.has(parent)) {
                    if (!children.has(parent)) children.set(parent, []);
                    children.get(parent).push(id);
                } else {
                    roots.push(id);
                }
            }

            const nextEntries = [];
            const nextParentMap = new Map();
            const visited = new Set();
            function walk(id, depth, parentId) {
                if (visited.has(id)) return;
                const li = postMap.get(id);
                if (!li) return;
                visited.add(id);
                nextParentMap.set(id, parentId);
                nextEntries.push({ id, li, depth, descendants: 0 });
                for (const child of children.get(id) || []) walk(child, depth + 1, id);
            }
            roots.forEach(id => walk(id, 0, null));
            for (const li of originalOrder) {
                if (!visited.has(li.dataset.id)) walk(li.dataset.id, 0, null);
            }

            const stack = [];
            for (let i = nextEntries.length - 1; i >= 0; i--) {
                const item = nextEntries[i];
                while (stack.length && stack[stack.length - 1].depth > item.depth) {
                    const child = stack.pop();
                    item.descendants += 1 + child.descendants;
                }
                stack.push(item);
            }

            entries = nextEntries;
            parentMap = nextParentMap;
            entryIndexById.clear();
            depthById.clear();
            entries.forEach((entry, i) => {
                entryIndexById.set(entry.id, i);
                depthById.set(entry.id, entry.depth);
            });
            lastListWidth = ul.clientWidth;
            indentCache.clear();
            entries.forEach(syncPostUi);
            reorder(entries.map(entry => entry.li));
            syncInlineEditors();
            if (sizeObserver) {
                sizeObserver.disconnect();
                sizeObserver.observe(ul);
                entries.forEach(entry => sizeObserver.observe(entry.li));
            }
            applyFolds();
            if (previousHover) setHoveredBranch(previousHover);
        }

        function applyFolds() {
            // A rejtett felhasználó animációját fejezzük be a válaszág
            // átrendezése előtt, különben egy elrejtett gyermek újranyílhat.
            document.dispatchEvent(new Event('ph-pt-thread-folds-changing'));
            // A gyerekek UL-testvérek maradnak, ezért az aktuális mélységet
            // használjuk a rejtett ágak megállapításához.
            const hiddenBy = [];
            for (const entry of entries) {
                while (hiddenBy.length && hiddenBy[hiddenBy.length - 1] >= entry.depth) {
                    hiddenBy.pop();
                }
                const folded = collapsedIds.has(entry.id);
                entry.li.classList.toggle('ph-tv-branch-hidden', hiddenBy.length > 0);
                entry.li.classList.toggle('ph-tv-collapsed', folded);
                const button = entry.ui?.button;
                if (button) {
                    const expanded = String(!folded);
                    const label = folded
                        ? 'Hozzászólás és válaszág kibontása'
                        : 'Hozzászólás és válaszág összecsukása';
                    const title = folded ? 'Válaszág kibontása' : 'Válaszág összecsukása';
                    const symbol = folded ? '+' : '−';
                    if (button.getAttribute('aria-expanded') !== expanded) button.setAttribute('aria-expanded', expanded);
                    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
                    if (button.title !== title) button.title = title;
                    if (button.textContent !== symbol) button.textContent = symbol;
                }

                if (folded) hiddenBy.push(entry.depth);
            }
            scheduleConnectorDraw();
        }

        function revealById(id) {
            if (!threadActive) return false;
            const key = String(id).replace(/^msg/, '');
            if (!postMap.has(key)) return false;
            const seen = new Set();
            let parent = parentMap.get(key);
            let changed = false;
            while (parent && !seen.has(parent)) {
                seen.add(parent);
                if (collapsedIds.delete(parent)) changed = true;
                parent = parentMap.get(parent);
            }
            if (changed) {
                applyFolds();
                saveFolds();
            }
            return true;
        }

        function revealHashTarget() {
            const m = location.hash.match(/^#msg(\d+)$/);
            if (m) revealById(m[1]);
        }

        function setAllFolded(fold) {
            if (!threadActive) return;
            setHoveredBranch(null);
            if (fold) {
                for (const entry of entries) {
                    if (entry.depth === 0 && entry.descendants) collapsedIds.add(entry.id);
                }
            } else {
                collapsedIds.clear();
            }
            applyFolds();
            saveFolds();
            if (!fold) revealHashTarget();
        }

        function closeMenus() {
            for (const control of controls) {
                control.menu.hidden = true;
                control.trigger.setAttribute('aria-expanded', 'false');
            }
        }

        function updateButtons() {
            for (const control of controls) {
                const { toggle, trigger, wrapper } = control;
                toggle.classList.toggle('btn-primary', threadActive);
                toggle.title = threadActive
                    ? 'Reddit-szerű thread nézet kikapcsolása'
                    : 'Reddit-szerű thread nézet bekapcsolása';
                toggle.setAttribute('aria-pressed', String(threadActive));
                wrapper.classList.toggle('ph-tv-enabled', threadActive);
                trigger.hidden = !threadActive;
            }
            if (!threadActive) closeMenus();
        }

        function renderThreading() {
            if (threadActive || !ul) return;
            // A két önálló nézet nem lehet egyszerre aktív.
            document.dispatchEvent(new Event('ph-pt-thread-activating'));
            originalOrder = getPostsInDom();
            if (!originalOrder.length) return;
            threadActive = true;
            ul.classList.add('ph-tv-active');
            svg = makeSvgNode('svg', { 'class': 'ph-tv-connections', 'aria-hidden': 'false' });
            svg.setAttribute('aria-label', 'Összecsukható válaszágak');
            connectorSignature = null;
            connectorCache.clear();
            ul.appendChild(svg);
            rebuildTree();
            revealHashTarget();
            saveEnabled(true);
            updateButtons();
        }

        function restoreOriginalOrder() {
            if (!threadActive || !ul) return;
            // Előbb lezárjuk a még futó kártyaátmeneteket, csak utána
            // távolítjuk el a Thread nézet méretezési szabályait.
            document.dispatchEvent(new Event('ph-pt-thread-deactivating'));
            threadActive = false;
            setHoveredBranch(null);
            if (drawFrame !== null) cancelAnimationFrame(drawFrame);
            drawFrame = null;
            sizeObserver?.disconnect();
            svg?.remove();
            svg = null;
            connectorSignature = null;
            connectorCache.clear();
            indentCache.clear();
            entryIndexById.clear();
            depthById.clear();
            highlightedIds.clear();
            lastListWidth = 0;
            for (const editor of ul.querySelectorAll(':scope > li.msg-editor.ph-tv-inline-editor')) {
                editor.classList.remove('ph-tv-inline-editor');
                editor.style.removeProperty('--ph-tv-editor-indent');
            }
            for (const li of originalOrder) {
                li.classList.remove('ph-thread', 'ph-tv-collapsed', 'ph-tv-branch-hidden',
                    'ph-tv-off-hidden', 'ph-tv-has-children', 'ph-tv-branch-hover');
                li.style.removeProperty('--ph-tv-indent');
                li.style.removeProperty('--ph-tv-rail-x');
                li.querySelectorAll(':scope > .ph-tv-collapse, :scope > .ph-tv-summary')
                    .forEach(node => node.remove());
            }
            ul.classList.remove('ph-tv-active');
            reorder(originalOrder);
            entries = [];
            postMap.clear();
            parentMap.clear();
            saveEnabled(false);
            updateButtons();
        }

        function createControls() {
            const wrapper = document.createElement('span');
            wrapper.className = 'ph-tv-control';
            const toggle = document.createElement('a');
            toggle.href = 'javascript:;';
            toggle.className = 'btn btn-forum ph-tv-toggle';
            toggle.innerHTML = '<span class="fas fa-code-branch fa-fw"></span> Thread nézet';
            toggle.addEventListener('click', event => {
                event.preventDefault();
                closeMenus();
                if (threadActive) restoreOriginalOrder();
                else renderThreading();
            });
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'btn btn-forum ph-tv-menu-trigger';
            trigger.innerHTML = '<span class="fas fa-chevron-down fa-fw"></span>';
            trigger.title = 'Thread nézet – válaszág műveletek';
            trigger.setAttribute('aria-label', 'Thread nézet műveletek');
            trigger.setAttribute('aria-haspopup', 'true');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.hidden = true;
            const menu = document.createElement('div');
            menu.className = 'ph-tv-menu';
            menu.setAttribute('role', 'menu');
            menu.hidden = true;
            const fold = makeButton('ph-tv-menu-item', 'Összes válaszág összecsukása', () => {
                setAllFolded(true);
                closeMenus();
            });
            fold.innerHTML = '<span class="fas fa-minus-circle fa-fw"></span> Összecsuk mind';
            fold.setAttribute('role', 'menuitem');
            const unfold = makeButton('ph-tv-menu-item', 'Összes válaszág kibontása', () => {
                setAllFolded(false);
                closeMenus();
            });
            unfold.innerHTML = '<span class="fas fa-plus-circle fa-fw"></span> Kibont mind';
            unfold.setAttribute('role', 'menuitem');
            menu.append(fold, unfold);
            trigger.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const opening = menu.hidden;
                closeMenus();
                if (threadActive && opening) {
                    menu.hidden = false;
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
            wrapper.append(toggle, trigger, menu);
            controls.push({ wrapper, toggle, trigger, menu });
            return wrapper;
        }

        function init() {
            const headers = document.querySelectorAll('h4.list-message');
            if (!headers.length || controls.length) return false;
            ul = getMessageList(headers[0]);
            if (!ul || !getPostsInDom().length) return false;
            headers.forEach(header => header.append(createControls()));
            originalOrder = getPostsInDom();
            updateButtons();

            // Az utólag betöltődő képek, OFF-összecsukások és a szövegtörések
            // is változtathatják a hozzászólások magasságát.
            if (typeof ResizeObserver === 'function') {
                sizeObserver = new ResizeObserver(syncResponsiveWidth);
            }
            window.addEventListener('resize', () => syncResponsiveWidth(), { passive: true });
            if (mobileQuery.addEventListener) {
                mobileQuery.addEventListener('change', () => syncResponsiveWidth(true));
            } else if (mobileQuery.addListener) {
                mobileQuery.addListener(() => syncResponsiveWidth(true));
            }
            document.fonts?.ready?.then(scheduleConnectorDraw);
            document.addEventListener('ph-pt-off-visibility-changed', syncOffVisibility);

            // Az UL közvetlen LI-gyermekeinek AJAX-os cseréjét is követjük.
            const listObserver = new MutationObserver(() => {
                if (!threadActive) return;
                const live = getPostsInDom();
                if (live.length === postMap.size &&
                    live.every(li => postMap.get(li.dataset.id) === li)) return;
                clearTimeout(updateTimer);
                updateTimer = setTimeout(() => {
                    updateTimer = null;
                    if (threadActive) rebuildTree();
                }, 50);
            });
            listObserver.observe(ul, { childList: true });

            // A válaszszerkesztő AJAX-szal jelenik meg / tűnik el. A megnyitás
            // és bezárás után a kitakarás frissüljön azonnal, ne csak resize-ra.
            const editorSelector = 'li.msg-editor, .msg-editor-wrapper, .rtif-content[contenteditable="true"]';
            const editorObserver = new MutationObserver(changes => {
                if (!threadActive) return;
                const changed = changes.some(change => {
                    if (svg?.contains(change.target)) return false;
                    if (change.type === 'attributes') {
                        return change.target.matches?.(editorSelector) ||
                            !!change.target.closest?.('.msg-editor-wrapper');
                    }
                    return [...change.addedNodes, ...change.removedNodes].some(node =>
                        node.nodeType === 1 &&
                        (node.matches?.(editorSelector) || node.querySelector?.(editorSelector)));
                });
                if (changed) scheduleConnectorDraw();
            });
            editorObserver.observe(document.body, {
                childList: true, subtree: true, attributes: true,
                attributeFilter: ['class', 'style', 'hidden']
            });

            document.addEventListener('click', event => {
                if (!event.target.closest('.ph-tv-control')) closeMenus();
            }, true);
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') closeMenus();
            });
            window.phPtThreadView = { revealById };
            window.addEventListener('hashchange', revealHashTarget);
            document.addEventListener('ph-pt-modern-activating', () => {
                if (threadActive) restoreOriginalOrder();
            });

            if (storage.getItem(STORAGE_KEY) === STATUS.ON) renderThreading();
            return true;
        }

        if (!init()) {
            const observer = new MutationObserver(() => {
                if (init()) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    function modernView() {
        const STORAGE_KEY = KEYS.STATE.MODERN_VIEW;
        const STATUS = { ON: 'enabled', OFF: 'disabled' };
        let ul = null;
        let active = false;
        const buttons = [];

        // Az új nézet csak CSS-t alkalmaz: az időrendi LI-sorrend és a fórum
        // eredeti elemei, linkjei és eseménykezelői változatlanok maradnak.
        injectPostCardStyles();
        injectStyleOnce('ph-pt-modern-view-style', `
            ul.ph-mv-active:not(.ph-tv-active) > li:is([data-id], .message-featured) {
                position: relative !important;
                box-sizing: border-box;
                min-width: 0;
                margin: 0 0 9px !important;
                padding: 0 !important;
            }
            ul.ph-mv-active:not(.ph-tv-active) > li.msg-editor {
                margin: 0 0 9px !important;
                padding: 0 !important;
            }
            /* Az OFF-elrejtés a .message-off elemen (ami gyakran maga az LI),
               illetve egy belső .message elemen hagyhat off-post-hidden osztályt.
               Ne csak a kártya törzse tűnjön el: a teljes sor kikerül a layoutból,
               különben a Modern nézet 9px-es LI-margója üres réseket hagy. */
            ul.ph-mv-active:not(.ph-tv-active) > li.off-post-hidden,
            ul.ph-mv-active:not(.ph-tv-active) > li:has(> :is(.message, .message-off).off-post-hidden) {
                display: none !important;
            }
            /* Az összefoglalónál nincs gombsor: a kártyafejléc egyetlen soros.
               A témacímet és a frissítés dátumát a jobb oldali oszlop tartja. */
            ul.ph-mv-active:not(.ph-tv-active) > li.message-featured:not([data-id]) > .message > .message-head {
                grid-template-rows: auto !important;
                grid-template-areas: 'author info' !important;
            }
        `);

        function getMessageList(header) {
            let list = header?.nextElementSibling;
            while (list && !(list.tagName === 'UL' &&
                list.querySelector(':scope > li[data-id]'))) {
                list = list.nextElementSibling;
            }
            return list;
        }

        function updateButtons() {
            for (const button of buttons) {
                button.classList.toggle('btn-primary', active);
                button.setAttribute('aria-pressed', String(active));
                button.title = active
                    ? 'Modern nézet kikapcsolása – vissza a hagyományos megjelenéshez'
                    : 'Modern nézet bekapcsolása – Thread-kártyák, válaszfa nélkül';
            }
        }

        // Az összefoglaló és a rögzített hozzászólás külön UL-ben jelenik meg,
        // nem a fő hozzászóláslistában. Ezek is ugyanazt a kártyastílust kapják.
        function getFeaturedLists() {
            return [...document.querySelectorAll('.message-list > ul')].filter(list =>
                list !== ul && !!list.querySelector(':scope > li.message-featured'));
        }

        function setActive(enabled) {
            if (!ul || active === enabled) return;
            if (enabled) {
                // Ha épp a Thread nézet aktív, először az állítsa vissza
                // az eredeti DOM-sorrendet, majd a Modern nézet kapja meg a listát.
                document.dispatchEvent(new Event('ph-pt-modern-activating'));
            }
            if (!enabled) document.dispatchEvent(new Event('ph-pt-modern-deactivating'));
            active = enabled;
            ul.classList.toggle('ph-mv-active', active);
            getFeaturedLists().forEach(list => list.classList.toggle('ph-mv-active', active));
            storage.setItem(STORAGE_KEY, active ? STATUS.ON : STATUS.OFF);
            updateButtons();
        }

        function makeToggle() {
            const btn = document.createElement('a');
            btn.href = 'javascript:;';
            btn.className = 'btn btn-forum ph-mv-toggle';
            btn.innerHTML = '<span class="fas fa-layer-group fa-fw"></span> Modern nézet';
            btn.setAttribute('role', 'button');
            btn.addEventListener('click', event => {
                event.preventDefault();
                setActive(!active);
            });
            btn.addEventListener('keydown', event => {
                if (event.key !== ' ') return;
                event.preventDefault();
                setActive(!active);
            });
            buttons.push(btn);
            return btn;
        }

        function init() {
            if (buttons.length) return true;
            const headers = [...document.querySelectorAll('h4.list-message')];
            if (!headers.length) return false;
            ul = getMessageList(headers[0]);
            if (!ul) return false;
            headers.forEach(header => header.appendChild(makeToggle()));
            document.addEventListener('ph-pt-thread-activating', () => setActive(false));
            if (storage.getItem(STORAGE_KEY) === STATUS.ON) setActive(true);
            else {
                // Régi állapot ne maradjon fenn az extra listákon sem.
                getFeaturedLists().forEach(list => list.classList.remove('ph-mv-active'));
                updateButtons();
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

    function messageScroller() {
        if (window.phPtMessageScroller?.bound) return;

        function collectMessages() {
            return Array.from(document.querySelectorAll('[id^="msg"]'))
                .filter(el => {
                    if (!/^msg\d+$/.test(el.id)) return false;

                    const id = el.id.replace('msg', '');

                    const li = el.closest(`li[data-id="${id}"]`)
                        || document.querySelector(`li[data-id="${id}"]`);

                    if (!li) return false;

                    // Csak valódi, nem törölt hozzászólások.
                    return !!li.querySelector('.message-body');
                })
                .sort((a, b) =>
                    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
                );
        }

        function scrollToEl(el) {
            if (!el) return false;

            window.scrollTo({
                top: window.scrollY + el.getBoundingClientRect().top,
                behavior: 'smooth'
            });

            return true;
        }

        function scrollToMsgId(msgId) {
            const id = String(msgId).replace(/^msg/, '');
            // Az összecsukott ágban lévő célhoz először nyissuk ki az őseit.
            window.phPtThreadView?.revealById?.(id);
            const el = document.getElementById('msg' + id);
            const row = el?.closest('li[data-id]');
            // A saját maga összecsukott kommentet a rövid, látható sorához görgetjük.
            return scrollToEl(row?.classList.contains('ph-tv-collapsed') ? row : el);
        }

        window.phPtMessageScroller = {
            bound: true,
            collectMessages,
            scrollToEl,
            scrollToMsgId,
        };
    }

    function getReplyNavigator() {
        if (window.phPtReplyNavigator) return window.phPtReplyNavigator;

        const REPLY_HISTORY_KEY = 'ph_pt_reply_history';
        const REPLY_HISTORY_TOPIC_KEY = 'ph_pt_reply_history_topic';

        function topicPrefix() {
            const match = location.pathname.match(/^(\/tema\/[^/]+\/)/);
            return match ? match[1] : null;
        }

        function resetHistoryOnTopicChange() {
            const prefix = topicPrefix();
            if (!prefix) return;
            try {
                const key = location.host + prefix;
                const savedKey = sessionStorage.getItem(REPLY_HISTORY_TOPIC_KEY);
                if (savedKey !== key) {
                    sessionStorage.removeItem(REPLY_HISTORY_KEY);
                    sessionStorage.setItem(REPLY_HISTORY_TOPIC_KEY, key);
                }
            } catch (error) {
                console.warn('[PH Power Tools] Válaszelőzmény tárolási hiba:', error);
            }
        }

        function validatedHistoryItem(item) {
            if (!item || !/^\d+$/.test(String(item.id || ''))) return null;
            try {
                const url = new URL(item.url);
                if (url.origin !== location.origin ||
                    !url.pathname.startsWith(topicPrefix() || '/tema/INVALID/') ||
                    url.hash !== '#msg' + String(item.id)) return null;
                return { id: String(item.id), url: url.href };
            } catch {
                return null;
            }
        }

        function loadHistory() {
            try {
                const stored = JSON.parse(sessionStorage.getItem(REPLY_HISTORY_KEY) || '[]');
                return Array.isArray(stored)
                    ? stored.map(validatedHistoryItem).filter(Boolean).slice(-100) : [];
            } catch {
                return [];
            }
        }

        function saveHistory(items) {
            try {
                sessionStorage.setItem(REPLY_HISTORY_KEY, JSON.stringify(items.slice(-100)));
            } catch (error) {
                console.warn('[PH Power Tools] Válaszelőzmény mentési hiba:', error);
            }
            document.dispatchEvent(new Event('ph-pt-reply-nav-updated'));
        }

        function findPost(id) {
            const postId = String(id ?? '');
            if (!/^\d+$/.test(postId)) return null;
            const row = document.querySelector(`li[data-id="${postId}"]`);
            return row?.querySelector('.message-body') ? row : null;
        }

        function currentIdFromHash() {
            return location.hash.match(/^#msg(\d+)$/)?.[1] || null;
        }

        function findReplyTarget(currentId) {
            const id = String(currentId ?? '');
            const post = findPost(id);
            if (!post) return null;

            const replyLink = post.querySelector(
                '.message-head-infos .message-reply a.message-id[href*="#msg"]'
            ) || post.querySelector(
                '.message-content-replied .message-reply a.message-id[href*="#msg"]'
            );

            let replyId = null;
            let replyUrl = null;
            if (replyLink?.href) {
                try {
                    const url = new URL(replyLink.href, location.href);
                    const match = url.hash.match(/^#msg(\d+)$/);
                    if (match && /^https?:$/.test(url.protocol) && url.pathname.includes('/tema/')) {
                        replyId = match[1];
                        replyUrl = url.href;
                    }
                } catch {}
            }

            if (!replyId && /^\d+$/.test(post.dataset.rplid || '')) {
                replyId = post.dataset.rplid;
            }
            if (!replyId || replyId === id || replyId === '0') return null;

            return {
                id: replyId,
                inPage: !!findPost(replyId),
                url: replyUrl,
            };
        }

        function getState(currentId = currentIdFromHash()) {
            const target = findReplyTarget(currentId);
            const backItems = loadHistory();
            const lastBack = backItems[backItems.length - 1] || null;
            const localParent = target?.inPage ? findPost(target.id) : null;
            const localBack = lastBack ? findPost(lastBack.id) : null;
            const parentOffHidden = !!localParent && isOffExcludedFromNavigation(localParent);
            const backOffHidden = !!localBack && isOffExcludedFromNavigation(localBack);
            return {
                parentOffHidden,
                backOffHidden,
                currentId: currentId ? String(currentId) : null,
                parentId: target?.id || null,
                canGoToParent: !!target && (target.inPage || !!target.url) &&
                    !parentOffHidden,
                backCount: backItems.length,
                backId: lastBack?.id || null,
                canGoBack: !!lastBack && !backOffHidden,
            };
        }

        function jumpToId(id) {
            const post = findPost(id);
            if (!post || isOffExcludedFromNavigation(post)) return false;
            history.replaceState(null, '', '#msg' + id);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            if (!window.phPtMessageScroller?.scrollToMsgId?.(id)) {
                post.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            document.dispatchEvent(new Event('ph-pt-reply-nav-updated'));
            return true;
        }

        function pushHistory(id) {
            const url = new URL(location.href);
            url.hash = '#msg' + id; // A mobilpanel görgetés közben nem feltétlenül módosítja a hash-t.
            const item = { id: String(id), url: url.href };
            const items = loadHistory();
            const last = items[items.length - 1];
            if (last?.id === item.id && last.url === item.url) return;
            items.push(item);
            saveHistory(items);
        }

        function goToParent(currentId = currentIdFromHash()) {
            const id = String(currentId ?? '');
            const target = findReplyTarget(id);
            if (!target || (!target.inPage && !target.url)) return false;
            if (target.inPage && isOffExcludedFromNavigation(findPost(target.id))) return false;

            pushHistory(id);
            if (target.inPage) return jumpToId(target.id);
            window.location.href = target.url;
            return true;
        }

        function goBack() {
            const items = loadHistory();
            if (!items.length) return false;
            const previous = items[items.length - 1];
            const localPost = findPost(previous.id);
            // A visszalépési előzményt megőrizzük, ha az OFF-cél most rejtett.
            // Az OFF-ok visszakapcsolása után ugyanaz az előzmény ismét elérhető.
            if (localPost && isOffExcludedFromNavigation(localPost)) return false;
            items.pop();
            saveHistory(items);

            if (localPost) return jumpToId(previous.id);
            window.location.href = previous.url;
            return true;
        }

        resetHistoryOnTopicChange();
        const navigator = { getState, goToParent, goBack };
        window.phPtReplyNavigator = navigator;
        return navigator;
    }

    function keyboardNavigation() {
        const replyNavigator = getReplyNavigator();

        function getPosts() {
            return [...document.querySelectorAll('li[data-id]')];
        }

        function getCurrentIndex(posts) {
            const hash = location.hash.replace('#msg', '');
            return posts.findIndex(li => li.dataset.id === hash);
        }

        function jumpToIndex(posts, index) {
            if (index < 0 || index >= posts.length) return;
            const id = posts[index].dataset.id;
            history.replaceState(null, '', '#msg' + id);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            window.phPtMessageScroller?.scrollToMsgId(id);
        }

        function getMsgIdFromHash() {
            const m = location.hash.match(/^#msg(\d+)$/);
            return m ? parseInt(m[1], 10) : null;
        }

        function setMsgId(id) {
            if (id < 0) return;
            history.replaceState(null, '', '#msg' + id);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            window.phPtMessageScroller?.scrollToMsgId(id);
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
            return posts.map(p => parseInt(p.dataset.id, 10))
                .filter(id => !Number.isNaN(id)).sort((a, b) => a - b);
        }

        function getCurrentIdIndex(sortedIds) {
            const currentId = getMsgIdFromHash();
            return currentId === null ? -1 : sortedIds.indexOf(currentId);
        }

        function getSafeCurrentIndex(posts) {
            const index = getCurrentIndex(posts);
            if (index !== -1) return index;
            const hashId = getMsgIdFromHash();
            if (hashId === null) return 0;
            const closest = findClosestPost(posts, hashId);
            return closest ? posts.indexOf(closest) : 0;
        }

        function getDirectionalIndex(allPosts, visiblePosts, direction) {
            const hashId = getMsgIdFromHash();
            if (hashId === null) return null;
            const current = allPosts.findIndex(li => li.dataset.id === String(hashId));
            if (current < 0 || isNavigableForumPost(allPosts[current])) return null;
            // A kijelölt hozzászólás időközben OFF-ként eltűnhetett: a
            // következő billentyű lenyomása ne ugorjon át még egy látható elemet.
            const candidates = direction < 0
                ? allPosts.slice(0, current).reverse() : allPosts.slice(current + 1);
            const neighbor = candidates.find(isNavigableForumPost);
            return neighbor ? visiblePosts.indexOf(neighbor) : -1;
        }

        document.addEventListener('keydown', (e) => {
            if (document.querySelector('.layer-gallery')) return;
            const active = document.activeElement;
            if (active && (active.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))) return;

            const posts = getPosts();
            if (!posts.length) return;

            // R = a kijelölt hozzászólás előzménye; Shift+R = vissza az R útvonalán.
            if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                if (e.shiftKey) replyNavigator.goBack();
                else replyNavigator.goToParent();
                return;
            }

            const visiblePosts = posts.filter(isNavigableForumPost);
            if (!visiblePosts.length) return;
            const currentIndex = getSafeCurrentIndex(visiblePosts);

            // Shift+fel/le: hozzászólás-ID szerint; fel/le: a megjelenített sorrend szerint.
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                const sortedIds = getSortedPostIds(visiblePosts);
                if (!sortedIds.length) return;
                const idx = getCurrentIdIndex(sortedIds);
                const delta = e.key === 'ArrowUp' ? -1 : 1;
                let newIndex = idx + delta;
                if (idx === -1) {
                    const hashId = getMsgIdFromHash();
                    if (hashId === null) return;
                    // A rejtett, éppen kijelölt OFF azonosítója nem szerepel a
                    // listában: ID szerint a megfelelő szomszédot keressük.
                    newIndex = delta < 0
                        ? sortedIds.findLastIndex(id => id < hashId)
                        : sortedIds.findIndex(id => id > hashId);
                }
                if (newIndex < 0 || newIndex >= sortedIds.length) return;
                setMsgId(sortedIds[newIndex]);
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    {
                        const directional = getDirectionalIndex(posts, visiblePosts, -1);
                        if (directional !== -1) jumpToIndex(visiblePosts,
                            directional ?? Math.max(0, currentIndex - 1));
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    {
                        const directional = getDirectionalIndex(posts, visiblePosts, +1);
                        if (directional !== -1) jumpToIndex(visiblePosts,
                            directional ?? Math.min(visiblePosts.length - 1, currentIndex + 1));
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    jumpToIndex(visiblePosts, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    jumpToIndex(visiblePosts, visiblePosts.length - 1);
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
            injectStyleOnce("ph-pt-hidden-bar-style", `
                .hidden-bar {
                    background: ${base};
                    color: ${color};
                    font-size: 13px;
                    padding: 4px 8px;
                    cursor: pointer;
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
                    overflow: visible;
                }
                .ph-collapsible[data-collapsed="true"] {
                    overflow: hidden;
                }
                /* Modern és Thread nézetben azonos kártya-/sávanimáció:
                   a végállapotot csak a 380 ms átmenet végén állítjuk be. */
                ul:is(.ph-mv-active, .ph-tv-active) > li.ph-hu-transitioning > .message.ph-collapsible {
                    box-sizing: border-box !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: hidden !important;
                    transition: height 380ms cubic-bezier(.4, 0, .2, 1),
                                border-width 380ms cubic-bezier(.4, 0, .2, 1),
                                opacity 290ms ease !important;
                }
                ul:is(.ph-mv-active, .ph-tv-active) > li.ph-hu-transitioning > .hidden-bar {
                    box-sizing: border-box !important;
                    min-height: 0 !important;
                    overflow: hidden !important;
                    transition: height 380ms cubic-bezier(.4, 0, .2, 1),
                                padding 380ms cubic-bezier(.4, 0, .2, 1),
                                border-width 380ms cubic-bezier(.4, 0, .2, 1),
                                opacity 290ms ease !important;
                }
                @media (prefers-reduced-motion: reduce) {
                    ul:is(.ph-mv-active, .ph-tv-active) > li.ph-hu-transitioning > .message.ph-collapsible,
                    ul:is(.ph-mv-active, .ph-tv-active) > li.ph-hu-transitioning > .hidden-bar {
                        transition: none !important;
                    }
                }
            `);
        }

        applyHiddenBarStyle();
        document.addEventListener("ph-pt-theme-changed", applyHiddenBarStyle);

        // ===== SEGÉDFÜGGVÉNYEK =====
        function getAuthor(msg) {
            return msg.querySelector(".message-head-user .user-title .user-link")?.textContent?.trim() || "";
        }

        function getPosts() {
            return Array.from(document.querySelectorAll("li[data-id]"));
        }

        // A kártyás Modern és Thread nézetben a régi max-height/data-collapsed
        // sorrend azonnal elvette a kártya szegélyét és magasságát. A mért
        // méretek között animálunk, és csak a végén írjuk be a végállapotot.
        const USER_COLLAPSE_DURATION = 380;
        const userTransitions = new Map();
        const msgAnimatedProps = ['height', 'max-height', 'min-height', 'opacity',
            'overflow', 'border-width', 'transition'];
        const barAnimatedProps = ['height', 'min-height', 'opacity', 'overflow',
            'border-width', 'padding', 'transition'];

        function inCardView(li) {
            if (!li.parentElement?.matches('ul.ph-mv-active:not(.ph-tv-active), ul.ph-tv-active')) return false;
            // Összecsukott vagy más okból láthatatlan válaszágban nincs
            // ténylegesen animálható kártya. Ilyenkor az állapotot azonnal állítjuk.
            if (li.classList.contains('ph-tv-collapsed') ||
                li.classList.contains('ph-tv-branch-hidden') ||
                li.classList.contains('ph-tv-off-hidden')) return false;
            const msg = li.querySelector(':scope > .message');
            return getComputedStyle(li).display !== 'none' && !!msg &&
                getComputedStyle(msg).display !== 'none';
        }

        function snapshotProps(element, props) {
            return props.map(prop => [prop, element.style.getPropertyValue(prop),
                element.style.getPropertyPriority(prop)]);
        }

        function restoreProps(element, values) {
            for (const [prop, value, priority] of values) {
                if (value) element.style.setProperty(prop, value, priority);
                else element.style.removeProperty(prop);
            }
        }

        // Az összecsukott elem scrollHeight-ja a böngészőtől és a fórum
        // flex-elrendezésétől is függhet. Átmenet nélkül mérjük a teljes kártyát.
        function measureExpandedHeight(msg) {
            const oldStyle = msg.getAttribute('style');
            const oldCollapsed = msg.dataset.collapsed;
            msg.dataset.collapsed = 'false';
            msg.style.setProperty('transition', 'none', 'important');
            msg.style.setProperty('height', 'auto', 'important');
            msg.style.setProperty('max-height', 'none', 'important');
            msg.style.setProperty('min-height', '0', 'important');
            msg.style.setProperty('overflow', 'visible', 'important');
            msg.style.setProperty('border-width', '1px', 'important');
            const height = msg.getBoundingClientRect().height;
            if (oldStyle === null) msg.removeAttribute('style');
            else msg.setAttribute('style', oldStyle);
            if (oldCollapsed === undefined) delete msg.dataset.collapsed;
            else msg.dataset.collapsed = oldCollapsed;
            return height;
        }

        function measureBarHeight(bar) {
            const oldStyle = bar.getAttribute('style');
            bar.style.setProperty('transition', 'none', 'important');
            bar.style.setProperty('height', 'auto', 'important');
            bar.style.setProperty('min-height', '35px', 'important');
            bar.style.setProperty('padding', '7px 10px', 'important');
            bar.style.setProperty('border-width', '1px', 'important');
            const height = bar.getBoundingClientRect().height;
            if (oldStyle === null) bar.removeAttribute('style');
            else bar.setAttribute('style', oldStyle);
            return height;
        }

        function makeHiddenBar(li, msg, author) {
            const bar = document.createElement('div');
            bar.className = 'hidden-bar';
            bar.textContent = `Rejtett – ${author}`;
            bar.addEventListener('click', () => {
                const active = userTransitions.get(msg);
                const wasCollapsed = active ? active.collapsed : msg.dataset.collapsed === 'true';
                const collapse = !wasCollapsed;
                bar.textContent = `${collapse ? 'Rejtett' : 'Elrejtés'} – ${author}`;
                if (inCardView(li)) {
                    animateCardUser(li, msg, bar, collapse, false);
                } else if (wasCollapsed) {
                    const fullHeight = msg.scrollHeight;
                    msg.style.maxHeight = fullHeight + 'px';
                    msg.addEventListener('transitionend', function onEnd(e) {
                        if (e.propertyName === 'max-height') {
                            msg.style.maxHeight = 'none';
                            msg.removeEventListener('transitionend', onEnd);
                        }
                    });
                    msg.dataset.collapsed = 'false';
                } else {
                    msg.style.maxHeight = msg.scrollHeight + 'px';
                    void msg.offsetHeight;
                    msg.style.maxHeight = '0px';
                    msg.dataset.collapsed = 'true';
                }
            });
            return bar;
        }

        function finishUserState(li, msg, bar, collapsed, removeBar) {
            li.classList.remove('ph-hu-transitioning');
            msg.classList.toggle('ph-collapsible', !removeBar);
            if (removeBar) {
                delete msg.dataset.collapsed;
                msg.style.removeProperty('max-height');
                bar.remove();
            } else {
                msg.dataset.collapsed = collapsed ? 'true' : 'false';
                msg.style.maxHeight = collapsed ? '0px' : 'none';
                bar.textContent = `${collapsed ? 'Rejtett' : 'Elrejtés'} – ${getAuthor(msg)}`;
            }
        }

        function animateCardUser(li, msg, bar, collapsed, removeBar = false, isNewBar = false) {
            const previous = userTransitions.get(msg);
            // Megszakításkor az éppen képernyőn lévő magasságról folytatjuk.
            const startMsgH = msg.getBoundingClientRect().height;
            const startMsgOpacity = !previous && msg.dataset.collapsed === 'true'
                ? 0 : (parseFloat(getComputedStyle(msg).opacity) || 0);
            const startMsgBorder = parseFloat(getComputedStyle(msg).borderTopWidth) || 0;
            const startBarH = isNewBar ? 0 : bar.getBoundingClientRect().height;
            const startBarOpacity = isNewBar ? 0 : parseFloat(getComputedStyle(bar).opacity) || 0;
            const startBarBorder = isNewBar ? 0 : parseFloat(getComputedStyle(bar).borderTopWidth) || 0;
            const startBarPadding = isNewBar ? 0 : parseFloat(getComputedStyle(bar).paddingTop) || 0;
            const originalMsg = previous?.originalMsg || snapshotProps(msg, msgAnimatedProps);
            const originalBar = previous?.originalBar || (isNewBar
                ? barAnimatedProps.map(prop => [prop, '', '']) : snapshotProps(bar, barAnimatedProps));
            if (previous) previous.cancel();

            const expandedMsgH = measureExpandedHeight(msg);
            const expandedBarH = measureBarHeight(bar);
            if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                restoreProps(msg, originalMsg);
                restoreProps(bar, originalBar);
                // Az újonnan beszúrt sáv induló inline stílusait is töröljük.
                if (isNewBar) bar.removeAttribute('style');
                finishUserState(li, msg, bar, collapsed, removeBar);
                return;
            }

            msg.classList.add('ph-collapsible');
            // Az attribútumhoz kötött végállapot nem aktiválódhat az animáció előtt.
            msg.dataset.collapsed = 'false';
            li.classList.add('ph-hu-transitioning');
            msg.style.setProperty('transition', 'none', 'important');
            msg.style.setProperty('max-height', 'none', 'important');
            msg.style.setProperty('min-height', '0px', 'important');
            msg.style.setProperty('overflow', 'hidden', 'important');
            msg.style.setProperty('height', `${Math.max(0, startMsgH)}px`, 'important');
            msg.style.setProperty('opacity', String(startMsgOpacity), 'important');
            msg.style.setProperty('border-width', `${startMsgBorder}px`, 'important');
            bar.style.setProperty('transition', 'none', 'important');
            bar.style.setProperty('min-height', '0px', 'important');
            bar.style.setProperty('overflow', 'hidden', 'important');
            bar.style.setProperty('height', `${Math.max(0, startBarH)}px`, 'important');
            bar.style.setProperty('opacity', String(startBarOpacity), 'important');
            bar.style.setProperty('border-width', `${startBarBorder}px`, 'important');
            bar.style.setProperty('padding', `${startBarPadding}px 10px`, 'important');
            void msg.offsetHeight;
            void bar.offsetHeight;

            const record = {
                originalMsg, originalBar, collapsed, removeBar, raf: 0, timeout: 0,
                cancel() {
                    cancelAnimationFrame(this.raf);
                    clearTimeout(this.timeout);
                    msg.removeEventListener('transitionend', onEnd);
                    bar.removeEventListener('transitionend', onEnd);
                    userTransitions.delete(msg);
                },
                finish() {
                    if (userTransitions.get(msg) !== this) return;
                    this.cancel();
                    restoreProps(msg, originalMsg);
                    restoreProps(bar, originalBar);
                    if (isNewBar) bar.removeAttribute('style');
                    finishUserState(li, msg, bar, collapsed, removeBar);
                }
            };
            function onEnd(event) {
                if (event.propertyName !== 'height') return;
                if (event.target === msg && startMsgH !== (collapsed ? 0 : expandedMsgH)) record.finish();
                else if (event.target === bar && startMsgH === (collapsed ? 0 : expandedMsgH)) record.finish();
            }
            userTransitions.set(msg, record);
            msg.addEventListener('transitionend', onEnd);
            bar.addEventListener('transitionend', onEnd);
            record.raf = requestAnimationFrame(() => {
                if (userTransitions.get(msg) !== record) return;
                msg.style.removeProperty('transition');
                bar.style.removeProperty('transition');
                msg.style.setProperty('height', `${collapsed ? 0 : expandedMsgH}px`, 'important');
                msg.style.setProperty('opacity', collapsed ? '0' : '1', 'important');
                msg.style.setProperty('border-width', collapsed ? '0px' : '1px', 'important');
                bar.style.setProperty('height', `${removeBar ? 0 : expandedBarH}px`, 'important');
                bar.style.setProperty('opacity', removeBar ? '0' : '1', 'important');
                bar.style.setProperty('border-width', removeBar ? '0px' : '1px', 'important');
                bar.style.setProperty('padding', removeBar ? '0px 10px' : '7px 10px', 'important');
            });
            record.timeout = setTimeout(() => record.finish(), USER_COLLAPSE_DURATION + 100);
        }

        // Nézetváltásnál / Thread válaszág becsukásánál ne maradjon inline méret.
        function finishUserTransitions() {
            for (const record of [...userTransitions.values()]) record.finish();
        }
        for (const eventName of ['ph-pt-modern-deactivating',
            'ph-pt-thread-deactivating', 'ph-pt-thread-folds-changing']) {
            document.addEventListener(eventName, finishUserTransitions);
        }

        function updateHiddenComments(animate = false) {
            getPosts().forEach(li => {
                injectDropdownToggle(li);
                const msg = li.querySelector('.message');
                if (!msg) return;
                const author = getAuthor(msg);
                const isHidden = hiddenUsers.includes(author);
                let bar = li.querySelector('.hidden-bar');
                const running = userTransitions.get(msg);
                // A MutationObserver nem szakíthatja félbe az animációt.
                if (running && !animate) return;
                if (isHidden) {
                    if (!bar) {
                        bar = makeHiddenBar(li, msg, author);
                        if (animate && inCardView(li)) {
                            // A beszúrás pillanatában még ne foglaljon helyet a sáv.
                            bar.style.cssText = 'height:0px !important;min-height:0px !important;'
                                + 'padding:0px !important;border-width:0px !important;'
                                + 'opacity:0 !important;overflow:hidden !important;';
                            li.prepend(bar);
                            animateCardUser(li, msg, bar, true, false, true);
                        } else {
                            msg.dataset.collapsed = 'true';
                            msg.classList.add('ph-collapsible');
                            msg.style.maxHeight = '0px';
                            li.prepend(bar);
                        }
                    } else if (running && animate) {
                        animateCardUser(li, msg, bar, true, false);
                    }
                } else if (bar) {
                    if (animate && inCardView(li)) {
                        animateCardUser(li, msg, bar, false, true);
                    } else {
                        bar.remove();
                        msg.style.removeProperty('max-height');
                        delete msg.dataset.collapsed;
                        msg.classList.remove('ph-collapsible');
                    }
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
            updateHiddenComments(true);

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
            const msg = li.querySelector(".message");
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
                const currentAuthor = getAuthor(li.querySelector(".message"));
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

            phPtSyncThemeAttr();

            const overlay = document.createElement("div");
            overlay.className = "ph-pt-modal ph-editor-overlay";

            const panel = document.createElement("div");
            panel.className = "ph-pt-dialog ph-editor-panel";
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-labelledby', 'ph-hidden-users-title');

            const header = document.createElement("div");
            header.className = "ph-dialog-head";
            header.innerHTML = `
                <div class="ph-dialog-title-wrap">
                    <span class="ph-dialog-mark"><span class="fas fa-eye-slash"></span></span>
                    <span>
                        <strong id="ph-hidden-users-title" class="ph-dialog-title">Rejtett felhasználók</strong>
                        <small class="ph-dialog-subtitle">A témában látható és elrejtett szerzők kezelése</small>
                    </span>
                </div>
            `;

            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "ph-icon-btn ph-dialog-close";
            closeBtn.title = "Bezárás";
            closeBtn.setAttribute('aria-label', 'Bezárás');
            closeBtn.innerHTML = '<span class="fas fa-times"></span>';
            closeBtn.addEventListener("click", closeEditor);
            header.appendChild(closeBtn);

            const body = document.createElement("div");
            body.className = "ph-dialog-body";

            // ===== Lista konténerek =====
            const container = document.createElement("div");
            container.className = "dual-list-container";

            const leftColumn = document.createElement("div");
            leftColumn.className = "dual-list-column";
            leftColumn.innerHTML = '<div class="dual-list-label">Látható a témában</div>';
            const leftList = document.createElement("div");
            leftList.className = "dual-list";
            leftColumn.appendChild(leftList);

            const rightColumn = document.createElement("div");
            rightColumn.className = "dual-list-column";
            rightColumn.innerHTML = '<div class="dual-list-label">Rejtett</div>';
            const rightList = document.createElement("div");
            rightList.className = "dual-list";
            rightColumn.appendChild(rightList);

            const buttonsDiv = document.createElement("div");
            buttonsDiv.className = "dual-list-buttons";

            const btnRight = document.createElement("button");
            btnRight.type = "button";
            btnRight.className = "ph-icon-btn ph-dual-move";
            btnRight.title = "Kijelöltek elrejtése";
            btnRight.setAttribute('aria-label', 'Kijelöltek elrejtése');
            btnRight.innerHTML = '<span class="fas fa-arrow-right fa-fw ph-dual-desktop"></span><span class="fas fa-arrow-down fa-fw ph-dual-mobile"></span>';

            const btnLeft = document.createElement("button");
            btnLeft.type = "button";
            btnLeft.className = "ph-icon-btn ph-dual-move";
            btnLeft.title = "Kijelöltek feloldása";
            btnLeft.setAttribute('aria-label', 'Kijelöltek feloldása');
            btnLeft.innerHTML = '<span class="fas fa-arrow-left fa-fw ph-dual-desktop"></span><span class="fas fa-arrow-up fa-fw ph-dual-mobile"></span>';

            buttonsDiv.append(btnRight, btnLeft);
            container.append(leftColumn, buttonsDiv, rightColumn);
            body.appendChild(container);

            // ===== Gombok mentés / mégse =====
            const footer = document.createElement("div");
            footer.className = "ph-dialog-footer";

            const summary = document.createElement("span");
            summary.className = "ph-dialog-note ph-hidden-summary";

            const editorButtonsDiv = document.createElement("div");
            editorButtonsDiv.className = "ph-dialog-buttons editor-buttons";

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Mégse";
            cancelBtn.className = "btn btn-sm btn-forum ph-secondary-btn";

            const saveBtn = document.createElement("button");
            saveBtn.innerHTML = 'Mentés';
            saveBtn.className = "btn btn-sm btn-forum btn-primary";

            editorButtonsDiv.append(cancelBtn, saveBtn);
            footer.append(summary, editorButtonsDiv);

            panel.append(header, body, footer);
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

                summary.textContent = tempHiddenUsers.length
                    ? `${tempHiddenUsers.length} rejtett felhasználó`
                    : 'Nincs rejtett felhasználó';
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
                updateHiddenComments(true);
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
            const sample = document.querySelector('.message-head-btns a');
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
                /* A klasszikus nezet megtartja a fejléc belső jelolocsikjat.
                   Modern/Thread: a kartya szines kerete szabad marad, az
                   olvasatlan bejegyzest a fejlecben az ID elotti UJ cimke jelzi. */
                ul:is(.ph-tv-active, .ph-mv-active) > li[data-id] > .message > .message-head.ph-new-post-header {
                    box-shadow: none !important;
                }
                ul:is(.ph-tv-active, .ph-mv-active) > li[data-id] > .message > .message-head.ph-new-post-header > .message-head-infos > .message-id {
                    display: inline-flex !important;
                    flex: 0 0 auto !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    gap: 6px;
                    white-space: nowrap;
                }
                ul:is(.ph-tv-active, .ph-mv-active) > li[data-id] > .message > .message-head.ph-new-post-header > .message-head-infos > .message-id::before {
                    content: 'ÚJ';
                    display: inline-flex;
                    flex: 0 0 auto;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    min-height: 17px;
                    padding: 3px 6px;
                    border-radius: 4px;
                    background: #202124;
                    color: #fff;
                    font-size: 10px;
                    font-weight: 800;
                    line-height: 1;
                    letter-spacing: .035em;
                    text-decoration: none;
                    white-space: nowrap;
                }
                body[data-theme="dark"] ul:is(.ph-tv-active, .ph-mv-active) > li[data-id] > .message > .message-head.ph-new-post-header > .message-head-infos > .message-id::before {
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, .3);
                }
                .pager-navbar li.ph-pt-unread-nav-item {
                    margin-left: 6px;
                }
                .pager-navbar .ph-pt-unread-icon {
                    position: relative;
                    display: inline-block;
                    vertical-align: middle;
                    line-height: 1;
                }
                .pager-navbar a.ph-pt-jump-first-unread[aria-disabled="false"] .ph-pt-unread-icon::after {
                    content: "";
                    position: absolute;
                    top: -3px;
                    right: -2px;
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #e53935;
                    box-shadow: 0 0 0 1.5px var(--ph-ui-bg, #fff);
                    pointer-events: none;
                }
                .pager-navbar a.ph-pt-jump-first-unread[aria-disabled="true"] {
                    opacity: 0.3;
                    cursor: not-allowed;
                    pointer-events: auto !important;
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

        function findFirstUnreadPost() {
            let first = null;

            document.querySelectorAll('li[data-id]').forEach(li => {
                if (!li.querySelector('.message-head.ph-new-post-header')) return;

                const id = Number(li.dataset.id);
                if (!Number.isSafeInteger(id) || id <= 0) return;

                if (!first || id < first.id) first = { id, li };
            });

            return first;
        }

        function updateUnreadJumpButtons() {
            const first = findFirstUnreadPost();
            const siteJQuery = typeof unsafeWindow !== 'undefined' ? unsafeWindow.jQuery : window.jQuery;

            document.querySelectorAll('.ph-pt-jump-first-unread').forEach(link => {
                const enabled = !!first;
                link.classList.toggle('disabled', !enabled);
                link.setAttribute('aria-disabled', String(!enabled));
                link.tabIndex = enabled ? 0 : -1;

                if (enabled) {
                    link.href = `#msg${first.id}`;
                } else {
                    link.removeAttribute('href');
                }

                const tooltipText = enabled
                    ? `Ugrás az első olvasatlan hozzászólásra (#${first.id})`
                    : 'Nincs jelölt olvasatlan hozzászólás ezen az oldalon';
                link.setAttribute('data-original-title', tooltipText);
                if (typeof siteJQuery?.fn?.tooltip === 'function') {
                    link.title = '';
                    siteJQuery(link).tooltip();
                } else {
                    link.title = tooltipText;
                }
            });
        }

        function mountUnreadJumpButtons() {
            const navLinks = document.querySelectorAll(
                '.pager-navbar a[href$="#forum-nav-btm"], ' +
                '.pager-navbar a[href$="#forum-nav-top"]'
            );

            navLinks.forEach(existingLink => {
                const parentLi = existingLink.closest('li');
                if (!parentLi || parentLi.nextElementSibling?.classList.contains('ph-pt-unread-nav-item')) return;

                const li = document.createElement('li');
                li.className = 'ph-pt-unread-nav-item';

                const link = document.createElement('a');
                link.className = 'btn ph-pt-jump-first-unread disabled';
                link.setAttribute('role', 'button');
                link.setAttribute('aria-label', 'Ugrás az első olvasatlan hozzászólásra');
                link.setAttribute('data-toggle', 'tooltip');
                link.setAttribute('aria-disabled', 'true');
                link.tabIndex = -1;
                link.innerHTML = '<span class="ph-pt-unread-icon" aria-hidden="true"><span class="fas fa-comment fa-fw"></span></span>';

                link.addEventListener('click', event => {
                    const $site = typeof unsafeWindow !== 'undefined'
                        ? unsafeWindow.jQuery : window.jQuery;

                    if (typeof $site?.fn?.tooltip === 'function') {
                        $site(link).tooltip('hide');
                    }
                    link.blur();

                    const first = findFirstUnreadPost();
                    if (!first) {
                        event.preventDefault();
                        updateUnreadJumpButtons();
                        return;
                    }

                    const anchor = document.getElementById(`msg${first.id}`);
                    if (!anchor || window.location.hash === `#msg${first.id}`) {
                        event.preventDefault();

                        if (!window.phPtMessageScroller?.scrollToMsgId?.(first.id)) {
                            (anchor || first.li).scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });

                li.appendChild(link);
                parentLi.insertAdjacentElement('afterend', li);
            });

            updateUnreadJumpButtons();
        }

        function process() {
            mountUnreadJumpButtons();

            const slug = getTopicSlug();
            if (!slug) return;

            const map = readMap();

            const urlMax = getMaxFromURL();
            const comments = Array.from(document.querySelectorAll("li[data-id]"));

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
                updateUnreadJumpButtons();
                return;
            }

            // Jelölés
            comments.forEach(comment => {
                const id = parseInt(comment.dataset.id, 10);
                const header = comment.querySelector(".message-head");

                if (id && header && id > baseId) {
                    header.classList.add("ph-new-post-header");
                }
            });

            // Mentés frissítése: mindig a legnagyobbat jegyezzük meg
            if (stored === null || pageMaxId > stored) {
                map[slug] = pageMaxId;
                writeMap(map);
            }

            updateUnreadJumpButtons();
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
            { code: ':igen:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_m97zu6ylsflhdw5g_igen.gif' },
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
            label.style.cssText = 'font-size: 10px; color: var(--ph-ui-muted); margin-bottom: 4px;';
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
        const GALLERY_MAX_HEIGHT_PX = 480;

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
                #ph-kek-upload {
                    width: 100%; min-width: 0; margin: 16px 0 4px; overflow: hidden;
                    box-sizing: border-box; border: 1px solid var(--ph-ui-border, rgba(0,0,0,.12));
                    border-radius: 12px; color: var(--ph-ui-fg, #202124);
                    background: var(--ph-ui-bg, #fff);
                    font: inherit; font-size: 12px;
                }
                #ph-kek-upload, #ph-kek-upload * { box-sizing: border-box; }
                #ph-kek-upload button, #ph-kek-upload input { font: inherit; }
                #ph-kek-upload button { cursor: pointer; }
                #ph-kek-upload button:disabled { opacity: .55; cursor: not-allowed; }
                #ph-kek-upload button:focus-visible,
                #ph-kek-upload a:focus-visible { outline: 2px solid var(--ph-ui-accent, #4f7fb2); outline-offset: 2px; }
                #ph-kek-upload [hidden] { display: none !important; }

                #ph-kek-upload .ph-kek-top {
                    display: flex; align-items: center; gap: 10px; min-width: 0;
                    padding: 11px 13px; border-bottom: 1px solid var(--ph-ui-border, rgba(0,0,0,.12));
                    background: color-mix(in srgb, var(--ph-ui-bg, #fff) 94%, var(--ph-ui-fg, #222));
                }
                #ph-kek-upload .ph-kek-brand-mark {
                    flex: 0 0 32px; width: 32px; height: 32px; display: grid; place-items: center;
                    color: var(--ph-ui-accent-ink, #4f7fb2);
                    background: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 14%, transparent);
                    border-radius: 9px; font-size: 15px;
                }
                #ph-kek-upload .ph-kek-top-copy { min-width: 0; flex: 1 1 auto; }
                #ph-kek-upload .ph-kek-title {
                    display: block; margin: 0; font-size: 13px; line-height: 1.25;
                    font-weight: 750; color: var(--ph-ui-fg, #202124);
                }
                #ph-kek-upload .ph-kek-subtitle {
                    display: block; margin-top: 3px; color: var(--ph-ui-muted, #6b7280);
                    font-size: 10.5px; line-height: 1.35;
                }
                #ph-kek-upload .ph-kek-section-body { padding: 12px 13px; }
                #ph-kek-upload .ph-kek-upload-row {
                    position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto;
                    align-items: stretch; gap: 9px;
                }
                #ph-kek-upload .ph-kek-drop {
                    position: relative; width: 100%; min-width: 0; min-height: 66px;
                    margin: 0 !important; padding: 10px;
                    display: flex; align-items: center; gap: 10px; text-align: left;
                    background: var(--ph-ui-soft, rgba(0,0,0,.045));
                    border: 1px dashed color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 42%, var(--ph-ui-border, #ddd));
                    border-radius: 9px; cursor: pointer; touch-action: manipulation;
                    transition: background 150ms ease, border-color 150ms ease;
                }
                #ph-kek-upload .ph-kek-drop:hover,
                #ph-kek-upload .ph-kek-drop:focus-within,
                #ph-kek-upload .ph-kek-drop.is-dragover {
                    background: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 9%, var(--ph-ui-bg, #fff));
                    border-color: var(--ph-ui-accent-ink, #245d92);
                }
                #ph-kek-upload .ph-kek-drop:focus-within { outline: 2px solid var(--ph-ui-accent, #4f7fb2); outline-offset: 2px; }
                #ph-kek-upload .ph-kek-drop.is-busy { opacity: .65; }
                /* Valódi, közvetlenül megnyomható fájlválasztó a dropzóna felett.
                   Nincs showPicker()/programozott click(): Brave-ben is natív kattintás. */
                #ph-kek-upload .ph-kek-file-input {
                    position: absolute !important; inset: 0 !important; z-index: 2;
                    display: block !important; width: 100% !important; height: 100% !important;
                    padding: 0 !important; margin: 0 !important; border: 0 !important;
                    opacity: 0 !important; cursor: pointer; pointer-events: auto !important;
                }
                #ph-kek-upload .ph-kek-pick-icon {
                    flex: 0 0 36px; width: 36px; height: 36px; display: grid; place-items: center;
                    border: 1px solid var(--ph-ui-border, #ddd); border-radius: 9px;
                    background: var(--ph-ui-bg, #fff); color: var(--ph-ui-accent-ink, #4f7fb2); font-size: 15px;
                }
                #ph-kek-upload .ph-kek-file-copy { display: block; min-width: 0; flex: 1 1 auto; }
                #ph-kek-upload .ph-kek-file-label {
                    display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                    font-size: 12px; font-weight: 700; color: var(--ph-ui-fg, #202124);
                }
                #ph-kek-upload .ph-kek-file-hint {
                    display: block; margin-top: 3px; font-size: 10.5px;
                    color: var(--ph-ui-muted, #6b7280); line-height: 1.35;
                }
                #ph-kek-upload .ph-kek-primary {
                    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
                    min-height: 40px; min-width: 118px; padding: 9px 12px;
                    border: 1px solid var(--ph-ui-accent, #4f7fb2); border-radius: 8px;
                    color: var(--ph-ui-accent-fg, #fff); background: var(--ph-ui-accent, #4f7fb2);
                    font-size: 11.5px; font-weight: 700; line-height: 1.3;
                    transition: filter 140ms ease, transform 140ms ease;
                }
                #ph-kek-upload .ph-kek-primary:not(:disabled):hover { filter: brightness(1.08); }
                #ph-kek-upload .ph-kek-primary:not(:disabled):active { transform: scale(.985); }
                #ph-kek-upload .ph-kek-status {
                    margin-top: 9px; padding: 8px 10px; border-radius: 8px;
                    border: 1px solid var(--ph-ui-border, #ddd);
                    background: var(--ph-ui-soft, rgba(0,0,0,.045));
                    color: var(--ph-ui-muted, #6b7280); font-size: 11px;
                    line-height: 1.4; overflow-wrap: anywhere;
                }
                #ph-kek-upload .ph-kek-status:empty { display: none; }
                #ph-kek-upload .ph-kek-status[data-tone="success"] {
                    color: var(--ph-ui-success); background: color-mix(in srgb, var(--ph-ui-success) 9%, var(--ph-ui-bg, #fff));
                    border-color: color-mix(in srgb, var(--ph-ui-success) 27%, var(--ph-ui-border, #ddd));
                }
                #ph-kek-upload .ph-kek-status[data-tone="error"] {
                    color: var(--ph-ui-danger); background: color-mix(in srgb, var(--ph-ui-danger) 9%, var(--ph-ui-bg, #fff));
                    border-color: color-mix(in srgb, var(--ph-ui-danger) 28%, var(--ph-ui-border, #ddd));
                }
                #ph-kek-upload .ph-kek-gallery-section {
                    border-top: 1px solid var(--ph-ui-border, #ddd);
                }
                #ph-kek-upload .ph-kek-gallery-head {
                    display: flex; flex-wrap: wrap; align-items: center;
                    justify-content: space-between; gap: 8px; padding: 10px 13px;
                    border-bottom: 1px solid var(--ph-ui-border, #ddd);
                    background: color-mix(in srgb, var(--ph-ui-bg, #fff) 96%, var(--ph-ui-fg, #222));
                }
                #ph-kek-upload .ph-kek-gallery-heading { display: flex; align-items: center; gap: 7px; min-width: 0; }
                #ph-kek-upload .ph-kek-gallery-heading strong {
                    font-size: 12px; color: var(--ph-ui-fg, #202124);
                }
                #ph-kek-upload .ph-kek-count {
                    min-width: 24px; padding: 2px 6px; border-radius: 99px; text-align: center;
                    color: var(--ph-ui-accent-ink, #4f7fb2);
                    background: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 13%, transparent);
                    font-weight: 750; font-size: 10.5px;
                }
                #ph-kek-upload .ph-kek-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
                #ph-kek-upload .ph-kek-tabs {
                    display: flex; align-items: center; gap: 2px; padding: 3px;
                    border: 1px solid var(--ph-ui-border, #ddd);
                    border-radius: 8px; background: var(--ph-ui-soft, rgba(0,0,0,.045));
                }
                #ph-kek-upload .ph-kek-tab {
                    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
                    min-height: 29px; padding: 5px 9px; border: 0; border-radius: 6px;
                    background: transparent; color: var(--ph-ui-muted, #6b7280);
                    font-size: 11px; font-weight: 650; line-height: 1.2;
                }
                #ph-kek-upload .ph-kek-tab[aria-pressed="true"] {
                    background: var(--ph-ui-accent, #4f7fb2);
                    color: var(--ph-ui-accent-fg, #fff);
                }
                #ph-kek-upload .ph-kek-sync-badge {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 5px 7px; border: 1px solid var(--ph-ui-border, #ddd);
                    border-radius: 7px; color: var(--ph-ui-fg, #202124);
                    background: var(--ph-ui-soft, rgba(0,0,0,.045));
                    font-size: 10.5px; font-weight: 650; white-space: nowrap;
                }
                #ph-kek-upload .ph-kek-sync-badge[data-mode="cloud"] {
                    color: var(--ph-ui-fg, #202124);
                    background: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 9%, var(--ph-ui-bg, #fff));
                    border-color: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 23%, var(--ph-ui-border, #ddd));
                }
                #ph-kek-upload .ph-kek-sync-badge[data-mode="cloud"] .fas {
                    color: var(--ph-ui-accent-ink, #245d92);
                }
                #ph-kek-upload .ph-kek-toolbar-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    min-height: 35px; padding: 6px 9px;
                    border: 1px solid var(--ph-ui-border, #ddd); border-radius: 8px;
                    color: var(--ph-ui-fg, #202124);
                    background: var(--ph-ui-soft, rgba(0,0,0,.045));
                    font-size: 11px; font-weight: 650;
                }
                #ph-kek-upload .ph-kek-toolbar-btn:hover { color: var(--ph-ui-accent-ink, #4f7fb2); border-color: var(--ph-ui-accent, #4f7fb2); }
                #ph-kek-upload .ph-kek-toolbar-btn.is-danger:hover {
                    color: var(--ph-ui-danger); border-color: var(--ph-ui-danger);
                }
                #ph-kek-upload .ph-kek-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
                    align-content: start; gap: 9px; max-height: ${GALLERY_MAX_HEIGHT_PX}px;
                    padding: 12px; overflow-y: auto; overscroll-behavior-y: auto;
                    scrollbar-width: thin;
                }
                #ph-kek-upload .ph-kek-cell {
                    min-width: 0; overflow: hidden;
                    border: 1px solid var(--ph-ui-border, #ddd); border-radius: 9px;
                    background: var(--ph-ui-soft, rgba(0,0,0,.045));
                }
                #ph-kek-upload .ph-kek-thumb-link {
                    display: block; width: 100%; aspect-ratio: 1 / 1; overflow: hidden;
                    background: color-mix(in srgb, var(--ph-ui-muted, #777) 10%, var(--ph-ui-bg, #fff));
                }
                #ph-kek-upload .ph-kek-thumb-link img {
                    display: block; width: 100%; height: 100%; object-fit: cover;
                    transition: transform 170ms ease;
                }
                #ph-kek-upload .ph-kek-cell:hover .ph-kek-thumb-link img { transform: scale(1.035); }
                #ph-kek-upload .ph-kek-card-name {
                    display: block; padding: 5px 6px 4px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                    color: var(--ph-ui-muted, #6b7280); font-size: 10px;
                }
                #ph-kek-upload .ph-kek-actions {
                    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 3px; padding: 4px; border-top: 1px solid var(--ph-ui-border, #ddd);
                }
                #ph-kek-upload .ph-kek-action-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 100%; min-width: 0; height: 32px; padding: 0;
                    border: 1px solid transparent; border-radius: 6px;
                    color: var(--ph-ui-muted, #6b7280);
                    background: var(--ph-ui-bg, #fff); font-size: 12px;
                }
                #ph-kek-upload .ph-kek-action-btn:hover,
                #ph-kek-upload .ph-kek-action-btn:focus-visible {
                    color: var(--ph-ui-accent-ink, #4f7fb2);
                    border-color: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 33%, transparent);
                    background: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 12%, var(--ph-ui-bg, #fff));
                }
                #ph-kek-upload .ph-kek-action-btn.is-danger:hover,
                #ph-kek-upload .ph-kek-action-btn.is-danger:focus-visible {
                    color: var(--ph-ui-danger); border-color: color-mix(in srgb, var(--ph-ui-danger) 40%, transparent);
                    background: color-mix(in srgb, var(--ph-ui-danger) 10%, var(--ph-ui-bg, #fff));
                }
                #ph-kek-upload .ph-kek-list {
                    display: grid; gap: 6px; align-content: start;
                    max-height: ${GALLERY_MAX_HEIGHT_PX}px; overflow-y: auto;
                    padding: 10px 12px; overscroll-behavior-y: auto; scrollbar-width: thin;
                }
                #ph-kek-upload .ph-kek-list-row {
                    display: grid; grid-template-columns: 54px minmax(0, 1fr) auto;
                    align-items: center; gap: 9px; padding: 7px;
                    border: 1px solid var(--ph-ui-border, #ddd); border-radius: 9px;
                    background: var(--ph-ui-soft, rgba(0,0,0,.045)); min-width: 0;
                }
                #ph-kek-upload .ph-kek-list-thumb { display: block; width: 54px; height: 54px; border-radius: 6px; overflow: hidden; }
                #ph-kek-upload .ph-kek-list-thumb img { width: 100%; height: 100%; display: block; object-fit: cover; }
                #ph-kek-upload .ph-kek-list-meta { min-width: 0; }
                #ph-kek-upload .ph-kek-list-name {
                    display: block; font-size: 11.5px; font-weight: 700;
                    color: var(--ph-ui-fg, #202124);
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                #ph-kek-upload .ph-kek-list-url,
                #ph-kek-upload .ph-kek-list-extra {
                    display: block; margin-top: 3px; font-size: 10.5px;
                    color: var(--ph-ui-muted, #6b7280);
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                #ph-kek-upload .ph-kek-list-actions { display: flex; align-items: center; gap: 4px; }
                #ph-kek-upload .ph-kek-list-actions .ph-kek-action-btn { width: 34px; height: 34px; }
                #ph-kek-upload .ph-kek-empty {
                    margin: 12px; padding: 20px 10px; text-align: center;
                    border: 1px dashed var(--ph-ui-border, #ddd); border-radius: 9px;
                    color: var(--ph-ui-muted, #6b7280);
                    background: var(--ph-ui-soft, rgba(0,0,0,.045));
                    font-size: 11px; line-height: 1.55;
                }
                #ph-kek-upload .ph-kek-empty .fas {
                    display: block; margin-bottom: 8px; font-size: 20px;
                    color: var(--ph-ui-accent-ink, #245d92);
                }
                #ph-kek-upload .ph-kek-empty strong { display: block; color: var(--ph-ui-fg, #202124); font-size: 12px; }
                #ph-kek-upload .ph-kek-key-guide {
                    padding: 13px; color: var(--ph-ui-fg, #202124);
                    font-size: 11.5px; line-height: 1.65;
                }
                #ph-kek-upload .ph-kek-key-guide p { margin: 0 0 9px; }
                #ph-kek-upload .ph-kek-key-guide ol { margin: 0; padding-left: 20px; }
                #ph-kek-upload .ph-kek-key-guide a { color: var(--ph-ui-accent-ink, #4f7fb2); }
                #ph-kek-upload .ph-kek-key-guide .ph-kek-guide-tip {
                    display: block; margin-top: 10px; color: var(--ph-ui-muted, #6b7280);
                }
                @media (max-width: 640px) {
                    #ph-kek-upload .ph-kek-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; padding: 9px;
                    }
                    #ph-kek-upload .ph-kek-gallery-head { padding: 9px; }
                    #ph-kek-upload .ph-kek-section-body { padding: 10px; }
                    #ph-kek-upload .ph-kek-list { padding: 8px; }
                }
                @media (max-width: 520px) {
                    #ph-kek-upload .ph-kek-upload-row { grid-template-columns: minmax(0, 1fr); }
                    #ph-kek-upload .ph-kek-primary { width: 100%; min-height: 39px; }
                    #ph-kek-upload .ph-kek-tools { width: 100%; justify-content: space-between; }
                    #ph-kek-upload .ph-kek-tab { min-width: 37px; padding-inline: 7px; }
                    #ph-kek-upload .ph-kek-tab-label,
                    #ph-kek-upload .ph-kek-toolbar-label { display: none; }
                    #ph-kek-upload .ph-kek-toolbar-btn { width: 36px; min-width: 36px; padding: 0; }
                    #ph-kek-upload .ph-kek-sync-badge { margin-left: auto; }
                    #ph-kek-upload .ph-kek-toolbar-btn { min-height: 35px; }
                    #ph-kek-upload .ph-kek-list-row { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 6px; padding: 6px; }
                    #ph-kek-upload .ph-kek-list-thumb { width: 44px; height: 44px; }
                    #ph-kek-upload .ph-kek-list-actions { gap: 2px; }
                    #ph-kek-upload .ph-kek-list-actions .ph-kek-action-btn { width: 29px; height: 34px; }
                }
                @media (max-width: 360px) {
                    #ph-kek-upload .ph-kek-grid { gap: 5px; padding: 6px; }
                    #ph-kek-upload .ph-kek-actions { padding: 3px; gap: 2px; }
                    #ph-kek-upload .ph-kek-action-btn { height: 31px; }
                    #ph-kek-upload .ph-kek-top { padding: 9px; }
                    #ph-kek-upload .ph-kek-subtitle { font-size: 10px; }
                    #ph-kek-upload .ph-kek-list-extra { display: none; }
                }
                @media (prefers-reduced-motion: reduce) {
                    #ph-kek-upload .ph-kek-thumb-link img,
                    #ph-kek-upload .ph-kek-primary,
                    #ph-kek-upload .ph-kek-drop { transition: none; }
                }
            `);
        }

        function updateSyncBadge(wrapper = document) {
            const el = wrapper.querySelector("#ph-kek-sync-badge");
            if (!el) return;
            el.dataset.mode = ENABLE_GIST_SYNC ? "cloud" : "local";
            el.innerHTML = ENABLE_GIST_SYNC
                ? '<span class="fas fa-cloud" aria-hidden="true"></span><span>Gist aktív</span>'
                : '<span class="fas fa-save" aria-hidden="true"></span><span>Helyi mentés</span>';
            el.title = ENABLE_GIST_SYNC ? "Gist-szinkronizálás bekapcsolva" : "A galéria ezen az eszközön tárolódik";
        }

        function setActiveTab(wrapper, tab) {
            const isGrid = tab !== "list";
            wrapper.dataset.activeTab = isGrid ? "grid" : "list";
            wrapper.querySelector("#ph-kek-tab-grid")?.setAttribute("aria-pressed", String(isGrid));
            wrapper.querySelector("#ph-kek-tab-list")?.setAttribute("aria-pressed", String(!isGrid));
            const viewGrid = wrapper.querySelector("#ph-kek-view-grid");
            const viewList = wrapper.querySelector("#ph-kek-view-list");
            if (viewGrid) viewGrid.hidden = !isGrid;
            if (viewList) viewList.hidden = isGrid;
        }

        const RESET_KEY = KEYS.KEK.GALLERY_RESET_TS;
        const SEEN_RESET_KEY = KEYS.KEK.GALLERY_SEEN_RESET_TS;
        // NOTE: KEYS.KEK.GALLERY_SEEN_RESET_TS = local-only ack, don't sync

        function applyGalleryResetIfNeeded() {
            const resetTs = parseInt(storage.getItem(RESET_KEY) || "0", 10) || 0;
            const seenTs = parseInt(localStorage.getItem(SEEN_RESET_KEY) || "0", 10) || 0;

            if (resetTs > 0 && resetTs > seenTs) {
                // Csak a reset ELŐTTI képeket dobjuk. A korábbi megoldás egy új gépen
                // a Gistből frissen lehúzott, reset után feltöltött képeket is kitörölte.
                const current = loadGallery();
                const kept = current.filter(it => {
                    const createdTs = Date.parse(it?.createdAt || "");
                    return Number.isFinite(createdTs) && createdTs > resetTs;
                });

                if (kept.length !== current.length) {
                    if (kept.length) storage.setItem(LS_KEY, JSON.stringify(kept));
                    else storage.removeItem(LS_KEY);
                }

                // local-only ack, do NOT sync
                localStorage.setItem(SEEN_RESET_KEY, String(resetTs));
            }
        }

        function formatKekFileSize(bytes) {
            const size = Number(bytes);
            if (!Number.isFinite(size) || size < 0) return "";
            if (size < 1024) return `${Math.round(size)} B`;
            if (size < 1024 * 1024) return `${(size / 1024).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} KB`;
            return `${(size / (1024 * 1024)).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} MB`;
        }

        function makeKekAction(item, action, icon, label) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `ph-kek-action-btn${action === "delete" ? " is-danger" : ""}`;
            button.dataset.action = action;
            button.dataset.url = item.url;
            button.title = label;
            button.setAttribute("aria-label", `${label}: ${item.originalName || item.filename || "kép"}`);
            button.innerHTML = `<span class="fas ${icon}" aria-hidden="true"></span>`;
            return button;
        }

        function renderGallery(wrapper) {
            applyGalleryResetIfNeeded();
            if (!wrapper) return;

            const items = loadGallery();
            const gridEl = wrapper.querySelector("#ph-kek-grid");
            const listEl = wrapper.querySelector("#ph-kek-list");
            const emptyGrid = wrapper.querySelector("#ph-kek-empty-grid");
            const emptyList = wrapper.querySelector("#ph-kek-empty-list");
            const count = wrapper.querySelector("#ph-kek-count");
            if (!gridEl || !listEl) return;

            gridEl.replaceChildren();
            listEl.replaceChildren();
            if (count) count.textContent = String(items.length);
            if (emptyGrid) emptyGrid.hidden = items.length > 0;
            if (emptyList) emptyList.hidden = items.length > 0;
            if (!items.length) return;

            const gridFragment = document.createDocumentFragment();
            const listFragment = document.createDocumentFragment();

            for (const item of items) {
                if (!item || typeof item.url !== "string" || !/^https?:\/\//i.test(item.url)) continue;
                const name = item.originalName || item.filename || item.url.split("/").pop() || "Kép";

                const cell = document.createElement("article");
                cell.className = "ph-kek-cell";
                const link = document.createElement("a");
                link.className = "ph-kek-thumb-link";
                link.href = item.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.title = "Kép megnyitása új lapon";

                const img = document.createElement("img");
                img.src = item.url;
                img.alt = name;
                img.loading = "lazy";
                img.decoding = "async";
                link.appendChild(img);

                const caption = document.createElement("span");
                caption.className = "ph-kek-card-name";
                caption.textContent = name;
                caption.title = name;

                const actions = document.createElement("div");
                actions.className = "ph-kek-actions";
                actions.append(
                    makeKekAction(item, "insert-image", "fa-image", "Kép beszúrása"),
                    makeKekAction(item, "insert-link", "fa-link", "Képlink beszúrása"),
                    makeKekAction(item, "delete", "fa-trash", "Kép törlése")
                );
                cell.append(link, caption, actions);
                gridFragment.appendChild(cell);

                const row = document.createElement("article");
                row.className = "ph-kek-list-row";
                const thumbLink = document.createElement("a");
                thumbLink.className = "ph-kek-list-thumb";
                thumbLink.href = item.url;
                thumbLink.target = "_blank";
                thumbLink.rel = "noopener noreferrer";
                thumbLink.title = "Kép megnyitása új lapon";
                const thumb = document.createElement("img");
                thumb.src = item.url;
                thumb.alt = name;
                thumb.loading = "lazy";
                thumb.decoding = "async";
                thumbLink.appendChild(thumb);

                const meta = document.createElement("div");
                meta.className = "ph-kek-list-meta";
                const rowName = document.createElement("span");
                rowName.className = "ph-kek-list-name";
                rowName.textContent = name;
                rowName.title = name;
                const rowUrl = document.createElement("span");
                rowUrl.className = "ph-kek-list-url";
                rowUrl.textContent = item.url;
                rowUrl.title = item.url;
                meta.append(rowName, rowUrl);

                const details = [formatKekFileSize(item.size)];
                const createdDate = Date.parse(item.createdAt || "");
                if (Number.isFinite(createdDate)) details.push(new Date(createdDate).toLocaleDateString("hu-HU"));
                if (details.filter(Boolean).length) {
                    const extra = document.createElement("span");
                    extra.className = "ph-kek-list-extra";
                    extra.textContent = details.filter(Boolean).join(" · ");
                    meta.appendChild(extra);
                }

                const rowActions = document.createElement("div");
                rowActions.className = "ph-kek-list-actions";
                rowActions.append(
                    makeKekAction(item, "insert-image", "fa-image", "Kép beszúrása"),
                    makeKekAction(item, "insert-link", "fa-link", "Képlink beszúrása"),
                    makeKekAction(item, "delete", "fa-trash", "Kép törlése")
                );
                row.append(thumbLink, meta, rowActions);
                listFragment.appendChild(row);
            }

            gridEl.appendChild(gridFragment);
            listEl.appendChild(listFragment);
        }

        const selectedKekFiles = new WeakMap();

        function getKekSelectedFile(wrapper) {
            return (wrapper && selectedKekFiles.get(wrapper)) || null;
        }

        function refreshKekFileSelection(wrapper) {
            if (!wrapper) return;
            const file = getKekSelectedFile(wrapper);
            const label = wrapper.querySelector("#ph-kek-file-label");
            const hint = wrapper.querySelector("#ph-kek-file-hint");
            const button = wrapper.querySelector("#ph-kek-upload-btn");
            const drop = wrapper.querySelector(".ph-kek-drop");
            const busy = wrapper.dataset.uploading === "true";
            if (label) { label.textContent = file ? file.name : "Kép kiválasztása"; label.title = file?.name || ""; }
            if (hint) hint.textContent = file
                ? [formatKekFileSize(file.size), "Kattints a cseréhez"].filter(Boolean).join(" · ")
                : "Kattints ide vagy húzz ide egy képet · max. 5 MB";
            if (button) button.disabled = busy || !file;
            if (drop) { drop.classList.toggle("is-busy", busy); drop.dataset.hasFile = file ? "true" : "false"; }
        }

        function setKekUploading(wrapper, busy) {
            if (!wrapper) return;
            wrapper.dataset.uploading = busy ? "true" : "false";
            const input = wrapper.querySelector("#ph-kek-file");
            if (input) input.disabled = busy;
            const buttonText = wrapper.querySelector("#ph-kek-upload-btn .ph-kek-upload-button-label");
            const buttonIcon = wrapper.querySelector("#ph-kek-upload-btn .fas");
            if (buttonText) buttonText.textContent = busy ? "Feltöltés…" : "Feltöltés";
            if (buttonIcon) buttonIcon.className = busy ? "fas fa-spinner fa-spin" : "fas fa-cloud-upload-alt";
            refreshKekFileSelection(wrapper);
        }

        function bindKekPickerGlobalEvents() {
            const isKekFileInput = target => !!target?.matches?.("#ph-kek-upload #ph-kek-file");

            window.addEventListener("click", e => {
                const drop = e.target?.closest?.("#ph-kek-upload .ph-kek-drop");
                if (!drop) return;
                // A label/input natív kattintás marad: nincs preventDefault,
                // input.click vagy showPicker, tehát nincs elvesző aktiváció.
                e.stopPropagation();
            }, true);

            const rememberPickedFile = e => {
                if (!isKekFileInput(e.target)) return;
                e.stopPropagation();
                const input = e.target;
                const wrapper = input.closest("#ph-kek-upload");
                if (!wrapper || wrapper.dataset.uploading === "true") return;
                const file = input.files?.[0];
                if (!file) return; // Még nincs fájl, vagy a választást megszakították.

                selectedKekFiles.set(wrapper, file);
                input.value = "";
                refreshKekFileSelection(wrapper);
                setStatus(wrapper, "");
            };
            for (const type of ["input", "change"]) {
                window.addEventListener(type, rememberPickedFile, true);
            }

            const handleDrag = e => {
                const drop = e.target?.closest?.("#ph-kek-upload .ph-kek-drop");
                if (!drop) return;
                e.preventDefault();
                e.stopPropagation();
                const wrapper = drop.closest("#ph-kek-upload");
                if (!wrapper) return;
                const busy = wrapper.dataset.uploading === "true";
                if (e.type === "dragleave") {
                    if (!drop.contains(e.relatedTarget)) drop.classList.remove("is-dragover");
                    return;
                }
                if (e.type === "dragenter" || e.type === "dragover") {
                    if (!busy) {
                        drop.classList.add("is-dragover");
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
                    }
                    return;
                }
                if (e.type !== "drop") return;
                drop.classList.remove("is-dragover");
                if (busy) return;

                const file = Array.from(e.dataTransfer?.files || []).find(f =>
                    f.type?.startsWith("image/") || (!f.type && /\.(jpe?g|png|gif|webp|avif|bmp|svg|heic|heif|tiff?)$/i.test(f.name || ""))
                );
                if (!file) {
                    setStatus(wrapper, "Húzz ide egy képfájlt a fájlkezelőből (például JPG, PNG vagy WebP).", "error");
                    return;
                }
                selectedKekFiles.set(wrapper, file);
                const input = wrapper.querySelector("#ph-kek-file");
                if (input) input.value = "";
                refreshKekFileSelection(wrapper);
                setStatus(wrapper, "");
            };
            for (const type of ["dragenter", "dragover", "dragleave", "drop"]) {
                window.addEventListener(type, handleDrag, true);
            }
        }

        function bindKekFilePicker(wrapper) {
            // A file input fölött teljes felületű, natívan kattintható overlay van.
            // A change/input feldolgozás központilag, capture szakaszban történik.
            refreshKekFileSelection(wrapper);
        }

        bindKekPickerGlobalEvents();

        function ensureUi(target) {
            if (!target) return null;
            if (target.querySelector("#ph-kek-upload")) return target.querySelector("#ph-kek-upload");

            injectCssOnce();
            const wrapper = document.createElement("section");
            wrapper.id = "ph-kek-upload";
            wrapper.dataset.activeTab = "grid";
            wrapper.innerHTML = `
                <header class="ph-kek-top">
                    <span class="ph-kek-brand-mark" aria-hidden="true"><span class="fas fa-images"></span></span>
                    <div class="ph-kek-top-copy">
                        <strong class="ph-kek-title">kek.sh képfeltöltő</strong>
                        <span class="ph-kek-subtitle">PH Power Tools · Képek feltöltése és beszúrása</span>
                    </div>
                </header>
            `;

            if (!hasKekKey()) {
                wrapper.insertAdjacentHTML("beforeend", `
                    <div class="ph-kek-key-guide">
                        <p><strong>A képfeltöltéshez kek.sh API-kulcs szükséges.</strong></p>
                        <ol>
                            <li>Jelentkezz be a <a href="https://kek.sh/" target="_blank" rel="noopener noreferrer">kek.sh</a> oldalra.</li>
                            <li>Másold ki az <a href="https://kek.sh/settings/api" target="_blank" rel="noopener noreferrer">API-kulcsodat</a>.</li>
                            <li>Add meg a <strong>PH Power Tools → Kulcsok és szinkron</strong> ablakban.</li>
                        </ol>
                        
                        </ol>
                        <span class="ph-kek-guide-tip">
                            Ingyenes csomag:
                            <b>5 GB</b> tárhely ·
                            <b>1000</b> kép ·
                            <b>5 MB/kép</b>.
                            <a href="https://kek.sh/pricing"
                               target="_blank"
                               rel="noopener noreferrer">
                                Részletek
                            </a>
                        </span>
                        
                        <span class="ph-kek-guide-tip">
                            A kulcs mentése után az oldal újratöltődik,
                            és megjelenik a feltöltő.
                        </span>
                    </div>
                `);
                target.appendChild(wrapper);
                return wrapper;
            }

            wrapper.insertAdjacentHTML("beforeend", `
                <div class="ph-kek-section-body">
                    <div class="ph-kek-upload-row" id="ph-kek-upload-row">
                        <label class="ph-kek-drop" title="Válassz egy képfájlt, vagy húzd ide">
                            <input id="ph-kek-file" class="ph-kek-file-input" type="file" accept="image/*"
                                   aria-label="Képfájl kiválasztása">
                            <span class="ph-kek-pick-icon" aria-hidden="true"><span class="fas fa-plus"></span></span>
                            <span class="ph-kek-file-copy">
                                <span id="ph-kek-file-label" class="ph-kek-file-label">Kép kiválasztása</span>
                                <span id="ph-kek-file-hint" class="ph-kek-file-hint">Kattints ide vagy húzz ide egy képet</span>
                            </span>
                        </label>
                        <button id="ph-kek-upload-btn" type="button" class="ph-kek-primary" disabled>
                            <span class="fas fa-cloud-upload-alt" aria-hidden="true"></span>
                            <span class="ph-kek-upload-button-label">Feltöltés</span>
                        </button>
                    </div>
                    <div id="ph-kek-status" class="ph-kek-status" role="status" aria-live="polite"></div>
                </div>
                <section class="ph-kek-gallery-section" aria-label="Feltöltött képek">
                    <header id="ph-kek-gallery-head" class="ph-kek-gallery-head">
                        <div class="ph-kek-gallery-heading">
                            <span class="fas fa-images" aria-hidden="true"></span>
                            <strong>Képeim</strong>
                            <span id="ph-kek-count" class="ph-kek-count" aria-label="Képek száma">0</span>
                        </div>
                        <div class="ph-kek-tools">
                            <div class="ph-kek-tabs" role="group" aria-label="Galéria nézet">
                                <button type="button" id="ph-kek-tab-grid" class="ph-kek-tab" aria-pressed="true" title="Rácsnézet">
                                    <span class="fas fa-th-large" aria-hidden="true"></span><span class="ph-kek-tab-label">Rács</span>
                                </button>
                                <button type="button" id="ph-kek-tab-list" class="ph-kek-tab" aria-pressed="false" title="Listanézet">
                                    <span class="fas fa-list" aria-hidden="true"></span><span class="ph-kek-tab-label">Lista</span>
                                </button>
                            </div>
                            <span id="ph-kek-sync-badge" class="ph-kek-sync-badge"></span>
                            ${ENABLE_GIST_SYNC ? `
                                <button type="button" id="ph-kek-sync-now" class="ph-kek-toolbar-btn" title="Galéria szinkronizálása" aria-label="Galéria szinkronizálása">
                                    <span class="fas fa-sync-alt" aria-hidden="true"></span><span class="ph-kek-toolbar-label">Szinkron</span>
                                </button>
                            ` : ``}
                            <button type="button" id="ph-kek-clear" class="ph-kek-toolbar-btn is-danger"
                                    title="Összes kép törlése a szerverről és a galériából" aria-label="Összes kép törlése">
                                <span class="fas fa-trash" aria-hidden="true"></span><span class="ph-kek-toolbar-label">Mind törlése</span>
                            </button>
                        </div>
                    </header>
                    <div id="ph-kek-view-grid">
                        <div id="ph-kek-empty-grid" class="ph-kek-empty" hidden>
                            <span class="fas fa-images" aria-hidden="true"></span>
                            <strong>Még nincs feltöltött kép</strong>
                            Feltöltés után itt jelennek meg a képeid.
                        </div>
                        <div id="ph-kek-grid" class="ph-kek-grid" aria-label="Képek rácsnézetben"></div>
                    </div>
                    <div id="ph-kek-view-list" hidden>
                        <div id="ph-kek-empty-list" class="ph-kek-empty" hidden>
                            <span class="fas fa-images" aria-hidden="true"></span>
                            <strong>Még nincs feltöltött kép</strong>
                            Feltöltés után itt jelennek meg a képeid.
                        </div>
                        <div id="ph-kek-list" class="ph-kek-list" aria-label="Képek listanézetben"></div>
                    </div>
                </section>
            `);

            target.appendChild(wrapper);
            bindKekFilePicker(wrapper);
            setActiveTab(wrapper, "grid");
            renderGallery(wrapper);
            updateSyncBadge(wrapper);
            return wrapper;
        }

        function setStatus(wrapperOrDoc, message, tone = "info") {
            const status = (wrapperOrDoc instanceof HTMLElement)
                ? wrapperOrDoc.querySelector("#ph-kek-status")
                : document.getElementById("ph-kek-status");
            if (!status) return;
            status.textContent = message || "";
            if (message) status.dataset.tone = tone;
            else status.removeAttribute("data-tone");
        }

        function getWrapperFromEvent(e) {
            return e.target?.closest?.("#ph-kek-upload") || document.getElementById("ph-kek-upload");
        }

        /* ================= UPLOAD ================= */

        function handleUpload(e) {
            applyGalleryResetIfNeeded();
            const wrapper = getWrapperFromEvent(e);
            if (!wrapper || wrapper.dataset.uploading === "true") return;
            const fileInput = wrapper.querySelector("#ph-kek-file");
            const file = getKekSelectedFile(wrapper);
            if (!file) {
                setStatus(wrapper, "Előbb válassz ki egy képet.", "error");
                return;
            }
            if (file.type && !file.type.startsWith("image/")) {
                setStatus(wrapper, "Csak képfájlt lehet feltölteni.", "error");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            setKekUploading(wrapper, true);
            setStatus(wrapper, "Feltöltés folyamatban…");

            try {
                gmRequest({
                    method: "POST",
                    url: "https://kek.sh/api/v1/posts",
                    headers: { "x-kek-auth": KEK_SH_API_KEY },
                    data: formData,
                    timeout: 120000,
                    onprogress: event => {
                        if (event.lengthComputable && event.total > 0) {
                            const percent = Math.min(99, Math.round(event.loaded / event.total * 100));
                            setStatus(wrapper, `Feltöltés: ${percent}%`);
                        }
                    },
                    onload: async res => {
                        try {
                            if (res.status < 200 || res.status >= 300) {
                                setStatus(wrapper, `Feltöltési hiba (HTTP ${res.status}).`, "error");
                                return;
                            }
                            const json = safeJsonParse(res.responseText, null);
                            if (!json) {
                                setStatus(wrapper, "A szerver válasza nem érvényes JSON.", "error");
                                return;
                            }
                            const url = buildImageUrlFromApi(json);
                            if (!url) {
                                setStatus(wrapper, "A szerver válaszából hiányzik a kép URL-je.", "error");
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

                            if (ENABLE_GIST_SYNC && typeof storage.flush === "function") {
                                try {
                                    await storage.flush();
                                    setStatus(wrapper, "Kép feltöltve, galériába mentve és Gistbe szinkronizálva.", "success");
                                } catch (error) {
                                    console.error("[PH Power Tools] Gallery upload sync failed:", error);
                                    setStatus(wrapper, `A kép feltöltve, de a Gist-szinkron hibázott: ${error?.message || "ismeretlen hiba"}`, "error");
                                }
                            } else {
                                setStatus(wrapper, "Kép sikeresen feltöltve és a galériába mentve.", "success");
                            }

                            renderGallery(wrapper);
                            updateSyncBadge(wrapper);
                            selectedKekFiles.delete(wrapper);
                            if (fileInput) fileInput.value = "";
                        } catch (error) {
                            console.error("[PH Power Tools] kek.sh upload failed:", error);
                            setStatus(wrapper, `Feltöltési vagy mentési hiba: ${error?.message || "ismeretlen hiba"}`, "error");
                        } finally {
                            setKekUploading(wrapper, false);
                        }
                    },
                    onerror: () => {
                        setStatus(wrapper, "Hálózati hiba történt feltöltés közben.", "error");
                        setKekUploading(wrapper, false);
                    },
                    ontimeout: () => {
                        setStatus(wrapper, "A feltöltés időtúllépés miatt megszakadt.", "error");
                        setKekUploading(wrapper, false);
                    },
                    onabort: () => {
                        setStatus(wrapper, "A feltöltés megszakadt.", "error");
                        setKekUploading(wrapper, false);
                    }
                });
            } catch (error) {
                console.error("[PH Power Tools] kek.sh upload request failed:", error);
                setStatus(wrapper, `Nem sikerült elindítani a feltöltést: ${error?.message || "ismeretlen hiba"}`, "error");
                setKekUploading(wrapper, false);
            }
        }

        /* ================= EVENTS ================= */

        document.addEventListener("click", async e => {
            const wrapper = getWrapperFromEvent(e);
            if (!wrapper || !wrapper.contains(e.target)) return;

            const uploadBtn = e.target.closest("#ph-kek-upload-btn");
            const clearBtn = e.target.closest("#ph-kek-clear");
            const tabGrid = e.target.closest("#ph-kek-tab-grid");
            const tabList = e.target.closest("#ph-kek-tab-list");
            const syncNowBtn = e.target.closest("#ph-kek-sync-now");
            const actionBtn = e.target.closest("#ph-kek-upload button[data-action]");

            if (uploadBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleUpload(e);
                return;
            }

            if (tabGrid || tabList) {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab(wrapper, tabGrid ? "grid" : "list");
                return;
            }

            if (clearBtn) {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm("Biztos törlöd az ÖSSZES kek.sh képed a szerverről is?")) return;
                clearBtn.disabled = true;
                setStatus(wrapper, "Összes kép törlése a szerverről…");
                try {
                    const response = await deleteAllRemotePosts();
                    if (!response.ok) {
                        setStatus(wrapper, `Nem sikerült mindent törölni a szerveren (HTTP ${response.status}).`, "error");
                        return;
                    }

                    storage.setItem(KEYS.KEK.GALLERY_RESET_TS, String(Date.now()));
                    storage.removeItem(KEYS.KEK.GALLERY_DELETED);
                    await clearGallery();
                    renderGallery(wrapper);

                    if (ENABLE_GIST_SYNC && typeof storage.flush === "function") {
                        try {
                            await storage.flush();
                            setStatus(wrapper, "Minden kép törölve a szerverről, a galériából és a Gistből.", "success");
                        } catch (error) {
                            setStatus(wrapper, `A szerver és a helyi galéria ürítve, de a Gist-szinkron hibázott: ${error?.message || "ismeretlen hiba"}`, "error");
                        }
                    } else {
                        setStatus(wrapper, "Minden kép törölve a szerverről és a galériából.", "success");
                    }
                    updateSyncBadge(wrapper);
                } catch (error) {
                    console.error("[PH Power Tools] kek.sh gallery clear failed:", error);
                    setStatus(wrapper, `Törlési hiba: ${error?.message || "ismeretlen hiba"}`, "error");
                } finally {
                    clearBtn.disabled = false;
                }
                return;
            }

            if (syncNowBtn) {
                e.preventDefault();
                e.stopPropagation();
                if (ENABLE_GIST_SYNC && typeof storage.syncNow === "function") {
                    syncNowBtn.disabled = true;
                    setStatus(wrapper, "Galéria szinkronizálása a Gisttel…");
                    try {
                        await storage.syncNow();
                        applyGalleryResetIfNeeded();
                        renderGallery(wrapper);
                        setStatus(wrapper, `Szinkron kész (${loadGallery().length} kép).`, "success");
                    } catch (error) {
                        console.error("[PH Power Tools] Manual Gist sync failed:", error);
                        setStatus(wrapper, `Szinkronizálási hiba: ${error?.message || "ismeretlen hiba"}`, "error");
                    } finally {
                        syncNowBtn.disabled = false;
                        updateSyncBadge(wrapper);
                    }
                }
                return;
            }

            if (!actionBtn) return;
            e.preventDefault();
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            const url = actionBtn.dataset.url;
            if (!url) return;
            const editor = findEditorNear(wrapper);

            if (action === "insert-image") {
                const ok = insertHtmlIntoEditor(editor, `<img src="${escapeHtml(url)}" alt="">`);
                setStatus(wrapper, ok ? "Kép beszúrva a hozzászólásba." : "Nem található a szerkesztő.", ok ? "success" : "error");
                return;
            }

            if (action === "insert-link") {
                const ok = insertHtmlIntoEditor(editor, buildLinkHtml(url));
                setStatus(wrapper, ok ? "Képlink beszúrva a hozzászólásba." : "Nem található a szerkesztő.", ok ? "success" : "error");
                return;
            }

            if (action === "delete") {
                const item = loadGallery().find(x => x.url === url);
                const hasRemoteId = !!item?.id;
                const question = hasRemoteId
                    ? "Biztos törlöd ezt a képet a kek.sh szerverről is?"
                    : "Ehhez a képhez nincs szerverazonosító. Csak a helyi galériából törlöd. Folytatod?";
                if (!confirm(question)) return;

                actionBtn.disabled = true;
                try {
                    if (hasRemoteId) {
                        setStatus(wrapper, "Kép törlése a szerverről…");
                        const response = await deleteRemotePost(item.id);
                        if (!response.ok) {
                            setStatus(wrapper, `Nem sikerült törölni a képet a szerverről (HTTP ${response.status}).`, "error");
                            return;
                        }
                    }

                    const deleted = loadDeletedMap();
                    deleted[url] = Date.now();
                    saveDeletedMap(deleted);
                    await removeFromGallery(url);
                    renderGallery(wrapper);

                    if (ENABLE_GIST_SYNC && typeof storage.flush === "function") {
                        try {
                            await storage.flush();
                        } catch (error) {
                            setStatus(wrapper, `A kép törölve, de a Gist-szinkron hibázott: ${error?.message || "ismeretlen hiba"}`, "error");
                            return;
                        }
                    }
                    setStatus(wrapper, hasRemoteId
                        ? "Kép törölve a szerverről és a galériából."
                        : "A régi kép törölve a helyi galériából.", "success");
                    updateSyncBadge(wrapper);
                } catch (error) {
                    console.error("[PH Power Tools] kek.sh image delete failed:", error);
                    setStatus(wrapper, `Törlési hiba: ${error?.message || "ismeretlen hiba"}`, "error");
                } finally {
                    actionBtn.disabled = false;
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

    function giveawayAnswerChecker() {
        const $ = window.jQuery;

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

        async function fetchPage(url) {
            const res = await fetch(url, { credentials: "include" });
            const text = await res.text();
            return { responseText: text };
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

        function highlightCurrentUser(container) {
            let isFound = false;

            container.find("a").each(function () {
                const a = $(this);
                if (a.text().trim() === USER) {
                    a.css({
                        "font-weight": "bold",
                        "color": "#ffffff",
                        "background-color": "#ff6600",
                        "padding": "2px 8px",
                        "border-radius": "4px",
                        "display": "inline-block",
                        "box-shadow": "0 0 10px rgba(255,102,0,0.8)",
                        "text-decoration": "none",
                        "border": "1px solid #fff"
                    });
                    isFound = true;
                }
            });
            return isFound;
        }

        function watchWinnersList() {
            const alreadyFound = checkAndHighlight();

            if (alreadyFound) return;

            const targetNode = document.body;
            const observerOptions = {
                childList: true,
                subtree: true
            };

            const observer = new MutationObserver((mutations, obs) => {
                checkAndHighlight(obs);
            });

            observer.observe(targetNode, observerOptions);
        }

        function checkAndHighlight(observerInstance = null) {
            const contentBody = $(".content-body");

            if (contentBody.length) {
                const found = highlightCurrentUser(contentBody);
                if (found && observerInstance) {
                    observerInstance.disconnect();
                }
                return found;
            }
            return false;
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
    }

    function stickySidebar() {
        injectStyleOnce('ph-sticky-sidebar-style', `
            #right.slotSingleColumn::-webkit-scrollbar,
            #left::-webkit-scrollbar {
                width: 4px;
            }
            #right.slotSingleColumn::-webkit-scrollbar-thumb,
            #left::-webkit-scrollbar-thumb {
                background-color: #ccc;
                border-radius: 10px;
            }
            .active-topic-sidebar {
                background-color: #e9e0c9 !important;
                font-weight: bold !important;
                box-shadow: inset 5px 0px 0 0;
                padding-left: 10px !important;
            }
            .active-topic-sidebar a {
                color: #000 !important;
            }
            body[data-theme="dark"] .active-topic-sidebar {
                background-color: #3a352a !important;
                box-shadow: inset 5px 0px 0 0 #e0e0e0;
            }
            body[data-theme="dark"] .active-topic-sidebar a {
                color: var(--ph-ui-fg) !important;
            }
            .active-topic-header {
                background-color: #e9e0c9 !important;
                font-weight: bold !important;
                box-shadow: inset 5px 0px 0 0 #000000;
            }
            .active-topic-header a {
                color: #000 !important;
            }
            body[data-theme="dark"] .active-topic-header {
                background-color: #3a352a !important;
                box-shadow: inset 5px 0px 0 0 #e0e0e0;
            }
            body[data-theme="dark"] .active-topic-header a {
                color: var(--ph-ui-fg) !important;
            }
            /* Asztalon megmarad a sticky oldalsav es a kulon gorgetes. */
            @media (min-width: 992px) {
                #right.slotSingleColumn {
                    padding-left: 4px;
                    margin-left: -4px;
                }
                #right.slotSingleColumn,
                #left {
                    position: sticky;
                    top: 85px;
                    max-height: calc(100vh - 55px);
                    overflow-y: auto;
                    overscroll-behavior-y: contain;
                    overscroll-behavior-x: auto;
                    transition: top 0.3s ease, max-height 0.3s ease;
                }
                html.scroll-down #right.slotSingleColumn,
                html.scroll-down #left {
                    top: 45px;
                    max-height: calc(100vh - 10px);
                }
            }
            /* Mobilon es tableten a dokumentum az egyetlen fuggoleges scroller.
               A webhely sajat magassagi/overflow beallitasait is felulirjuk. */
            @media (max-width: 991.98px) {
                #right.slotSingleColumn,
                #left {
                    position: static !important;
                    top: auto !important;
                    bottom: auto !important;
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    overscroll-behavior: auto !important;
                    transition: none !important;
                }
                #right.slotSingleColumn {
                    padding-left: 0 !important;
                    margin-left: 0 !important;
                }
            }
        `);

        const desktopSidebarQuery = window.matchMedia('(min-width: 992px)');

        // Szelesbol mobilnezetbe valtaskor a desktop sidebar korabbi
        // belso scroll pozicioja sem tarthatja vissza a tartalmat.
        function resetMobileSidebarScroll() {
            if (desktopSidebarQuery.matches) return;
            for (const sidebar of document.querySelectorAll('#right.slotSingleColumn, #left')) {
                if (sidebar.scrollTop !== 0) sidebar.scrollTop = 0;
            }
        }
        resetMobileSidebarScroll();
        if (desktopSidebarQuery.addEventListener) {
            desktopSidebarQuery.addEventListener('change', resetMobileSidebarScroll);
        } else if (desktopSidebarQuery.addListener) {
            desktopSidebarQuery.addListener(resetMobileSidebarScroll);
        }

        const currentMatch = window.location.pathname.match(/\/tema\/[^/]+\//);
        if (!currentMatch) return;

        const currentTopicId = currentMatch[0];

        // Sidebar (#right) - desktop
        document.querySelectorAll('.user-thread-list a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes(currentTopicId)) {
                const li = link.closest('li');
                if (li) {
                    li.classList.add('active-topic-sidebar');
                    const sidebar = document.querySelector('#right.slotSingleColumn');
                    if (sidebar && desktopSidebarQuery.matches) {
                        const liRect = li.getBoundingClientRect();
                        const sidebarRect = sidebar.getBoundingClientRect();
                        const scrollTarget = sidebar.scrollTop
                            + liRect.top
                            - sidebarRect.top
                            - (sidebar.clientHeight / 2)
                            + (li.clientHeight / 2);
                        sidebar.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                    }
                }
            }
        });

        // Header dropdown list - mobil/tablet
        document.querySelectorAll('.header-thread-list a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes(currentTopicId)) {
                const li = link.closest('li');
                if (li) li.classList.add('active-topic-header');
            }
        });
    }

    function mobileScrollNav() {
        const POSITION_KEY = 'ph_mobile_scroll_nav_position';
        const replyNavigator = getReplyNavigator();

        function loadNavPosition() {
            const pos = safeJsonParse(localStorage.getItem(POSITION_KEY) || "{}", {});
            return {
                side: pos.side === "left" ? "left" : "right",
                bottom: Number.isFinite(parseFloat(pos.bottom)) ? parseFloat(pos.bottom) : 88,
                hidden: typeof pos.hidden === "boolean" ? pos.hidden : true,
            };
        }

        function saveNavPosition() {
            localStorage.setItem(POSITION_KEY, JSON.stringify({
                side: navSide,
                bottom: parseFloat(wrap.style.bottom) || 88,
                hidden: isHidden,
            }));
        }

        let navPos  = loadNavPosition();
        let navSide = navPos.side;
        let isHidden = navPos.hidden;

        function getTopicTitle() {
            const h1 = document.querySelector('h1');
            if (h1?.textContent?.trim()) {
                return h1.textContent.trim();
            }

            const activeBreadcrumb = document.querySelector('.breadcrumb .active, .breadcrumb-item.active');
            if (activeBreadcrumb?.textContent?.trim()) {
                return activeBreadcrumb.textContent.trim();
            }

            return document.title
                .replace(/\s+-\s+.*$/, '')
                .replace(/\s+\|\s+.*$/, '')
                .trim();
        }

        // URL elemzés lapozáshoz: /tema/nev/hsz_ELSO-UTOLSO.html
        // Fallbackként marad, de elsődlegesen a PH saját rel="prev"/rel="next" linkjeit használjuk.
        const pathMatch = window.location.pathname.match(/^(\/tema\/[^/]+\/)hsz_(\d+)-(\d+)\.html$/);
        const topicBase = pathMatch ? pathMatch[1] : null;
        const pageFirst = pathMatch ? parseInt(pathMatch[2], 10) : null;
        const pageLast  = pathMatch ? parseInt(pathMatch[3], 10) : null;
        const pageSize  = pathMatch ? pageLast - pageFirst + 1 : null;

        function getForumPagerLink(direction) {
            const rel = direction === -1 ? "prev" : "next";

            // Prioritásos keresés: először a fő navbar mr-sm-auto, majd nav-pager, végül bármi
            const selectors = [
                'ul.navbar-nav.mr-sm-auto a[rel="' + rel + '"]',
                'ul.navbar-nav a[rel="' + rel + '"]',
                '.nav-pager a[rel="' + rel + '"]',
                'a[rel="' + rel + '"]',
            ];

            for (const sel of selectors) {
                const link = Array.from(document.querySelectorAll(sel)).find(a => {
                    const href = a.getAttribute("href") || "";
                    return href.includes("/tema/") && href.includes("/hsz_");
                });
                if (link) return link;
            }

            return null;
        }

        function getCurrentMsgId() {
            const currentEl = messages?.[currentIndex];
            if (currentEl?.id?.match(/^msg\d+$/)) {
                return currentEl.id.replace("msg", "");
            }

            const hashMatch = window.location.hash.match(/^#msg(\d+)$/);
            if (hashMatch) {
                return hashMatch[1];
            }

            const pathMatchSingle = window.location.pathname.match(/\/hsz_(\d+)-\1\.html$/);
            if (pathMatchSingle) {
                return pathMatchSingle[1];
            }

            return null;
        }

        function parseHszRangeFromHref(href) {
            const m = String(href || "").match(/\/hsz_(\d+)-(\d+)\.html/);
            if (!m) return null;

            return {
                first: parseInt(m[1], 10),
                last: parseInt(m[2], 10),
            };
        }

        function getCurrentRangeSize() {
            if (!Number.isFinite(pageFirst) || !Number.isFinite(pageLast)) return null;
            return pageLast - pageFirst + 1;
        }

        function getPagerRangeCandidates() {
            const links = Array.from(document.querySelectorAll(
                'ul.navbar-nav.mr-sm-auto a[href*="/hsz_"], ' +
                'ul.navbar-nav a[href*="/hsz_"], ' +
                '.nav-pager .dropdown-menu a.dropdown-item[href*="/hsz_"], ' +
                'a[href*="/hsz_"]'
            ));

            const seen = new Set();

            return links
                .map(a => {
                    const href = a.getAttribute("href") || "";
                    const range = parseHszRangeFromHref(href);
                    if (!range) return null;

                    const size = range.last - range.first + 1;
                    const key = `${range.first}-${range.last}-${href.split("#")[0]}`;

                    if (seen.has(key)) return null;
                    seen.add(key);

                    return {
                        href,
                        first: range.first,
                        last: range.last,
                        size,
                        active: a.classList.contains("active"),
                    };
                })
                .filter(Boolean);
        }

        function findContainingNormalPage(anchorMsgId) {
            if (!Number.isFinite(pageFirst) || !Number.isFinite(pageLast)) return null;

            const currentSize = getCurrentRangeSize();
            if (!currentSize) return null;

            const candidates = getPagerRangeCandidates()
                .filter(x => {
                    // Tartalmazza az aktuális szűkített tartományt.
                    if (x.first > pageFirst || x.last < pageLast) return false;

                    // Saját aktuális oldal ne legyen.
                    if (x.first === pageFirst && x.last === pageLast) return false;

                    // Csak nagyobb tartomány érdekes.
                    if (x.size <= currentSize) return false;

                    return true;
                })
                .sort((a, b) => {
                    if (a.size !== b.size) return a.size - b.size;
                    return Math.abs(a.first - pageFirst) - Math.abs(b.first - pageFirst);
                });

            const best = candidates[0];
            if (!best) return null;

            const url = new URL(best.href, window.location.origin);
            url.hash = "#msg" + anchorMsgId;

            return url.href;
        }

        function normalizePagerUrl(href, direction) {
            if (!href) return null;

            const anchorMsgId = getCurrentMsgId() || (Number.isFinite(pageFirst) ? pageFirst : null);
            const containingUrl = anchorMsgId ? findContainingNormalPage(anchorMsgId) : null;

            if (containingUrl) {
                return containingUrl;
            }

            const url = new URL(href, window.location.origin);
            url.hash = direction === -1 ? "#ph-scroll-last" : "#ph-scroll-first";
            return url.href;
        }

        function buildPageUrl(firstHsz, scrollToLast) {
            if (!pathMatch || !pageSize) return null;

            const lastHsz = firstHsz + pageSize - 1;
            const anchor  = scrollToLast ? '#ph-scroll-last' : '#ph-scroll-first';

            return `${window.location.origin}${topicBase}hsz_${firstHsz}-${lastHsz}.html${anchor}`;
        }

        // -------------------------------------------------------
        // Hozzászólások összegyűjtése
        // -------------------------------------------------------
        function collectMessages() {
            const all = window.phPtMessageScroller?.collectMessages?.() ||
                Array.from(document.querySelectorAll('[id^="msg"]'))
                    .filter(el => /^msg\d+$/.test(el.id))
                    .sort((a, b) =>
                        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
                    );
            // Ugyanaz a szűrés, mint a billentyűzetnél: az OFF-kapcsoló
            // állapotát az animáció alatt és minden nézetben figyelembe vesszük.
            return all.filter(el => isNavigableForumPost(el.closest('li[data-id]')));
        }

        let messages     = [];
        let currentIndex = 0;
        function initMessages(anchorId) {
            const oldId = anchorId || messages[currentIndex]?.id;
            messages = collectMessages();
            const matching = oldId ? messages.findIndex(el => el.id === oldId) : -1;
            if (matching >= 0) {
                currentIndex = matching;
            } else {
                // Ha a kijelölt hozzászólás OFF-ként eltűnik, lehetőleg az
                // utána következő látható hozzászólást jelöljük ki.
                const oldEl = oldId ? document.getElementById(oldId) : null;
                const nextIndex = oldEl?.isConnected ? messages.findIndex(el =>
                    !!(oldEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) : -1;
                currentIndex = nextIndex >= 0 ? nextIndex
                    : Math.max(0, Math.min(currentIndex, messages.length - 1));
            }
        }

        // -------------------------------------------------------
        // FontAwesome ikon segédek
        // -------------------------------------------------------
        function iconHtml(iconClass) {
            return `<span class="fas ${iconClass} fa-fw"></span>`;
        }

        function setIcon(el, iconClass) {
            // A vizuális feliratot is megtartjuk ikonfrissítéskor (pl. lapozásnál).
            let icon = el.querySelector(':scope > .ph-scroll-control-icon');
            if (!icon) {
                icon = document.createElement('span');
                icon.className = 'ph-scroll-control-icon';
                el.prepend(icon);
            }
            icon.className = `ph-scroll-control-icon fas ${iconClass} fa-fw`;
            icon.setAttribute('aria-hidden', 'true');
        }

        function updateTabIcon() {
            if (navSide === "right") {
                setIcon(tab, isHidden ? "fa-chevron-left" : "fa-chevron-right");
            } else {
                setIcon(tab, isHidden ? "fa-chevron-right" : "fa-chevron-left");
            }
            tab.setAttribute('aria-expanded', String(!isHidden));
            tab.setAttribute('aria-label', isHidden
                ? 'Mobil navigáció megnyitása' : 'Mobil navigáció elrejtése');
        }

        function applySide(side, persist = true) {
            navSide = side === "left" ? "left" : "right";

            wrap.classList.toggle("side-left", navSide === "left");
            wrap.classList.toggle("side-right", navSide === "right");

            updateTabIcon();

            if (persist) saveNavPosition();
        }

        // -------------------------------------------------------
        // Görgetés + URL frissítés
        // -------------------------------------------------------
        function scrollToEl(el) {
            if (!el) return;
            if (window.phPtMessageScroller?.scrollToEl?.(el)) return;
            window.scrollTo({
                top: window.scrollY + el.getBoundingClientRect().top,
                behavior: 'smooth'
            });
        }

        function scrollToIndex(idx) {
            initMessages(null);
            if (idx < 0 || idx >= messages.length) return;
            currentIndex = idx;
            const el = messages[currentIndex];
            // A rövid hozzászólások miatt az automatikus képernyőkövetés
            // nem írhatja felül a navigációval kiválasztott hozzászólást.
            pinNavigationSelection();
            scrollToEl(el);

            // A hash-változás a kiemelést és a többi modult is frissíti.
            history.replaceState(null, '', '#' + el.id);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            updateUI();
        }

        // A kijelölést navigáció után megtartjuk egészen az első VALÓDI
        // kézi görgetésig. Így a rövid (akár 20-30 px magas) hozzászólás
        // alatti elem nem válik automatikusan az új céllá.
        // A hash-t továbbra is csak navigáció írja át, a kézi görgetés nem.
        let viewportTimer = null;
        let trackingManualScroll = true;

        function pinNavigationSelection() {
            trackingManualScroll = false;
            if (viewportTimer !== null) {
                clearTimeout(viewportTimer);
                viewportTimer = null;
            }
        }

        function resumeManualTracking(event) {
            // A panel gombjainak érintése és húzása nem kézi oldalgörgetés.
            if (event?.target instanceof Node && wrap.contains(event.target)) return;
            if (trackingManualScroll) return;
            trackingManualScroll = true;
            scheduleViewportTracking();
        }

        function trackVisibleMessage() {
            if (!messages.length || !trackingManualScroll) return;
            // A korábbi 150 px-es küszöb rövid hozzászólásoknál már az
            // alatta lévő elemet választotta. A tényleges olvasási pontot
            // most a képernyő tetejéhez közel vizsgáljuk.
            const line = Math.min(24, Math.max(12, window.innerHeight * 0.03));
            let index = 0;
            for (let i = 0; i < messages.length; i++) {
                if (messages[i].getBoundingClientRect().top > line) break;
                index = i;
            }
            if (index !== currentIndex) {
                currentIndex = index;
                updateUI();
            }
        }

        function scheduleViewportTracking() {
            if (!trackingManualScroll || viewportTimer !== null) return;
            viewportTimer = setTimeout(() => {
                viewportTimer = null;
                trackVisibleMessage();
            }, 110);
        }

        // -------------------------------------------------------
        // Lapozás (csak hsz_X-Y.html oldalakon)
        // -------------------------------------------------------
        function navigatePage(direction) {
            const forumLink = getForumPagerLink(direction);
            const forumUrl = forumLink ? normalizePagerUrl(forumLink.getAttribute("href"), direction) : null;

            if (forumUrl) {
                window.location.href = forumUrl;
                return;
            }

            if (!pathMatch || !pageSize) return;
            if (direction === -1 && pageFirst <= 1) return;

            const newFirst = direction === -1 ? pageFirst - pageSize : pageLast + 1;
            if (newFirst < 1) return;

            const fallbackUrl = buildPageUrl(newFirst, direction === -1);
            if (fallbackUrl) window.location.href = fallbackUrl;
        }

        // -------------------------------------------------------
        // Panel nyitás/zárás
        // -------------------------------------------------------
        function collapse() {
            isHidden = true;
            wrap.classList.add('is-hidden');
            updateTabIcon();
            saveNavPosition();
        }

        function expand() {
            isHidden = false;
            wrap.classList.remove('is-hidden');
            updateTabIcon();
            saveNavPosition();
        }

        // -------------------------------------------------------
        // UI frissítés
        // -------------------------------------------------------
        function updateUI() {
            const total = messages.length;
            const pos   = currentIndex + 1;
            const el    = messages[currentIndex];

            counterEl.textContent = total > 0 ? `${pos} / ${total}` : '–';
            labelEl.textContent   = el ? `# ${el.id.replace('msg', '')}` : 'Válassz…';

            const atFirst = currentIndex <= 0;
            const atLast  = currentIndex >= messages.length - 1;

            const anchorMsgId = getCurrentMsgId() || (Number.isFinite(pageFirst) ? pageFirst : null);
            const hasContainingNormalPage = !!(anchorMsgId && findContainingNormalPage(anchorMsgId));

            const hasPrevPage = hasContainingNormalPage || !!getForumPagerLink(-1) || (!!pathMatch && pageFirst > 1);
            const hasNextPage = hasContainingNormalPage || !!getForumPagerLink(+1);

            prevBtn.disabled = atFirst && !hasPrevPage;
            nextBtn.disabled = atLast && !hasNextPage;

            prevBtn.style.opacity = prevBtn.disabled ? '0.25' : '1';
            nextBtn.style.opacity = nextBtn.disabled ? '0.25' : '1';

            setIcon(prevBtn, atFirst && hasPrevPage ? 'fa-play fa-flip-horizontal' : 'fa-chevron-up');
            setIcon(nextBtn, atLast && hasNextPage ? 'fa-play' : 'fa-chevron-down');
            prevText.textContent = atFirst && hasPrevPage ? 'Előző lap' : 'Előző';
            nextText.textContent = atLast && hasNextPage ? 'Követk. lap' : 'Következő';

            prevBtn.title = atFirst && hasPrevPage ? 'Előző oldal' : 'Előző hozzászólás';
            nextBtn.title = atLast && hasNextPage ? 'Következő oldal' : 'Következő hozzászólás';
            prevBtn.setAttribute('aria-label', prevBtn.title);
            nextBtn.setAttribute('aria-label', nextBtn.title);

            // Az R / Shift+R kézzel elérhető megfelelői, közös előzménylistával.
            const state = replyNavigator.getState(el?.id?.replace('msg', '') || null);
            parentBtn.disabled = !state.canGoToParent;
            backBtn.disabled = !state.canGoBack;

            parentBtn.title = state.canGoToParent
                ? `Ugrás az előzményhez #${state.parentId}`
                : state.parentOffHidden
                    ? 'Az előzmény jelenleg elrejtett OFF hozzászólás'
                    : 'Ehhez a hozzászóláshoz nincs elérhető előzmény';
            backBtn.title = state.canGoBack
                ? `Visszalépés az előző válaszhoz #${state.backId}`
                : state.backOffHidden
                    ? 'A visszaút következő hozzászólása jelenleg elrejtett OFF'
                    : 'Az előzményútvonal még üres';
            parentBtn.setAttribute('aria-label', parentBtn.title);
            backBtn.setAttribute('aria-label', backBtn.title);
            backDepth.textContent = state.backCount > 99 ? '99+' : String(state.backCount);
            backDepth.hidden = state.backCount === 0;
        }

        // -------------------------------------------------------
        // CSS
        // -------------------------------------------------------
        injectStyleOnce('ph-mobile-scroll-nav-style', `
            /* Kompakt, a fórum világos/sötét témáját használó mobil dokk.
               A panel keskeny; a négy nagyobb érintési cél két sorban elfér. */
            #ph-scroll-btn-wrap {
                position: fixed;
                bottom: 88px;
                z-index: 99999;
                display: flex;
                align-items: center;
                --ph-scroll-tab-width: 32px;
                --ph-scroll-dock-width: 142px;
                --ph-scroll-dock-border: color-mix(in srgb, var(--ph-ui-fg, #202124) 22%, transparent);
                /* Uveghatas: atlatszo feluletek, a feliratok es ikonok teljesen elesek. */
                --ph-scroll-glass-panel: color-mix(in srgb, var(--ph-ui-bg, #fff) 57%, transparent);
                --ph-scroll-glass-tab: color-mix(in srgb, var(--ph-ui-bg, #fff) 76%, transparent);
                --ph-scroll-glass-btn: color-mix(in srgb, var(--ph-ui-bg, #fff) 38%, transparent);
                --ph-scroll-glass-primary: color-mix(in srgb, var(--ph-ui-accent, #4f7fb2) 9%, var(--ph-scroll-glass-btn));
                color: var(--ph-ui-fg, #202124);
                font-family: inherit;
                font-size: 12px;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                transition: transform 260ms cubic-bezier(.2,.8,.2,1), opacity 200ms ease;
                opacity: 1;
                isolation: isolate;
            }
            #ph-scroll-btn-wrap, #ph-scroll-btn-wrap * {
                box-sizing: border-box;
            }
            /* Sotet temaban egy keveset erosebb felulet: a vilagos oldalszoveg
               ne zavarja a panel ikonjainak/feliratainak olvashatosagat. */
            body[data-theme="dark"] #ph-scroll-btn-wrap {
                --ph-scroll-glass-panel: color-mix(in srgb, var(--ph-ui-bg, #242526) 64%, transparent);
                --ph-scroll-glass-tab: color-mix(in srgb, var(--ph-ui-bg, #242526) 81%, transparent);
                --ph-scroll-glass-btn: color-mix(in srgb, var(--ph-ui-bg, #242526) 44%, transparent);
            }
            #ph-scroll-btn-wrap.side-right {
                right: 0;
                left: auto;
                flex-direction: row;
            }
            #ph-scroll-btn-wrap.side-left {
                left: 0;
                right: auto;
                flex-direction: row-reverse;
            }
            #ph-scroll-btn-wrap.side-right.is-hidden {
                transform: translateX(calc(100% - var(--ph-scroll-tab-width)));
                opacity: .93;
            }
            #ph-scroll-btn-wrap.side-left.is-hidden {
                transform: translateX(calc(-100% + var(--ph-scroll-tab-width)));
                opacity: .93;
            }

            /* A fül egyszerre nyitó/záró gomb és áthelyezhető fogantyú. */
            #ph-scroll-tab {
                position: relative;
                align-self: center;
                width: var(--ph-scroll-tab-width);
                height: 58px;
                flex: 0 0 var(--ph-scroll-tab-width);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 0 0 7px;
                border: 1px solid var(--ph-scroll-dock-border);
                background: var(--ph-scroll-glass-tab);
                color: var(--ph-ui-accent-ink, #245d92);
                backdrop-filter: blur(1px);
                -webkit-backdrop-filter: blur(1px);
                font-size: 14px;
                line-height: 1;
                box-shadow: 0 5px 13px rgba(0, 0, 0, .13);
                cursor: grab;
                touch-action: none;
                -webkit-tap-highlight-color: transparent;
            }
            #ph-scroll-tab .ph-scroll-control-icon { pointer-events: none; }
            /* Finom fogásjelzés: a felület függőlegesen és oldalra is húzható. */
            #ph-scroll-tab::after {
                content: '';
                position: absolute;
                left: calc(50% - 7px);
                bottom: 10px;
                width: 14px;
                height: 3px;
                border-radius: 99px;
                background: currentColor;
                opacity: .42;
                box-shadow: 0 5px 0 currentColor;
            }
            #ph-scroll-tab:active { cursor: grabbing; }
            #ph-scroll-btn-wrap.side-right #ph-scroll-tab {
                border-radius: 11px 0 0 11px;
                border-right: 0;
            }
            #ph-scroll-btn-wrap.side-left #ph-scroll-tab {
                border-radius: 0 11px 11px 0;
                border-left: 0;
            }
            #ph-scroll-tab:focus-visible {
                outline: 2px solid var(--ph-ui-accent-ink, #245d92);
                outline-offset: 2px;
            }
            #ph-scroll-tab:active {
                background: color-mix(in srgb, var(--ph-ui-accent) 11%, var(--ph-scroll-glass-tab));
            }

            #ph-scroll-panel {
                position: relative;
                display: flex;
                flex-direction: column;
                width: min(var(--ph-scroll-dock-width), calc(100vw - 50px));
                min-width: 0;
                padding: 5px;
                border: 1px solid var(--ph-scroll-dock-border);
                background: var(--ph-scroll-glass-panel);
                color: var(--ph-ui-fg, #202124);
                box-shadow: 0 6px 19px rgba(0, 0, 0, .14);
                /* Csak enyhe elmosas: ami a panel mogott van, felismerheto marad. */
                backdrop-filter: blur(1px);
                -webkit-backdrop-filter: blur(1px);
                overflow: hidden;
            }
            #ph-scroll-btn-wrap.side-right #ph-scroll-panel {
                border-radius: 12px 0 0 12px;
                border-right: 0;
            }
            #ph-scroll-btn-wrap.side-left #ph-scroll-panel {
                border-radius: 0 12px 12px 0;
                border-left: 0;
            }
            /* Nem duplázzuk a témacímet, a felugró tippben továbbra is megvan. */
            #ph-scroll-info {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 5px;
                min-height: 28px;
                padding: 2px 6px 5px;
                border-bottom: 1px solid var(--ph-scroll-dock-border);
                cursor: pointer;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            #ph-scroll-info:active {
                background: color-mix(in srgb, var(--ph-ui-accent) 9%, transparent);
            }
            #ph-scroll-info:focus-visible {
                outline: 2px solid var(--ph-ui-accent-ink, #245d92);
                outline-offset: -2px;
            }
            #ph-scroll-label {
                flex: 1 1 auto;
                min-width: 0;
                color: var(--ph-ui-fg, #202124);
                font-size: 13px;
                font-weight: 800;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            #ph-scroll-counter {
                flex: 0 0 auto;
                color: var(--ph-ui-muted, #6b7280);
                font-size: 10px;
                font-weight: 650;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }

            #ph-scroll-nav,
            #ph-scroll-reply-nav {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 4px;
                min-width: 0;
            }
            #ph-scroll-nav { padding-top: 5px; }
            #ph-scroll-reply-nav { padding-top: 4px; }
            #ph-scroll-panel :is(.ph-nav-btn, .ph-scroll-reply-btn) {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                min-width: 0;
                width: 100%;
                min-height: 44px;
                margin: 0;
                padding: 4px 2px;
                border: 1px solid var(--ph-scroll-dock-border);
                border-radius: 8px;
                background: var(--ph-scroll-glass-btn);
                color: var(--ph-ui-fg, #202124);
                font: inherit;
                font-size: 9.5px;
                font-weight: 650;
                line-height: 1.1;
                text-align: center;
                white-space: nowrap;
                cursor: pointer;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            #ph-scroll-panel #ph-scroll-nav .ph-nav-btn {
                background: var(--ph-scroll-glass-primary);
                border-color: color-mix(in srgb, var(--ph-ui-accent) 26%, var(--ph-scroll-dock-border));
            }
            #ph-scroll-panel .ph-nav-btn .ph-scroll-control-icon {
                font-size: 15px;
                color: var(--ph-ui-accent-ink, #245d92);
            }
            #ph-scroll-panel .ph-scroll-reply-btn > .fas {
                font-size: 14px;
                color: var(--ph-ui-accent-ink, #245d92);
            }
            .ph-nav-btn-label { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
            #ph-scroll-panel :is(.ph-nav-btn, .ph-scroll-reply-btn):active:not(:disabled) {
                background: color-mix(in srgb, var(--ph-ui-accent) 21%, var(--ph-scroll-glass-tab));
                transform: scale(.97);
            }
            #ph-scroll-panel :is(.ph-nav-btn, .ph-scroll-reply-btn):focus-visible {
                outline: 2px solid var(--ph-ui-accent-ink, #245d92);
                outline-offset: 0;
            }
            #ph-scroll-panel :is(.ph-nav-btn, .ph-scroll-reply-btn):disabled {
                opacity: .36 !important;
                cursor: default;
            }
            #ph-scroll-back-depth {
                position: absolute;
                top: 2px;
                right: 2px;
                min-width: 16px;
                padding: 1px 3px;
                border-radius: 99px;
                background: color-mix(in srgb, var(--ph-ui-accent) 15%, var(--ph-scroll-glass-tab));
                color: var(--ph-ui-accent-ink, #245d92);
                font-size: 9px;
                font-weight: 800;
                line-height: 1.2;
            }
            #ph-scroll-back-depth[hidden] { display: none !important; }
            @media (prefers-reduced-motion: reduce) {
                #ph-scroll-btn-wrap { transition: none; }
                #ph-scroll-panel :is(.ph-nav-btn, .ph-scroll-reply-btn) { transition: none; }
            }
        `);

        // -------------------------------------------------------
        // HTML
        // -------------------------------------------------------
        const wrap = document.createElement('div');
        wrap.id = 'ph-scroll-btn-wrap';
        wrap.style.bottom = Math.max(10, Math.min(window.innerHeight - 80, navPos.bottom)) + 'px';

        const tab = document.createElement('div');
        tab.id = 'ph-scroll-tab';
        tab.setAttribute('role', 'button');
        tab.tabIndex = 0;

        const panel = document.createElement('div');
        panel.id = 'ph-scroll-panel';

        const info = document.createElement('div');
        info.id = 'ph-scroll-info';
        info.setAttribute('role', 'button');
        info.setAttribute('aria-label', 'Ugrás az aktuális hozzászóláshoz');
        info.tabIndex = 0;

        const topicTitle = getTopicTitle();
        info.title = topicTitle ? `${topicTitle} — ugrás az aktuális hozzászóláshoz`
            : 'Ugrás az aktuális hozzászóláshoz';

        const counterEl = document.createElement('span');
        counterEl.id = 'ph-scroll-counter';
        counterEl.textContent = '…';

        const labelEl = document.createElement('span');
        labelEl.id = 'ph-scroll-label';
        labelEl.textContent = 'Válassz…';

        info.appendChild(labelEl);
        info.appendChild(counterEl);

        const nav = document.createElement('div');
        nav.id = 'ph-scroll-nav';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'ph-nav-btn';
        prevBtn.type = 'button';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'ph-nav-btn';
        nextBtn.type = 'button';

        const prevText = document.createElement('span');
        prevText.className = 'ph-nav-btn-label';
        prevText.textContent = 'Előző';
        prevBtn.appendChild(prevText);

        const nextText = document.createElement('span');
        nextText.className = 'ph-nav-btn-label';
        nextText.textContent = 'Következő';
        nextBtn.appendChild(nextText);

        nav.appendChild(prevBtn);
        nav.appendChild(nextBtn);

        const replyNav = document.createElement('div');
        replyNav.id = 'ph-scroll-reply-nav';

        const parentBtn = document.createElement('button');
        parentBtn.type = 'button';
        parentBtn.className = 'ph-scroll-reply-btn';
        parentBtn.innerHTML = '<span class="fas fa-reply" aria-hidden="true"></span><span>Előzmény</span>';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'ph-scroll-reply-btn';
        backBtn.innerHTML = '<span class="fas fa-undo" aria-hidden="true"></span><span>Vissza</span>';

        const backDepth = document.createElement('span');
        backDepth.id = 'ph-scroll-back-depth';
        backDepth.hidden = true;
        backBtn.appendChild(backDepth);

        replyNav.appendChild(parentBtn);
        replyNav.appendChild(backBtn);

        panel.appendChild(info);
        panel.appendChild(nav);
        panel.appendChild(replyNav);

        wrap.appendChild(tab);
        wrap.appendChild(panel);
        document.body.appendChild(wrap);
        wrap.style.bottom = Math.max(
            10,
            Math.min(Math.max(10, window.innerHeight - wrap.offsetHeight - 10),
                parseFloat(wrap.style.bottom) || 88)
        ) + 'px';

        applySide(navSide, false);

        if (isHidden) {
            collapse();
        } else {
            expand();
        }

        // -------------------------------------------------------
        // Események
        // -------------------------------------------------------
        let suppressNextClick = false;

        tab.addEventListener('click', (e) => {
            e.stopPropagation();

            if (suppressNextClick) {
                suppressNextClick = false;
                return;
            }

            isHidden ? expand() : collapse();
        });

        info.addEventListener('click', () => scrollToIndex(currentIndex));
        info.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            scrollToIndex(currentIndex);
        });
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            isHidden ? expand() : collapse();
        });

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            initMessages(null);
            currentIndex > 0 ? scrollToIndex(currentIndex - 1) : navigatePage(-1);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            initMessages(null);
            currentIndex < messages.length - 1 ? scrollToIndex(currentIndex + 1) : navigatePage(+1);
        });

        parentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            replyNavigator.goToParent(getCurrentMsgId());
            updateUI();
        });

        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            replyNavigator.goBack();
            updateUI();
        });

        // Drag:
        // - függőlegesen mozgatható
        // - vízszintesen húzva bal/jobb oldalra pattintható
        // - működik egérrel és érintéssel is
        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let startBottom = 88;
        let dragging = false;
        let moved = false;
        let activePointerId = null;

        tab.addEventListener('pointerdown', (e) => {
            // csak bal egérgombbal húzzuk, touch/pen esetén button általában 0
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            // Az előző húzás után a böngésző nem feltétlenül küld click eseményt
            // (különösen érintőképernyőn). A megmaradt tiltás ezért nem nyelheti
            // el egy ÚJ érintés első kattintását. A húzás saját pointerup-ja
            // továbbra is beállíthatja a tiltást, ha tényleges click érkezik.
            suppressNextClick = false;

            startX = e.clientX;
            startY = e.clientY;
            lastX = startX;
            startBottom = parseFloat(wrap.style.bottom) || 88;
            dragging = true;
            moved = false;
            activePointerId = e.pointerId;

            tab.setPointerCapture?.(e.pointerId);
            e.preventDefault();
        });

        tab.addEventListener('pointermove', (e) => {
            if (!dragging || e.pointerId !== activePointerId) return;

            lastX = e.clientX;

            const dx = e.clientX - startX;
            const dy = startY - e.clientY;

            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;

            const nb = Math.max(
                10,
                Math.min(window.innerHeight - wrap.offsetHeight - 10, startBottom + dy)
            );

            wrap.style.bottom = nb + 'px';

            // Ha áthúzod a kijelző másik felére, oldalváltás
            const wantedSide = e.clientX < (window.innerWidth / 2) ? "left" : "right";
            if (wantedSide !== navSide) {
                applySide(wantedSide, false);
            }

            e.preventDefault();
        });

        tab.addEventListener('pointerup', (e) => {
            if (!dragging || e.pointerId !== activePointerId) return;

            dragging = false;

            tab.releasePointerCapture?.(e.pointerId);
            activePointerId = null;

            if (moved) {
                suppressNextClick = true;

                const finalSide = lastX < (window.innerWidth / 2) ? "left" : "right";
                applySide(finalSide, true);
                saveNavPosition();
            }

            e.preventDefault();
        });

        tab.addEventListener('pointercancel', (e) => {
            if (e.pointerId !== activePointerId) return;

            dragging = false;
            activePointerId = null;
            // Megszakított érintés után sem maradhat aktív kattintástiltás.
            suppressNextClick = false;
        });

        window.addEventListener('resize', () => {
            const currentBottom = parseFloat(wrap.style.bottom) || 88;
            wrap.style.bottom = Math.max(
                10,
                Math.min(Math.max(10, window.innerHeight - wrap.offsetHeight - 10), currentBottom)
            ) + 'px';
            saveNavPosition();
        });

        // -------------------------------------------------------
        // hashchange figyelés: dupla katt vagy külső hash-változás
        // (pl. msgAnchorHighlight modul dblclick handlere: location.hash = "#msgXXX")
        // -------------------------------------------------------
        window.addEventListener('hashchange', () => {
            const m = window.location.hash.match(/^#(msg\d+)$/);
            if (!m) return;
            initMessages(m[1]);
            pinNavigationSelection();
            updateUI();
        });

        // Az előzmény-lista a billentyűzetes navigációtól is frissülhet.
        document.addEventListener('ph-pt-reply-nav-updated', updateUI);
        document.addEventListener('ph-pt-off-visibility-changed', () => {
            initMessages(null);
            scheduleViewportTracking();
            updateUI();
        });
        window.addEventListener('scroll', scheduleViewportTracking, { passive: true });
        // Csak a tényleges görgetési gesztus oldja fel a navigációs kijelölést.
        // A touchstart nem megfelelő: a mobilpanel megnyomása is kiváltaná.
        window.addEventListener('touchmove', resumeManualTracking, { passive: true });
        window.addEventListener('wheel', resumeManualTracking, { passive: true });
        window.addEventListener('keydown', (event) => {
            if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
            if (event.target instanceof Element &&
                event.target.closest('input, textarea, select, [contenteditable]')) return;
            resumeManualTracking(event);
        }, { capture: true, passive: true });
        // Asztalon a hagyományos görgetősáv egérrel húzva is működjön.
        window.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'mouse' && event.buttons === 1) {
                resumeManualTracking(event);
            }
        }, { passive: true });

        // -------------------------------------------------------
        // Init
        // -------------------------------------------------------
        function init() {
            // Lapozva érkezés kezelése (#ph-scroll-last / #ph-scroll-first)
            const incoming = window.location.hash;
            const fromPager = incoming === '#ph-scroll-last' || incoming === '#ph-scroll-first';

            if (fromPager) {
                initMessages(null);
                currentIndex = incoming === '#ph-scroll-last' ? messages.length - 1 : 0;
                history.replaceState(null, '', window.location.pathname + window.location.search + '#' + (messages[currentIndex]?.id || ''));
            } else {
                // Normál betöltés: ha van #msg a hashben, onnan indulunk
                const m = incoming.match(/^#(msg\d+)$/);
                initMessages(m ? m[1] : null);
            }

            // Hivatkozásból vagy lapozásból nyitott üzenet szándékos célpont.
            // Ne értelmezzük újra egy rövid hozzászólás utáni görgetésként.
            if (/^#msg\d+$/.test(incoming) || fromPager) pinNavigationSelection();
            updateUI();
            if (!/^#msg\d+$/.test(incoming) && !fromPager) {
                requestAnimationFrame(trackVisibleMessage);
            }

            // Autoscroll az aktuális pozícióhoz (ha van kijelölt elem)
            function tryScroll(n) {
                if (n <= 0) return;

                const el = messages[currentIndex];

                if (el) {
                    scrollToEl(el);
                } else {
                    setTimeout(() => {
                        initMessages(null);
                        tryScroll(n - 1);
                    }, 600);
                }
            }

            if (fromPager) {
                setTimeout(() => tryScroll(5), 1200);
            }
        }

        init();
    }

    function sortThreadListsByNewPosts() {
        const LIST_SELECTOR = [
            '.user-thread-list-lms > .card > ul.list-group',
            '.user-thread-list-fav > .card > ul.list-group'
        ].join(', ');

        let scheduled = false;

        function getNewPostCount(li) {
            const el = li.querySelector('a.new-msgs');
            if (!el) return 0;

            const match = el.textContent.match(/\d+/);
            if (!match) return 0;

            const count = parseInt(match[0], 10);
            return Number.isFinite(count) ? count : 0;
        }

        function sortList(ul) {
            const items = Array.from(ul.children)
                .filter(el => el.matches('li.list-group-item'));

            if (items.length < 2) return;

            const originalIndex = new Map(
                items.map((item, index) => [item, index])
            );

            const sorted = [...items].sort((a, b) => {
                const countDiff = getNewPostCount(b) - getNewPostCount(a);
                if (countDiff !== 0) return countDiff;

                return originalIndex.get(a) - originalIndex.get(b);
            });

            const alreadySorted = sorted.every(
                (item, index) => item === items[index]
            );

            if (alreadySorted) return;

            const fragment = document.createDocumentFragment();
            sorted.forEach(item => fragment.appendChild(item));
            ul.appendChild(fragment);
        }

        function sortAllLists() {
            document.querySelectorAll(LIST_SELECTOR).forEach(sortList);
        }

        function scheduleSort() {
            if (scheduled) return;
            scheduled = true;

            requestAnimationFrame(() => {
                scheduled = false;
                sortAllLists();
            });
        }

        sortAllLists();

        const observer = new MutationObserver(mutations => {
            const relevant = mutations.some(mutation => {
                if (mutation.type !== 'childList') return false;

                const target = mutation.target;
                if (!(target instanceof Element)) return false;

                return target.matches(LIST_SELECTOR)
                    || !!target.closest('.user-thread-list-lms, .user-thread-list-fav');
            });

            if (relevant) scheduleSort();
        });

        document.querySelectorAll(
            '.user-thread-list-lms, .user-thread-list-fav'
        ).forEach(root => {
            observer.observe(root, {
                childList: true,
                subtree: true
            });
        });
    }
})();