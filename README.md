# 📦 lkristof/userscripts

## 💍 PH Power Tools (egy script mind fölött)

**`ph-power-tools.user.js`** egy minden-egyben userscript, ami a Prohardver! fórumokhoz készült funkciókat **egyetlen scriptbe gyúrja össze**, külön **beállítómenüvel**, kapcsolható modulokkal.

### ⚡ Előnyök

- 📦 egyetlen telepítés
- 🔄 frissítéskor csak **egy** scriptet kell karbantartani
- ⚙️ külön menü, funkciónként ki-/bekapcsolható
- 🧠 egységes működés

### 🎯 Fókusz

- jobb olvashatóság
- hasznos vizuális kiemelések
- kényelmesebb fórumhasználat

> 👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js

---

### 🧰 Szükséges eszköz

A scriptek futtatásához kell egy userscript kezelő:

- **Tampermonkey** (Chrome / Edge / Firefox / Safari / Opera)
- **Violentmonkey** (Firefox / Edge)
- **Greasemonkey** (Firefox)

---

### 🚀 Telepítés

1. Telepíts egy userscript kezelőt
2. Kattints az adott script **Install** linkjére
3. A megnyíló oldalon a bővítmény felajánlja a telepítést (vagy imádkozz 😇)

---

### 📦 PH Power Tools összetevői

> [!NOTE]
> A **PH Power Tools** egyesíti az alábbi funkciókat, egy beállítási panellel.

| Funkció                             | Rövid leírás                                                                                                                                                                  |
|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Hozzászólás színezés**            | saját, rád válaszoló és `#akció` / `#akcio` jelölésű hozzászólások + avatar fókusz + hozzászólás-lánc kiemelés                                                                |
| **Link átirányítás**                | PH! lapcsalád linkjeit az aktuális oldalra irányítja                                                                                                                          |
| **Üzenet kiemelés**                 | kiemeli az aktuális `#msgXXXX` hozzászólást; törölt hozzászólás esetén a legközelebbit; dupla katt a fejlécen kijelöli a hozzászólást                                         |
| **OFF hozzászólások elrejtése**     | `[OFF]` jelölésű hozzászólások elrejtése és visszakapcsolása gombnyomásra                                                                                                     |
| **Széles nézet**                    | szélesebb fórumelrendezés; a középső oszlop jobb széle húzással méretezhető, dupla kattintással automatikus méretre állítható, nagy szélességnél a bal oldalsáv elrejthető    |
| **Thread nézet**                    | hozzászólás-láncok vizuális összekötése és strukturáltabb megjelenítése                                                                                                       |
| **Billentyűzetes navigáció**        | gyors navigáció a fórumon billentyűzet segítségével                                                                                                                           |
| **Felhasználók elrejtése**          | megadott felhasználók hozzászólásait elrejti                                                                                                                                  |
| **Új hozzászólás jelölése**         | témánként megjegyzi a legutóbb látott hozzászólásazonosítót, és az újabb hozzászólások fejlécét megjelöli                                                                     |
| **Extra smiley-k**                  | az alap smiley-k alá egy extra adag smiley                                                                                                                                    |
| **Képfeltöltés kek.sh-ra**          | képfeltöltés kek.sh-ra galéria 2 füllel: rács, lista nézet                                                                                                                    |
| **Nyereményjáték válasz ellenőrző** | a `/nyeremenyjatek` oldalon a játék lezárása után végigellenőrzi a megadott válaszokat, jelzi a helyes/hibás vagy hiányzó választ, és kiemeli a saját nevet a nyerteslistában |
| **Fix oldalsávok**                  | a bal és jobb oldalsáv görgetés közben a képernyőn marad; az aktuális témát az oldalsávban és a mobil/tablet fejléc listájában is kiemeli                                     |
| **Mobil navigációs panel**          | összecsukható és húzható lebegő panel az előző/következő hozzászóláshoz és oldalhoz; bal/jobb oldalra áthúzható és megjegyzi a pozícióját                                     |
| **Gist szinkronizáció**             | GitHub Gist alapú szinkronizáció, hogy a script beállításai és mentett adatai több eszköz között is szinkronban maradjanak                                                    |

---

### 🔄 Gist szinkronizáció beállítása
<details>

<summary>Kattints ide a kibontáshoz</summary>

A **Gist szinkronizáció** lehetővé teszi, hogy a **beállításaid és mentett adataid több böngésző és eszköz között automatikusan szinkronban maradjanak**.

#### Mire jó?

- több gépen ugyanazok a beállítások
- böngésző újratelepítés után azonnali visszaállítás
- biztonsági mentés a konfigurációról

---

#### 🪪 1. GitHub token létrehozása

1. Regisztrálj vagy jelentkezz be a GitHubra
2. Nyisd meg: https://github.com/settings/personal-access-tokens
3. **Generate new token** → *Fine-grained token*
4. Adj neki nevet (pl. `ph-power-tools-gist`)
5. Állítsd be a lejáratot (*Expiration*)
6. **Permissions → Gists → Read and write**
7. Kattints: **Generate token**

⚠️ **Fontos:**  
A létrejövő `github_pat_...` token **csak egyszer látható**, ezért **másold ki és tedd el biztonságos helyre**.

---

#### 📄 2. Gist létrehozása

1. Nyisd meg: https://gist.github.com
2. Hozz létre egy új Gist-et:
    - fájlnév: `ph_forum_settings.json`
    - tartalom:
      ```json
      {}
      ```
3. Állítsd **Secret Gist**-re
4. Kattints: **Create secret gist**
5. A megnyíló oldal URL-jéből másold ki a **Gist ID-t**  
   (a link végén található hosszú azonosító)

---

#### ⚙️ 3. Beállítás a scriptben

1. Nyisd meg a PH Power Tools menüt
2. Kattints a **⚙️ fogaskerék ikonra**
3. Töltsd ki:
    - **GitHub token**
    - **Gist ID**
    - **Gist fájlnév** – alapértelmezés: `ph_forum_settings.json`
4. Mentsd el a beállításokat

Ezután a script automatikusan szinkronizálja az adatokat.

---

#### 🔐 Biztonság

- a token **csak a saját böngésződben tárolódik**
- a script **kizárólag a megadott Gist-et éri el**
- semmilyen adat nem kerül harmadik félhez

</details>

## 📸 Képernyőképek
> [!NOTE]
> Így néznek ki a PH Power Tools legfontosabb funkciói a gyakorlatban.

### menü
[![menu-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-light.jpg)
[![menu-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-dark.jpg)

### saját és rád válaszoló hozzászólások

[![colorize-own-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-light.jpg)
[![colorize-own-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-dark.jpg)

### `#akcio` jelölésű hozzászólások
[![colorize-akcio-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-light.jpg)
[![colorize-akcio-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-dark.jpg)

### felhasználó hozzászólásainak kiemelése (arcképre kattintva)
[![colorize-avatar-focus-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-light.jpg)
[![colorizeavatar-focus-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-dark.jpg)

### hozzászólás lánc (🔗 Lánc-ra kattintva)

[![colorize-chain-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-light.jpg)
[![colorize-chain-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-dark.jpg)

### `#msgXXXX` kiemelés

[![msg-anchor-highlight-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-light.jpg)
[![msg-anchor-highlight-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-dark.jpg)

### színek testreszabása
[![colorize-config](https://raw.githubusercontent.com/lkristof/userscripts/main/img/colorize-config-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/colorize-config.jpg)

### kulcsok / szinkron beállítások
[![sync-config](https://raw.githubusercontent.com/lkristof/userscripts/main/img/sync-config-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/sync-config.jpg)

### normál vs. széles
[![normal-view](https://raw.githubusercontent.com/lkristof/userscripts/main/img/normal-view-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/normal-view-light.jpg)
[![wide-view](https://raw.githubusercontent.com/lkristof/userscripts/main/img/wide-view-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/wide-view-light.jpg)

### thread nézet
[![thread-view-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-light.jpg)
[![thread-view-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-dark.jpg)

### felhasználó rejtése (elrejtés, rejtve, felfedve, feloldás, menü)
[![dropdown-hide](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-hide-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-hide.jpg)
[![hidden](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-hidden-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-hidden.jpg)
[![shown](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-shown-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-shown.jpg)
[![dropdown-unhide](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-unhide-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-unhide.jpg)
[![user-menu](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-menu-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-menu.jpg)

### képfeltöltés kek.sh-ra
[![grid](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-grid-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-grid.jpg)
[![list](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-list-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-list.jpg)

---

## 📦 nCore

### 🔹 nCore – 3+ pluszos torrentek kiemelése

A letöltések listájában kiemeli a több pozitív visszajelzéssel rendelkező torrenteket.  
Segít gyorsabban megtalálni a népszerű tartalmakat.

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-torrent-highlight.user.js

---

### 🔹 nCore – qBittorrent Add

A torrent oldalakhoz **qBittorrent letöltés gombot** ad, lehetővé téve a torrentek közvetlen hozzáadását a qBittorrent
WebUI-hoz.

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-qbittorrent-add.user.js

---

### 🔹 nCore – Láttam már!

Dupla kattintással elhalványíthatod a már látott filmeket a listában, a jelölést pedig vissza is vonhatod.

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-seen.user.js

---

### 🔹 nCore – No thanks

Elrejti az nCore köszönéseket a torrent oldalon.

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-no-thanks.user.js

---

### 🔹 nCore – De-dereferer

Dereferer linkek eltávolítása, de az anonimitás megtartása

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-de-dereferer.user.js

---


## ⭐ Tipp

Ha egy script nem működik:

- frissítsd az oldalt
- ellenőrizd, hogy a script engedélyezve van-e
- nézd meg a böngésző konzolt (`F12`)
- és ha semmi nem segít: küldj áldást a böngésződre 🙏 vagy imádkozz a JavaScript istenhez 😇

---

Ha hibát találsz, ötleted van vagy továbbfejlesztenéd, **nyugodtan jelezd**. 🙂

---

## 📄 License

[MIT License](LICENSE)
