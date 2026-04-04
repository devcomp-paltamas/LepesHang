# CONTRIBUTING

Projekt: LépésHang
Állapot: alap hozzájárulási útmutató
Dátum: 2026-04-04

## 1. Cél

Ez a fájl rövid irányelveket ad ahhoz, hogyan érdemes a projektben fejleszteni úgy, hogy a kód tiszta, következetes és biztonságosan módosítható maradjon.

## 2. Alapelv

Fejlesztés közben ezek legyenek az elsődleges szempontok:
- egyszerű, jól olvasható megoldás
- kis kockázatú módosítás
- meglévő működés megtartása
- mobil-első gondolkodás
- következetes UI és adatkezelés

## 3. Stack

A projekt jelenlegi fő elemei:
- React 18
- Vite
- Supabase
- Playwright
- globális CSS alapú stílusréteg

## 4. Mielőtt dolgozni kezdesz

Ajánlott lépések:
1. Olvasd el a `README.md`, `SPEC.md`, `ARCHITECTURE.md` és `ROADMAP.md` fájlokat.
2. Nézd meg, melyik domainhez tartozik a módosítás:
   - rutin és tervezés
   - feladatok
   - gondolatok
   - szokások
   - forrástár
3. A módosítást lehetőleg a megfelelő modulban végezd el, ne központi kerülőmegoldással.

## 5. Kódszervezési szabályok

### 5.1 View

A nézetfájlok feladata:
- megjelenítés
- egyszerű interakciók
- jól olvasható UI szerkezet

Kerüld:
- nagy üzleti logika view komponensbe írását
- túl sok inline feldolgozást JSX-ben

### 5.2 Hook

A hookok feladata:
- nézetenkénti state
- űrlaplogika
- felhasználói műveletek összefogása

### 5.3 Store

A store modulok feladata:
- Supabase műveletek
- validáció
- domain logika
- hibakezelés

Elv:
- új műveletet mindig a megfelelő domain store fájlba tegyél

### 5.4 Selector és view model

Ha rendezésre, szűrésre vagy derived state-re van szükség:
- lehetőleg a selector vagy view model rétegbe kerüljön
- ne a view komponensben legyen szétosztva

## 6. UI/UX szabályok

Az alkalmazás legyen:
- mobilon gyorsan használható
- desktopon jól skálázódó
- tömör, de nem zsúfolt

Irányelvek:
- a napi gyakori műveletek legyenek könnyen elérhetők
- a ritkább szerkesztések lehetnek másodlagosak vagy lenyithatók
- a vezérlők legyenek kompaktak mobil nézetben is
- a desktop szélességet érdemben használja ki a layout

## 7. CSS szabályok

Jelenleg a legtöbb stílus a `src/index.css` fájlban van.

Fejlesztési elv:
- új szabályt csak akkor tegyél globálisan, ha tényleg globális
- ahol lehet, kövesd a meglévő elnevezési mintákat
- egy változtatás ne törje meg más nézetek működését

Ha új UI minta születik:
- legyen konzisztens a többi vezérlővel
- legyen reszponzív
- mobilon is férjen el kulturáltan

## 8. Adatkezelési szabályok

Minden adatbázis-műveletnél:
- legyen világos validáció
- legyen érthető hibaüzenet
- ha kell, legyen reload az állapot frissítésére

Ha új táblát vagy mezőt vezetsz be:
- frissítsd a `supabase/schema.sql` fájlt
- ha kell, frissítsd a `supabase/seed.sql` fájlt is
- igazítsd hozzá a mockolt tesztkörnyezetet

## 9. Tesztelési szabályok

Módosítás után minimum ezt ellenőrizd:
- `npm run build`

Ha UI vagy fő felhasználói folyamat változik, ellenőrizd még:
- releváns `tests/e2e/*.spec.js`
- szükség esetén `tests/visual`

Ha új működés kerül be:
- lehetőleg készüljön rá célzott E2E teszt

## 10. Dokumentáció

Ha a módosítás érinti a működési modellt vagy a projekt szerkezetét, frissítsd a megfelelő fájlt:
- `README.md`
- `SPEC.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`

## 11. Commit és változtatási elv

Ajánlott:
- egy commit, egy jól körülhatárolt cél
- ne keverj össze szerkezeti refaktort és új funkciót, ha nem muszáj
- előbb a tiszta működés, utána a finom UI-polish

## 12. Mit kerüljünk

Kerüld:
- gyors, nehezen követhető hotfixeket
- duplikált logikát több fájlban
- néma állapotváltozást teszt nélkül
- olyan UI megoldást, ami csak desktopon működik jól

## 13. Minimális kész állapot egy módosításnál

Egy módosítás akkor tekinthető jó alapnak, ha:
- működik
- olvasható
- illeszkedik a jelenlegi szerkezethez
- nem rontja a mobil használhatóságot
- builddel ellenőrizhető
