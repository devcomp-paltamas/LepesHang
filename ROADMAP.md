# ROADMAP

Projekt: LépésHang
Állapot: induló fejlesztési ütemterv
Dátum: 2026-04-04

## 1. Cél

A roadmap célja, hogy a projekt következő fejlesztési lépéseit egyértelmű, prioritásalapú sorrendbe rendezze.

Fő elv:
- minden lépés után maradjon működőképes az alkalmazás
- a strukturális tisztítás és a napi használhatóság egyszerre javuljon

## 2. Rövid prioritási kép

### P1

- architektúra tisztítása
- UI következetesség
- kritikus regressziók lefedése

### P2

- dokumentáció és futási modell pontosítása
- mobil és desktop finomhangolás
- adatkonzisztencia javítása

### P3

- bővített statisztikák
- kényelmi funkciók
- hosszabb távú technikai fejlesztések

## 3. Fázisok

## Fázis 1. Architektúra stabilizálása

Cél:
- csökkenteni a jelenlegi központi komponensek terhelését

Feladatok:
- `App.jsx` további egyszerűsítése
- view model és selector logika további tisztítása
- nézetenkénti state és műveleti logika még élesebb leválasztása

Elvárt eredmény:
- átláthatóbb adatfolyam
- kisebb regressziós kockázat új funkcióknál

## Fázis 2. UI réteg tisztítása

Cél:
- egységesebb és jobban karbantartható felület

Feladatok:
- a `src/index.css` bontása több stílusfájlra
- nézetenkénti stílusok elkülönítése
- közös UI minták egységesítése
- mobil és desktop layout szabályok tisztítása

Elvárt eredmény:
- gyorsabb vizuális módosítások
- kisebb mellékhatás egy-egy UI változtatásnál

## Fázis 3. Napi használhatóság finomhangolása

Cél:
- a napi elsődleges útvonalak még gyorsabbá tétele

Feladatok:
- szokáskövető további finomhangolása
- task és thought listák gyorsabb kezelése
- kompaktabb vezérlők mobilon
- üres állapotok és visszajelzések finomítása

Elvárt eredmény:
- kevesebb kattintás
- gyorsabb napi használat

## Fázis 4. Dokumentáció és működési modell

Cél:
- a projekt könnyebben átadható és bővíthető legyen

Feladatok:
- `README.md` pontosítása
- `SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md` karbantartása
- környezeti változók és Supabase működés tisztázása

Elvárt eredmény:
- új fejlesztő gyorsabban megérti a projektet
- kevesebb félreértés a futtatás körül

## Fázis 5. Tesztlefedettség bővítése

Cél:
- erősebb regressziós védelem

Feladatok:
- mobil vizuális regressziós teszt
- nézetváltási útvonalak lefedése
- kritikus napi flow-k további E2E lefedése
- hibás vagy hiányzó adatbázisállapotok célzott ellenőrzése

Elvárt eredmény:
- biztonságosabb refaktor
- gyorsabb visszajelzés hibáknál

## Fázis 6. Adatminőség és konzisztencia

Cél:
- csökkenteni a kerülőlogikákat és rejtett hibákat

Feladatok:
- rutinblokk-nevezéktan egységesítése
- seed és mock adatok tisztítása
- következetes állapot- és mezőnevek

Elvárt eredmény:
- egyszerűbb selectorok
- kevesebb speciális kivétel

## 4. Konkrét közeljövőbeli munkacsomagok

### Munkacsomag A

Tartalom:
- CSS bontási terv
- globális és nézetszintű stílusok szétválasztása

Kimenet:
- tisztább UI réteg

### Munkacsomag B

Tartalom:
- mobil vizuális teszt hozzáadása
- lapozók és kompakt vezérlők regressziós ellenőrzése

Kimenet:
- jobb mobilbiztonság

### Munkacsomag C

Tartalom:
- `App.jsx` további egyszerűsítése
- közös minták kiszervezése

Kimenet:
- könnyebben bővíthető alkalmazásmag

## 5. Lehetséges későbbi termékirányok

Nem azonnali, de lehetséges:
- erősebb napi összegző nézet
- heti vagy havi trendek
- jobb ajánlási logika
- sablon rutinok
- export vagy visszanézhető történet

## 6. Kockázatok

Fő kockázatok:
- a gyors UI módosítások szétszórt CSS mellékhatásokat okoznak
- túl sok logika marad központi komponensekben
- a tesztlefedettség nem nő elég gyorsan a funkciókhoz képest

## 7. Ajánlott munkaritmus

Minden nagyobb csomag végén:
- `npm run build`
- releváns Playwright tesztek
- szükség esetén vizuális ellenőrzés

Ajánlott elv:
- kis lépések
- célzott regressziós tesztek
- egyszerre csak egy felelősségi réteget módosítani
