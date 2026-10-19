# 📦 lkristof/userscripts

## 💍 PH Power Tools (egy script mind fölött)

**`ph-power-tools.user.js`** egy minden-egyben userscript, ami a Prohardver! fórumokhoz készült funkciókat **egyetlen scriptbe gyúrja össze**, külön **beállítómenüvel**, kapcsolható modulokkal.

### ⚡ Előnyök

- 📦 egyetlen telepítés, egyetlen frissítendő script
- ⚙️ külön menü, funkciónként ki-/bekapcsolható modulokkal
- 🎨 testreszabható színezés világos és sötét témához
- 💾 JSON-alapú beállításmentés és visszaállítás
- 🔄 opcionális GitHub Gist-szinkronizáció több eszköz között

### 🎯 Fókusz

- jobb olvashatóság és vizuális kiemelések
- kényelmesebb hozzászólás- és témakezelés
- gyorsabb navigáció és egyszerűbb képfeltöltés

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js

A script a következő domaineken töltődik be: **prohardver.hu**, **mobilarena.hu**, **logout.hu**, **fototrend.hu** és **hardverapro.hu**. Az egyes modulok csak a megfelelő oldalakon működnek, például fórumtémában (`/tema/`), privát üzenetnél (`/privat/`), nyereményjátéknál (`/nyeremenyjatek/`) vagy témalistán.

---

### 🧰 Szükséges eszköz

A futtatáshoz userscript-kezelő szükséges, például:

- **Tampermonkey** (Chrome / Edge / Firefox / Safari / Opera)
- **Violentmonkey** (Firefox / Chromium-alapú böngészők)
- **Userscripts** (iOS)

A script többek között a `GM_xmlhttpRequest` API-t is használja, ezért az ezt nem biztosító userscript-kezelőkben (például egyes Greasemonkey-verziókban) a feltöltés vagy a szinkronizáció nem feltétlenül működik teljes körűen.

---

### 🚀 Telepítés

1. Telepíts egy támogatott userscript-kezelőt.
2. Nyisd meg a fenti **Telepítés** linket.
3. Hagyd jóvá a script telepítését a bővítményben.

---

### 📦 PH Power Tools összetevői

> [!NOTE]
> A modulok a fejlécben lévő **PH Power Tools** menüből kapcsolhatók. A kapcsolók módosítása **Mentés** után, az oldal újratöltésével lép életbe. A széles, az OFF, a Modern és a Thread nézetnek a témán belül külön állapotkapcsolója is van.

| Funkció                             | Rövid leírás                                                                                                                                                                                                      |
|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Hozzászólások színezése**         | Saját, neked válaszoló és `#akció` / `#akcio` jelölésű hozzászólások színezése, valamint szerzőfókusz a profilképre kattintva. A Lánc popup ettől független modul.                                                |
| **Link átirányítás**                | A támogatott PH! lapcsaládon belüli fórumhivatkozásokat az aktuális domainhez igazítja; például a cikkek és hírek kivételek.                                                                                      |
| **Üzenet kiemelés**                 | A `#msg12345` hivatkozáshoz görget, és **csak a hozzászólás fejlécét** színezi (hiányzó azonosítónál a legközelebbit, rejtett szerzőnél a „Rejtett” sávot is). A fejléc dupla kattintással aktuálisnak jelölhető. |
| **OFF hozzászólások elrejtése**     | Az `[OFF]` hozzászólások elrejtése/megjelenítése a témaoldali gombbal; Modern és Thread nézetben animált átmenettel. Az elrejtett OFF hozzászólásokat a navigáció átugorja.                                       |
| **Hozzászólás-lánc popup**          | A hozzászólás **Lánc** gombjára felugró beszélgetésnézet nyílik: előzmények, válaszágak, teljes szöveg, válaszvonalak és az eredeti hozzászólásokra ugrás. Külön kapcsolható a **Szűrés** menüben.                |
| **Széles nézet**                    | Szélesebb fórumelrendezés, a tartalom jobb szélének húzásával állítható oszlopszélesség és dupla kattintással visszaállítható automatikus méret.                                                                  |
| **Thread nézet**                    | Reddit-szerű hozzászólásfa válaszkapcsolatokkal, vizuális ágvonalakkal, egyedi ág-összecsukással és **Összecsuk mind / Kibont mind** menüvel.                                                                     |
| **Modern nézet**                    | A Thread nézet kártyás stílusa **időrendi sorrendben**, válaszfa-behúzások és ágvonalak nélkül. Egységes kártyák a hozzászólásokhoz, a témaösszefoglalóhoz, a kiemelt hozzászólásokhoz és a szerkesztőhöz.        |
| **Billentyűzetes navigáció**        | Hozzászólások közti léptetés a nyilakkal; válaszelőzmény követése `R`-rel és visszalépés `Shift+R`-rel. A rejtett OFF hozzászólásokat kihagyja.                                                                   |
| **Felhasználók elrejtése**          | Szerzők hozzászólásainak elrejtése, ideiglenes felfedése, a rejtett felhasználók listájának szerkesztése; Modern/Thread nézetben animált összecsukás.                                                             |
| **Új hozzászólás jelölése**         | Témánként megjegyzi a legutóbb látott hozzászólásazonosítót, jelöli az új hozzászólásokat, és gombot ad az **első olvasatlanhoz ugráshoz**.                                                                       |
| **Extra smiley-k**                  | Kiegészítő smiley-k és emojik a hozzászólás- és privátüzenet-szerkesztőben.                                                                                                                                       |
| **kek.sh képfeltöltő**              | API-kulccsal képfeltöltés a szerkesztőből, kép/link beszúrása, galéria **rács- és listanézetben**, törlés és opcionális Gist-szinkron.                                                                            |
| **Nyereményjáték válasz ellenőrző** | A `/nyeremenyjatek/` oldalon a játék lezárása után ellenőrzi a válaszokat, jelöli az eredményt és kiemeli a felhasználót a nyerteslistán.                                                                         |
| **Fix oldalsávok**                  | Görgetéskor látható oldalsávok; az aktuális téma kiemelése az oldalsávban és a mobil/tablet fejléc témalistájában.                                                                                                |
| **Mobil navigációs panel**          | Kompakt, áttetsző, húzható és összecsukható lebegő panel hozzászólás- és oldalléptetéssel, közös `R` / `Shift+R` válaszelőzménnyel és görgetéskövetéssel; megjegyzi a pozícióját.                                 |
| **Témalisták rendezése**            | A **„Kedvenc fórumtémáim”** és **„Itt szóltam hozzá”** listát az új hozzászólások száma szerint, csökkenő sorrendbe rendezi.                                                                                      |

A modulok három menücsoportba rendezve érhetők el: **Megjelenés**, **Szűrés** és **Interakció**.

A menü további, nem modulkapcsolóhoz kötött funkciói a **színek testreszabása** (🎨), a **beállítások exportálása/importálása** és a **kulcsok / Gist-szinkron kezelése** (⚙️).

### 🔗 Hozzászólás-lánc popup

A hozzászólás fejlécében lévő **Lánc** gombra kattintva a korábbi színes lánckiemelés helyett külön felugró ablak nyílik. A popup az adott hozzászólás **előzményeit és az abból induló válaszágakat** jeleníti meg, a Thread nézethez hasonló összekötő vonalakkal.

- A kártyákon megjelenik a **szerző, profilkép, hozzászólásszám és szöveg**, valamint a **rang és időpont**, ha az oldalon elérhető.
- A **„Kiválasztott hozzászólás”** jelölés megmarad; a többi bejegyzést nem zavarják külön „Előzmény” vagy „Válasz” címkék.
- Megnyitáskor a lista a **kiválasztott hozzászóláshoz görget**, utána szabadon böngészhető felfelé és lefelé.
- A popup a fórum **növekvő vagy csökkenő** hozzászólássorrendjét követi.
- A **`#12345` hozzászólásszám** kattintható, és az eredeti bejegyzéshez visz.
- Bezárható az **X** gombbal, az **Esc** billentyűvel vagy a háttérre kattintva.

> [!IMPORTANT]
> A popup **csak az aktuális oldalon betöltött hozzászólásokat** tudja megjeleníteni. A másik oldalra eső előzmények vagy válaszok nem töltődnek be automatikusan.

### 🗂️ Modern és Thread nézet

A **Modern nézet** a fórum hozzászólásait időrendi sorrendben, egységes, lekerekített kártyákként jeleníti meg. Nincsenek válaszfa-behúzások és összekötő vonalak; a témaösszefoglaló és a rögzített hozzászólások is illeszkednek a kártyás kialakításhoz.

A **Thread nézet** a válaszkapcsolatok szerinti fát mutatja, összekötő vonalakkal és összecsukható ágakkal. Mindkét nézetben egységes a hozzászólásszerkesztő, valamint a szerző neve/rangja és a válaszhivatkozások megjelenítése **normál és kompakt fórumelrendezésben** is. Az OFF hozzászólások és a rejtett felhasználók animáltan jeleníthetők meg vagy rejthetők el.

A nézeteket a **hozzászóláslista feletti gombokkal** kapcsolhatod; a Modern és a Thread nézet egymást kizáró megjelenítési módok.

---

### ⌨️ Billentyűzetes navigáció

| Billentyű | Művelet |
|---|---|
| `↑` / `↓` | Előző / következő látható hozzászólás a megjelenített sorrendben |
| `←` / `→` | Első / utolsó látható hozzászólás |
| `Shift+↑` / `Shift+↓` | Előző / következő hozzászólás azonosító szerinti sorrendben |
| `R` | Ugrás arra a hozzászólásra, amelyre az aktuális hozzászólás válaszolt |
| `Shift+R` | Visszalépés az `R`-rel bejárt válaszelőzményben |

A billentyűzetes navigáció szövegbevitel közben és nyitott képgalériánál nem lép működésbe. Ha az OFF hozzászólások el vannak rejtve, a billentyűzetes és a mobil navigáció is átugorja őket. A mobilpanel és az `R` / `Shift+R` billentyűk közös válaszelőzményt használnak. Az `R`-rel bejárt útvonal a böngésző munkamenetében tárolódik, nem kerül a Gistbe.

---

### 💾 Beállítások exportálása és importálása

A PH Power Tools menü **fájl/export ikonjára** kattintva egy `.json` fájlba mentheted a beállításokat, vagy korábbi mentést állíthatsz vissza.

- **Alapértelmezett export:** modulkapcsolók, egyéni színpaletták, rejtett felhasználók, OFF / széles / Modern / Thread nézetállapot, széles nézet beállított szélessége és a mobilnavigáció helyi pozíciója.
- **„Olvasottsági adatok és kek.sh képgaléria mentése is”**: külön bekapcsolható. Tartalmazza a témánkénti olvasottsági azonosítókat, a galériát és a törlés/visszaállítás szinkronizációs adatait is.
- **„API-kulcsok és Gist-kapcsolati adatok mentése is”**: külön, alapból kikapcsolt opció. A GitHub-token, Gist ID, fájlnév és kek.sh API-kulcs **titkosítatlanul** kerül a JSON-ba.

Az importálás csak a PH Power Tools által támogatott mentési formátumot fogadja el (legfeljebb **10 MB**), ellenőrzi az adatokat, és a felülírás előtt megerősítést kér. Sikeres visszaállítás után az oldal újratöltődik.

> [!WARNING]
> A galéria adatai képkezeléshez szükséges tokeneket is tartalmazhatnak, **az API-kulcsokat tartalmazó export pedig nincs titkosítva**. Ezeket a fájlokat ne oszd meg nyilvánosan. Aktív Gist-szinkron mellett az importált olvasottsági és galériaadatok összeolvadhatnak a Gistben lévő adatokkal.

---

### 🔄 Gist szinkronizáció beállítása

<details>

<summary>Kattints ide a kibontáshoz</summary>

A GitHub Gist-szinkron **opcionális**, és a következőket tartja szinkronban a támogatott böngészők/eszközök között:

- modulbeállítások és egyéni színpaletták
- rejtett felhasználók listája
- témánkénti utoljára látott hozzászólásazonosítók
- kek.sh galériaadatai, törlési jelölések és galériavisszaállítási állapotok

**Nem szinkronizálódnak** az egyedi OFF / széles / Modern / Thread nézetállapotok, a széles nézet kézzel beállított szélessége, a mobilnavigáció pozíciója, a billentyűzetes válaszelőzmények, valamint a GitHub- és kek.sh-hozzáférési kulcsok. Ezeket szükség esetén a fenti **JSON-exporttal** lehet menteni (a kulcsok külön opcióval).

#### 🪪 1. GitHub-token létrehozása

1. Jelentkezz be a GitHubba.
2. Nyisd meg: https://github.com/settings/personal-access-tokens
3. Válaszd a **Generate new token → Fine-grained token** lehetőséget.
4. Adj neki nevet (például `ph-power-tools-gist`), és állíts be lejáratot.
5. A **Permissions → Account permissions → Gists** jogosultságnál állítsd be a **Read and write** hozzáférést.
6. Hozd létre a tokent, majd másold ki és tárold biztonságos helyen.

⚠️ **Fontos:**  
A létrejövő `github_pat_...` token **csak egyszer látható**, ezért **másold ki és tedd el biztonságos helyre**.

A Gist frissítéséhez a GitHub API **Gists: write** jogosultságot igényel ([GitHub REST API dokumentáció](https://docs.github.com/en/rest/gists/gists)).

#### 📄 2. Gist létrehozása

1. Nyisd meg: https://gist.github.com
2. Hozz létre egy **Secret Gist**-et az alábbi fájllal:
   - fájlnév: `ph_forum_settings.json`
   - tartalom:
     ```json
     {}
     ```
3. A létrehozott Gist URL-jéből másold ki a **Gist ID**-t. (a link végén található hosszú azonosító)

**Fontos:** a *Secret Gist* nem valóban privát; bár nem jelenik meg a nyilvános listákban, a hivatkozás birtokában bárki elolvashatja a tartalmát ([GitHub tájékoztató](https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists)). A galéria metaadatai érzékeny törlési tokeneket is tartalmazhatnak.

#### ⚙️ 3. Beállítás a scriptben

1. Nyisd meg a PH Power Tools menüt.
2. Kattints a **⚙️ Kulcsok és szinkron** ikonra.
3. Add meg a **GitHub Gist Tokent**, a **Gist ID-t** és a **Gist fájlnevet** (alapértelmezés: `ph_forum_settings.json`).
4. Kattints a **Mentés** gombra; az oldal újratöltődik.

Ezután a script a Gistből olvas, a módosított, szinkronizált adatokat pedig automatikusan feltölti. A kek.sh galériában külön **Szinkron** gomb is rendelkezésre áll.

> [!WARNING]
> **Meglévő helyi adatok esetén előbb készíts JSON-exportot!** Első kapcsolódáskor a Gist a még nem módosított szinkronizált kulcsoknál elsőbbséget élvez: egy **üres Gist** a helyi beállításokat alaphelyzetbe állíthatja, a rejtett felhasználók, olvasottsági adatok és galéria helyi listája pedig eltűnhet. A csatlakozás után importáld vissza az exportált mentést, hogy a megőrizni kívánt adatokat a script a Gistbe is feltölthesse.

#### 🔐 Adatvédelem és korlátok

- A GitHub-token és a kek.sh API-kulcs a userscript-kezelő tárhelyén (vagy szükség esetén helyi böngészőtárhelyben) tárolódik. Alapesetben **nem kerülnek bele a Gistbe**.
- A szinkronizált beállítások és galéria-metaadatok a **GitHub szolgáltatásához kerülnek**; a feltöltött képek a **kek.sh szolgáltatásához**. A Gist tartalma nincs külön titkosítva.
- A Gist **nem teljes körű biztonsági mentés**: a helyi nézetállapotok és a kapcsolati adatok nem mind részei. Teljesebb mentéshez használd a JSON-exportot a szükséges opciókkal.

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
[![colorize-avatar-focus-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-dark.jpg)

### hozzászólás-lánc popup (🔗 Lánc)

A **Lánc** gomb az aktuális oldalon elérhető hozzászólásláncot felugró, görgethető ablakban mutatja, válaszvonalakkal. A korábbi láncszínezésről készült képek már nem az aktuális működést ábrázolják.

### `#msgXXXX` fejléc-kiemelés

A kiválasztott hozzászólásnak **csak a fejléce** kapja a beállított kiemelőszínt; összecsukott, rejtett szerzőnél a látható „Rejtett” sáv is. A hozzászólástörzs eredeti háttere megmarad.

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

### modern nézet

Időrendi kártyanézet a Thread stílusával, válaszfa-vonalak nélkül. A normál és kompakt fórumelrendezésben egységes fejlécet, rangmegjelenítést és válaszhivatkozásokat használ.

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

### 🧰 nCore – Tools

**`ncore-tools.user.js`** az nCore-hoz készült segédfunkciókat **egyetlen scriptben egyesíti**, közös **beállítási panellel**, poszternézettel, qBittorrent integrációval és opcionális Gist-szinkronizációval.

### ⚡ Előnyök

- 📦 egyetlen telepítés
- 🔄 frissítéskor csak **egy** scriptet kell karbantartani
- ⚙️ a fő funkciók külön-külön ki-/bekapcsolhatók
- 🖼️ váltható **lista / poszter** torrentnézet, megjegyzett nézetbeállítással
- 🔗 a qBittorrent WebUI címe közvetlenül az nCore infosávjából beállítható
- ☁️ a látott filmek és a qBittorrenttel hozzáadott torrentek GitHub Gisttel több eszköz között szinkronizálhatók

> 👉 **Telepítés:**  
> https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-tools.user.js

---

### 📦 nCore Tools összetevői

> [!NOTE]
> Az **nCore – Tools** beállításai az nCore infosávjában megjelenő **[Beállítások]** linken érhetők el.

| Funkció                              | Rövid leírás                                                                                                                                                                                            |
|--------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **qBittorrent integráció**           | A torrentek közvetlenül elküldhetők a qBittorrent WebUI-nak a torrentlistából, a lenyíló panelből, a részletező oldalról és poszternézetből. A WebUI címe az infosáv **[qB URL]** linkjén állítható be. |
| **Lista / poszter nézet**            | A torrentlista egy kattintással klasszikus lista- vagy kártyás poszternézetre váltható; a választott nézetet a script megjegyzi.                                                                        |
| **Poszterkártyák**                   | A kártyákon megjelenhet a borító, kategória, minőség/formátum, IMDb értékelés, méret, seed/leech adatok és feltöltési idő, valamint letöltés-, könyvjelző-, qBittorrent- és „Láttam már” műveletek.     |
| **Poszteres részletező ablak**       | Poszternézetben a borítóra vagy a címre kattintva a torrent natív lenyíló részletei felugró ablakban nyithatók meg, ahonnan a teljes részletező oldal új lapon is elérhető.                             |
| **Népszerű torrentek kiemelése**     | A pozitív visszajelzések alapján kiemeli a torrenteket. A szükséges `+` jelek minimuma a beállításokban módosítható; alapértelmezés: **3**.                                                             |
| **„Láttam már” jelölés**             | Filmek jelölhetők a listában dupla kattintással, a részletező oldalon vagy poszternézetben. A jelölt filmek elhalványulnak, a mentett lista pedig külön fülön kezelhető.                                |
| **IMDb-alapú keresés**               | A torrent részletező oldalán a „Más verziók” mellett megjelenő **Keresés** hivatkozás az IMDb-azonosítóra keres rá az nCore-on, ha az azonosító kinyerhető.                                             |
| **Látott filmek Gist-szinkronja**    | A látott filmek IMDb-azonosítóval, címmel és időbélyeggel GitHub Gistbe szinkronizálhatók több böngésző vagy eszköz között.                                                                             |
| **qBittorrent letöltési előzmények** | A qBittorrentnek elküldött torrenteket a script helyben nyilvántartja, külön **Letöltések** fülön megjeleníti, és Gist használatakor szinkronizálja is.                                                 |
| **Képek beágyazása**                 | A torrentlista lenyíló leírásában a csatolt és hivatkozott képeket közvetlenül megjeleníti, a támogatott FancyBox működését megtartva.                                                                  |
| **Reklámok elrejtése**               | A főoldalon és a torrentoldalon ismert reklámelemeket CSS-sel elrejti.                                                                                                                                  |
| **Köszönetek elrejtése**             | Eltávolítja a köszönetek névlistáját, miközben a megköszönések darabszámát megtartja a leírásban.                                                                                                       |
| **Dereferer linkek eltávolítása**    | A támogatott dereferer köztes linkeket közvetlen cél-URL-re cseréli, és `nofollow` / `noreferrer` attribútumokat használ.                                                                               |

### ⚙️ Beállítások

Az infosávban megjelenő **[Beállítások]** menü négy lapra oszlik:

- **Általános** – qBittorrent, torrentkiemelés és küszöbértéke, „Láttam már”, képbeágyazás, reklámok, köszönetek és dereferer-kezelés
- **Látott filmek** – a mentett filmek listája, nCore keresési linkkel és törlési lehetőséggel
- **Letöltések** – a qBittorrenttel hozzáadott torrentek listája azonosítóval és időponttal
- **Szinkronizáció** – GitHub Gist token, Gist ID, fájlnév és kézi **Szinkronizálás most** művelet

A kapcsolható modulok módosításai mentés után, az oldal újratöltésével lépnek életbe.
A **lista / poszter nézetváltó** és a részletező oldali **IMDb-alapú keresés** külön modulkapcsoló nélkül működik. A választott torrentnézetet a script megjegyzi.

### 🔗 qBittorrent beállítása

A **qBittorrent integrációhoz** az infosáv **[qB URL]** linkjén add meg a qBittorrent WebUI címét, például:

```text
http://127.0.0.1:8080
```

---

### 🔄 Gist szinkronizáció beállítása
<details>

<summary>Kattints ide a kibontáshoz</summary>

A Gist-szinkronizáció a **látott filmeket** és a **qBittorrenttel hozzáadott torrentek előzményeit** tartja szinkronban több böngésző vagy eszköz között.

#### 📄 Gist adatok

A **Beállítások → Szinkronizáció** fülön add meg:

- **GitHub Gist Token**
- **Gist ID**
- **Gist fájlnév** – alapértelmezés: `ncore_seen.json`

A **GitHub-token** és a **Gist ID** megadása szükséges; üres fájlnév esetén a script automatikusan a `ncore_seen.json` értéket használja. A kapcsolatot a **Mentés és újratöltés**, illetve a **Szinkronizálás most** gombbal is elmentheted.

Induláskor a script csak akkor szinkronizál automatikusan, ha a **„Láttam már”** vagy a **qBittorrent integráció** modul közül legalább az egyik aktív. Ha mindkettőt kikapcsolod, a **Szinkronizálás most** gomb továbbra is használható. A bekapcsolt modulokkal végzett új „Láttam már” jelölések és sikeres qBittorrent-küldések automatikus szinkront is indítanak, rövid késleltetéssel.

A Gistben a script két adathalmazt kezel:

- `movies` – látott filmek IMDb-azonosítóval, címmel, állapottal és időbélyeggel
- `downloads` – qBittorrentnek elküldött torrentek azonosítóval, címmel és időbélyeggel

A szinkronizáció az azonosítókhoz tartozó legfrissebb időbélyegű állapotokat egyesíti; a **„Láttam már” jelölés visszavonása** is szinkronizálható. A Gist a két adatgyűjteményen és a formátumverzión kívül **nem tárolja a qBittorrent URL-t vagy a modulbeállításokat**.

**Adatvédelem:** a Gistben tárolt film- és letöltési előzményeket a GitHub kezeli. A GitHub-token a helyi userscript-tárolóban (GM API hiányában a böngésző helyi tárolójában) marad, nem kerül bele a Gist tartalmába. A *Secret Gist* nem valóban privát: a link ismeretében a tartalom megtekinthető. A PH Power Tools és az nCore Tools számára **külön Gist-fájlt** használj, mert eltérő JSON-formátumot írnak.

</details>

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
