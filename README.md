# 📦 lkristof/userscripts

Egyedi **Tampermonkey / Userscript** gyűjtemény, főleg **Prohardver! lapcsalád** fórumokhoz, plusz néhány egyéb oldalhoz.

---

## 💍 Ajánlott: Prohardver Power Tools (egy script mind fölött)

**`ph-power-tools.user.js`** egy minden-egyben userscript,  
ami a Prohardver! fórumokhoz készült funkciókat **egyetlen scriptbe gyúrja össze**,  
külön **beállítómenüvel**, kapcsolható modulokkal.

### Tartalmazza többek között:
- hozzászólások színezése
- link átirányítás
- üzenet kiemelés
- off hozzászólások elrejtése
- széles nézet
- thread nézet
- billentyűzetes navigáció

### Előnyök
- 📦 egyetlen telepítés
- 🔄 frissítéskor csak **egy** scriptet kell karbantartani
- ⚙️ külön menü, funkciónként ki-/bekapcsolható
- 🧠 egységes működés

### Fókusz
- jobb olvashatóság
- hasznos vizuális kiemelések
- kényelmesebb fórumhasználat

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-power-tools.user.js

---

> 💡 **Megjegyzés:**  
> A projekt eredetileg különálló userscriptekből indult, egy-egy konkrét problémára fókuszálva.  
> Idővel ezek összeértek, és megszületett a **Prohardver Power Tools** mint egyetlen, egységes megoldás.  
> A régi scripteket azonban meghagytam külön is, ha valaki csak egy-egy funkciót szeretne használni.

---

## 🧰 Szükséges eszköz

A scriptek futtatásához kell egy userscript kezelő:

- **Tampermonkey** (Chrome / Edge / Opera ajánlott)
- **Violentmonkey** (Chrome / Firefox)
- **Greasemonkey** (Firefox)

---

## 🚀 Telepítés

1. Telepíts egy userscript kezelőt
2. Kattints az adott script **Install** linkjére
3. A megnyíló oldalon a bővítmény felajánlja a telepítést (vagy imádkozz 😇)

---

## 📜 Elérhető scriptek

### 🟠 Prohardver

#### 🔹 Prohardver Fórum – Hozzászólás színezés
Általános fórum UX javítások: kiemelések, fókusz, extra vizuális és kényelmi funkciók.  
Több kisebb fejlesztést egyesít egyetlen scriptben.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-colorize.user.js

---

#### 🔹 Prohardver Fórum – OFF hozzászólások elrejtése
Az `[OFF]` jelölésű hozzászólások elrejtése és visszakapcsolása gombnyomásra.  
Hasznos, ha a témán belüli zajt szeretnéd csökkenteni.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-off-hider.user.js

---

#### 🔹 Prohardver Fórum – Széles nézet
A fórum maximális szélességének kibővítése gombnyomásra.  
Jobb helykihasználás nagy felbontású kijelzőkön és hosszabb hozzászólásoknál.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-wide-view.user.js

---

#### 🔹 Prohardver Fórum – Link átirányító
A PH-lapcsaládhoz tartozó fórumlinkeket automatikusan az aktuális oldalra irányítja.  
Megszünteti az oldalak közti felesleges átugrálást.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-link-redirect.user.js

---

#### 🔹 Prohardver Fórum – Üzenet hivatkozás kiemelés
`#msgXXXX` hivatkozással megjelölt hozzászólás automatikus kiemelése.  
Gyorsabb kontextusértés hosszabb threadeknél.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-msg-anchor-highlight.user.js

---

#### 🔹 Prohardver Fórum – Thread nézet
Hozzászólás-láncok vizuális összekötése és strukturáltabb megjelenítése.  
Könnyebbé teszi a beszélgetések követését.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-thread-view.user.js

---

#### 🔹 Prohardver Fórum – Billentyűzetes navigáció
Billentyűzetes navigációt ad a PH-lapcsalád fórumaihoz, hogy egér nélkül is gyorsan lehessen mozogni a hozzászólások között.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-keyboard-navigation.user.js

---

### 🟢 Egyéb oldalak

#### 🔹 nCore – 3+ pluszos torrentek kiemelése
A letöltések listájában kiemeli a több pozitív visszajelzéssel rendelkező torrenteket.  
Segít gyorsabban megtalálni a népszerű tartalmakat.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-torrent-highlight.user.js

---

#### 🔹 nCore – qBittorrent Add
A torrent oldalakhoz **qBittorrent letöltés gombot** ad, lehetővé téve a torrentek közvetlen hozzáadását a qBittorrent WebUI-hoz.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-qbittorrent-add.user.js

---

#### 🔹 nCore – Láttam már!
Dupla kattintással elhalványíthatod a már látott torrenteket a listában, a jelölést pedig vissza is vonhatod.

👉 **Telepítés:**  
https://raw.githubusercontent.com/lkristof/userscripts/main/ncore-seen.user.js

---

## ⭐ Tipp

Ha egy script nem működik:
- frissítsd az oldalt
- ellenőrizd, hogy a script engedélyezve van-e
- nézd meg a böngésző konzolt (`F12`)
- és ha semmi nem segít: küldj áldást a böngésződre 🙏 vagy imádkozz a JavaScript istenhez 😇

---

Ha hibát találsz, ötleted van vagy továbbfejlesztenéd, **nyugodtan jelezd** 🙂

---

## 📄 License

MIT License
