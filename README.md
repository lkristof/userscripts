# lkristof/userscripts

## PH Power Tools

`ph-power-tools.user.js` – kapcsolható funkciók a **prohardver.hu**, **mobilarena.hu**, **logout.hu**, **fototrend.hu** és **hardverapro.hu** oldalakon.

**[Telepítés – PH Power Tools](https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js)**

Tampermonkey vagy Violentmonkey szükséges. A `GM_xmlhttpRequest`-et nem támogató userscript-kezelőkben a képfeltöltés és a Gist-szinkron korlátozott lehet.

A modulok a fejléc **PH Power Tools** menüjében, a **Megjelenés / Szűrés / Interakció** csoportokban kapcsolhatók. A **Mentés** újratölti az oldalt. Az OFF, a széles, a Modern és a Thread nézetnek külön témaoldali kapcsolója is van.

### Funkciók

| Funkció                            | Működés                                                                                                                                                                                                                                                                                         |
|------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Hozzászólások színezése**        | Saját hozzászólás, neked címzett válasz, `#akció` / `#akcio`, illetve profilképre kattintással szerző- és válaszfókusz. Egyéni világos/sötét paletta. Modern, Thread és Lánc popup nézetben a klasszikus szövegtörzs eredeti palettaszíne jelenik meg, hozzá igazított fejléccel és szegéllyel. |
| **Hozzászólás-lánc popup**         | A **Lánc** gomb megmutatja az előzményeket és a kapcsolódó válaszágakat, teljes szöveggel, válaszvonalakkal és az eredeti bejegyzésekre mutató hivatkozásokkal. Hiányzó hozzászólások más oldalakról is betölthetők.                                                                            |
| **Modern nézet**                   | Időrendi, kártyás megjelenítés; válaszfa-behúzások és összekötő vonalak nélkül. Egységes fejléc és szerkesztő normál/kompakt fórumelrendezésben.                                                                                                                                                |
| **Thread nézet**                   | Válaszkapcsolatok szerinti hozzászólásfa, összekötő vonalakkal, ágankénti összecsukással, **Összecsuk mind / Kibont mind** művelettel.                                                                                                                                                          |
| **Széles nézet**                   | Szélesebb tartalom; a jobb széle húzással állítható, dupla kattintással automatikus szélességre állítható vissza.                                                                                                                                                                               |
| **OFF hozzászólások elrejtése**    | `[OFF]` bejegyzések elrejtése és felfedése, Modern/Thread nézetben animációval; a navigáció az elrejtett hozzászólásokat kihagyja.                                                                                                                                                              |
| **Felhasználók elrejtése**         | Megadott szerzők hozzászólásainak elrejtése, ideiglenes megjelenítése és a tiltólista kezelése.                                                                                                                                                                                                 |
| **Üzenet kiemelés**                | `#msg12345` hivatkozásra görgetés és fejlécszínezés; a fejléc dupla kattintással is kijelölhető.                                                                                                                                                                                                |
| **Új hozzászólások jelölése**      | Témánként nyilvántartja a legutóbb látott hozzászólásazonosítót, jelöli az új bejegyzéseket, és az első olvasatlanhoz ugrik.                                                                                                                                                                    |
| **Billentyűzetes navigáció**       | Hozzászólások közti léptetés nyilakkal, válaszelőzmény megnyitása `R`-rel és visszalépés `Shift+R`-rel.                                                                                                                                                                                         |
| **Mobil navigációs panel**         | Húzható, összecsukható lebegő panel a hozzászólások és fórumoldalak közti léptetéshez; megjegyzi a helyét.                                                                                                                                                                                      |
| **Link átirányítás**               | A támogatott fórumdomainek közötti fórumhivatkozásokat az aktuális domainhez igazítja.                                                                                                                                                                                                          |
| **Extra smiley-k**                 | További smiley-k és emojik a fórum- és privátüzenet-szerkesztőben.                                                                                                                                                                                                                              |
| **kek.sh képfeltöltő**             | Képfeltöltés API-kulccsal, kép/link beszúrása a szerkesztőbe, rácsos/listás galéria, törlés és opcionális Gist-szinkron.                                                                                                                                                                        |
| **Nyereményjáték válaszellenőrző** | Lezárult nyereményjátékokban ellenőrzi a válaszokat, jelöli az eredményt és kiemeli a nevet a nyerteslistában.                                                                                                                                                                                  |
| **Fix oldalsávok**                 | Görgetéskor látható oldalsávok, az aktuális téma kiemelésével.                                                                                                                                                                                                                                  |
| **Témalisták rendezése**           | A **Kedvenc fórumtémáim** és **Itt szóltam hozzá** listák rendezése az új hozzászólások száma szerint.                                                                                                                                                                                          |

### Lánc popup – többoldalas betöltés

- Megnyitáskor a már betöltött hozzászólásokból építi fel a kiválasztott bejegyzés **előzményeit és saját válaszágait**.
- A **További előzmények betöltése** és **További válaszok betöltése** gombok szükség esetén, kattintásra kérnek le más fórumoldalakat. Az előzmények keresése a hiányzó szülőazonosító alapján, a válaszkeresés későbbi oldalak átvizsgálásával történik.
- A letöltés **200 hozzászólásos tartományokban** zajlik, a beállított fórum-oldalmérettől függetlenül. Példa: `#89605` → `hsz_89601-89800.html`. Egy kattintás legfeljebb **3 új előzményoldalt**, illetve **3 válaszoldalt** vizsgál meg; a keresés folytatható.
- A popup csak a lánchoz tartozó bejegyzéseket jeleníti meg. Megtartja a fórum növekvő/csökkenő sorrendjét, a válaszvonalakat, a színezést és a betöltés közbeni görgetési pozíciót.
- **Gyorsítótár:** a sikeresen háttérben letöltött oldalakat megosztja az ugyanazon fórumoldalon egymás után megnyitott popupok között. **10 perc**, legfeljebb **10 darab 200-as tartomány**, témánként/domainenként elkülönítve, LRU-kidobással. A már látható hozzászólásokat közvetlenül az oldalból olvassa, nem menti ebbe a cache-be.
- A cache **csak JavaScript-memóriában létezik**: oldalfrissítéskor vagy oldalváltáskor elvész, nem része a Gistnek vagy a JSON-mentésnek. Sikertelen betöltés újrapróbálható; a popup bezárása megszakítja a folyamatban lévő kérést.

### Billentyűparancsok

| Billentyű             | Művelet                                         |
|-----------------------|-------------------------------------------------|
| `↑` / `↓`             | Előző / következő látható hozzászólás           |
| `←` / `→`             | Első / utolsó látható hozzászólás               |
| `Shift+↑` / `Shift+↓` | Előző / következő hozzászólás azonosító szerint |
| `R`                   | A kijelölt hozzászólás előzményére ugrás        |
| `Shift+R`             | Visszalépés a bejárt előzményben                |

Szövegbevitel és nyitott képgaléria közben nem aktív. A rejtett OFF hozzászólásokat kihagyja. Az `R`/`Shift+R` előzményt a mobilpanel is használja; a bejárt útvonal `sessionStorage`-ban tárolódik.

### Beállításmentés és Gist-szinkron

**JSON-export / import:** a PH Power Tools menü export ikonjával menthetők és visszaállíthatók a modulkapcsolók, színpaletták, rejtett felhasználók, nézetállapotok és navigációs beállítások. Külön opcióval az olvasottsági adatok és a kek.sh galéria, illetve az **API-/Gist-kulcsok** is menthetők. Az importálás ellenőrzi a fájlt (maximum **10 MB**), megerősítést kér és újratölti az oldalt. A kulcsokat tartalmazó export **nincs titkosítva**.

**GitHub Gist:** a modulbeállításokat, színpalettákat, rejtett felhasználókat, olvasottsági azonosítókat és kek.sh galériaadatokat szinkronizálja. A helyi nézetállapotok, mobilpanel-pozíció, billentyűzetes előzmények és API-kulcsok **nem szinkronizálódnak**.

<details>
<summary>Gist beállítása</summary>

1. Hozz létre [fine-grained GitHub-tokent](https://github.com/settings/personal-access-tokens) **Account permissions → Gists: Read and write** jogosultsággal.
2. Hozz létre egy [Gistet](https://gist.github.com) `ph_forum_settings.json` fájllal, amelynek kezdeti tartalma `{}`.
3. A scriptben nyisd meg a **Kulcsok és szinkron** menüt, és add meg a tokent, a Gist ID-t és a fájlnevet; majd **Mentés**.

**Figyelem:** meglévő beállítások mellett az első Gist-kapcsolódás előtt készíts JSON-exportot. Az üres Gist felülírhatja a még nem módosított helyi, szinkronizált adatokat; szükség esetén importáld vissza a mentést. A *Secret Gist* link birtokában a tartalma elolvasható. A hozzáférési tokenek nem kerülnek a Gistbe.

</details>

### Képernyőképek

**Menü**

[![menu-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-light.jpg)
[![menu-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/menu-dark.jpg)

**Saját és rád válaszoló hozzászólások**

[![colorize-own-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-light.jpg)
[![colorize-own-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/own-reply-dark.jpg)

**`#akcio` jelölésű hozzászólások**

[![colorize-akcio-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-light.jpg)
[![colorize-akcio-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/akcio-dark.jpg)

**Felhasználó hozzászólásainak kiemelése (arcképre kattintva)**

[![colorize-avatar-focus-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-light.jpg)
[![colorize-avatar-focus-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/avatar-click-dark.jpg)

### Lánc popup

[![chain-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-light.jpg)
[![chain-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/chain-dark.jpg)

### `#msgXXXX` kiemelés

[![msg-anchor-highlight-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-light.jpg)
[![msg-anchor-highlight-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/msg-highlight-dark.jpg)

**Normál vs. széles**

[![normal-view](https://raw.githubusercontent.com/lkristof/userscripts/main/img/normal-view-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/normal-view-light.jpg)
[![wide-view](https://raw.githubusercontent.com/lkristof/userscripts/main/img/wide-view-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/wide-view-light.jpg)

**Thread nézet**

[![thread-view-light](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-light-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-light.jpg)
[![thread-view-dark](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-dark-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/thread-view-dark.jpg)

**Felhasználó rejtése (elrejtés, rejtve, felfedve, feloldás, menü)**

[![dropdown-hide](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-hide-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-hide.jpg)
[![hidden](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-hidden-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-hidden.jpg)
[![shown](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-shown-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-shown.jpg)
[![dropdown-unhide](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-unhide-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-dropdown-unhide.jpg)
[![user-menu](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-menu-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/hide-user-menu.jpg)

**Képfeltöltés kek.sh-ra**

[![grid](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-grid-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-grid.jpg)
[![list](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-list-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/keksh-list.jpg)

**Színek testreszabása**

[![colorize-config](https://raw.githubusercontent.com/lkristof/userscripts/main/img/colorize-config-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/colorize-config.jpg)

**Kulcsok / szinkron beállítások**

[![sync-config](https://raw.githubusercontent.com/lkristof/userscripts/main/img/sync-config-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/sync-config.jpg)

**Export / Import**

[![export-import](https://raw.githubusercontent.com/lkristof/userscripts/main/img/export-import-th.jpg)](https://raw.githubusercontent.com/lkristof/userscripts/main/img/export-import.jpg)

---

## nCore Tools

`ncore-tools.user.js` – torrentlista, poszternézet, qBittorrent és nyilvántartási funkciók.

**[Telepítés – nCore Tools](https://raw.githubusercontent.com/lkristof/userscripts/main/ncore/ncore-tools.user.js)**

### Funkciók

| Funkció                              | Működés                                                                                                                                                                                                 |
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

### Beállítások

Az nCore infosáv **Beállítások** hivatkozásán négy fül érhető el: **Általános** (modulok és kiemelési küszöbérték), **Látott filmek** (lista és törlés), **Letöltések** (qBittorrentnek elküldött torrentek), **Szinkronizáció** (Gist-kapcsolat és kézi szinkron).

A qBittorrent WebUI címe az infosáv **qB URL** hivatkozásán állítható be, például `http://127.0.0.1:8080`. A lista/poszter nézet és az IMDb-keresés külön modulkapcsoló nélkül használható; a választott torrentnézet megmarad.

### Gist-szinkron

A **Szinkronizáció** fülön a GitHub-token és Gist ID szükséges, az alapértelmezett fájlnév `ncore_seen.json`. A **Mentés és újratöltés** vagy a **Szinkronizálás most** gomb használható.

A Gist a `movies` (látott filmek, időbélyegek, állapotok) és `downloads` (elküldött torrentek) adatait szinkronizálja. A **Láttam már** és a **qBittorrent integráció** közül legalább egy bekapcsolt modul esetén automatikus szinkron is működik; a kézi szinkron ettől függetlenül elérhető. A jelölés visszavonása is szinkronizálódik.

A qBittorrent URL és a modulbeállítások nem kerülnek a Gistbe. A token helyben marad. A PH Power Tools és az nCore Tools **külön Gist-fájlt** használjon.

---

## Licenc

[MIT License](LICENSE)
