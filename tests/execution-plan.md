# Végrehajtási Terv

Dátum: 2026-04-03
Kapcsolódó fájl: `tests/project-analysis.md`

## 1. Cél

A cél nem új funkció hozzáadása, hanem a jelenlegi MVP stabilabb, tisztább és könnyebben bővíthető szerkezetre rendezése úgy, hogy közben a meglévő működés megmaradjon.

## 2. Elv

Minden fázis után működőképes állapotnak kell maradnia a projektnek.

Minden fázis végén ellenőrizni kell:

- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `npm run test:visual`

## 3. Végrehajtási sorrend

1. Elemző és derived logika kiszervezése az `App` komponensből
2. Nézetenkénti állapot- és műveleti logika szétválasztása
3. `store.js` domain alapú bontása
4. CSS rétegezése és nézetenkénti tisztítása
5. Adatkonzisztencia javítása
6. README és futási modell tisztázása
7. Plusz tesztek hozzáadása

## 4. Fázisok

### Fázis 1 - Az `App.jsx` tehermentesítése

Cél:
- csökkenteni a központi komponens felelősségét

Érintett fájlok:
- `src/App.jsx`
- új helper vagy hook fájlok a `src/lib` vagy `src/views` alatt

Feladatok:
1. A `derived` számításokat külön modulba kiszervezni.
2. A dátumhoz kapcsolódó nézetlogikát külön helperbe tenni.
3. A toast, theme és nézetváltás logikát elkülöníteni az adatkezeléstől.
4. A nagyobb kezelőfüggvényeket csoportosítani feature szerint.

Elvárt eredmény:
- az `App.jsx` főleg összerakó és vezérlő komponens legyen
- a számoló és előkészítő logika ne a komponens törzsében éljen

Kilépési feltétel:
- az `App.jsx` érezhetően rövidebb és áttekinthetőbb
- nincs viselkedésváltozás

### Fázis 2 - View model vagy hook alapú szétválasztás

Cél:
- a három fő nézet önállóbb legyen

Érintett fájlok:
- `src/App.jsx`
- `src/views/TodayView.jsx`
- `src/views/PlanningView.jsx`
- `src/views/DetailsView.jsx`
- új hookok, például:
  - `src/hooks/useTodayView.js`
  - `src/hooks/usePlanningView.js`
  - `src/hooks/useDetailsView.js`

Feladatok:
1. A napi nézethez tartozó állapotokat és műveleteket külön hookba szervezni.
2. A feladat- és gondolatkezelést külön hookba szervezni.
3. A részletek és forráskezelés logikáját külön hookba szervezni.
4. A view komponensek props felületét egyszerűsíteni.

Elvárt eredmény:
- kevesebb prop-drilling
- a nézetek saját logikája jobban egyben marad

Kilépési feltétel:
- egy nézet működését érintő módosításhoz ne kelljen az egész `App.jsx`-et végigolvasni

### Fázis 3 - A `store.js` domain alapú bontása

Cél:
- az adatréteg felelősségeinek szétválasztása

Érintett fájlok:
- `src/lib/store.js`
- új fájlok, például:
  - `src/lib/store/tasks.js`
  - `src/lib/store/thoughts.js`
  - `src/lib/store/habits.js`
  - `src/lib/store/sources.js`
  - `src/lib/store/planning.js`
  - `src/lib/store/shared.js`

Feladatok:
1. A közös segédfüggvényeket külön `shared` modulba tenni.
2. A task logikát külön fájlba mozgatni.
3. A thought logikát külön fájlba mozgatni.
4. A habit logikát külön fájlba mozgatni.
5. A source és option logikát külön fájlba mozgatni.
6. A heti terv, schedule és routine műveleteket külön fájlba mozgatni.
7. A végén csak egy vékony aggregáló belépési pont maradjon, ha szükséges.

Elvárt eredmény:
- minden domain logika külön helyen legyen
- a módosítások kisebb kockázatúak legyenek

Kilépési feltétel:
- a `store.js` megszűnik mindent vivő fájlnak lenni

### Fázis 4 - CSS rétegezése

Cél:
- a felületi réteg legyen tisztábban szervezett

Érintett fájlok:
- `src/index.css`
- új stílusfájlok, például:
  - `src/styles/base.css`
  - `src/styles/layout.css`
  - `src/styles/today-view.css`
  - `src/styles/planning-view.css`
  - `src/styles/details-view.css`

Feladatok:
1. A globális reset és token szabályokat külön választani.
2. A layout szabályokat külön választani.
3. A nézet-specifikus stílusokat külön fájlokba mozgatni.
4. A ritkán használt utility osztályokat felülvizsgálni.

Elvárt eredmény:
- kisebb és könnyebben kereshető stílusfájlok
- kisebb kockázat egy nézet módosításánál

Kilépési feltétel:
- az `index.css` csak alap globális szerepet vigyen

### Fázis 5 - Adatkonzisztencia javítása

Cél:
- megszüntetni az eltérő rutinblokk-nevezésekből eredő kerülőlogikát

Érintett fájlok:
- `src/views/shared.js`
- `tests/e2e/helpers/supabaseMock.js`
- `supabase/seed.sql`

Feladatok:
1. Dönteni egyetlen kanonikus névformáról.
2. A seed adatokat ehhez igazítani.
3. A mock adatokat ehhez igazítani.
4. A név-normalizáló kerülőlogikát minimalizálni vagy megszüntetni.

Elvárt eredmény:
- egységesebb adatok
- kevesebb speciális megjelenítési kivétel

Kilépési feltétel:
- ugyanazt a fogalmat mindenhol ugyanúgy nevezi a rendszer

### Fázis 6 - Futási modell és dokumentáció tisztázása

Cél:
- a README és a valós működés legyen összhangban

Érintett fájlok:
- `README.md`
- `src/lib/supabase.js`
- `src/lib/store.js`
- opcionálisan `public/env.js`

Feladatok:
1. Eldönteni, hogy a Supabase kötelező vagy opcionális.
2. Ha kötelező, a README-t ennek megfelelően javítani.
3. Ha opcionális, valódi local/demo fallback módot kialakítani.
4. A runtime env használatot röviden és pontosan dokumentálni.

Elvárt eredmény:
- a fejlesztő pontosan értse, mi kell a futtatáshoz

Kilépési feltétel:
- a dokumentáció és a tényleges működés ne mondjon egymásnak ellent

### Fázis 7 - Minőségbiztosítás bővítése

Cél:
- csökkenteni a jövőbeni regressziók esélyét

Érintett fájlok:
- `tests/e2e/*.spec.js`
- `tests/visual/*.spec.js`

Feladatok:
1. Mobil viewportos vizuális teszt hozzáadása.
2. Legalább egy olyan E2E teszt hozzáadása, ami a nézetek közötti alap navigációt ellenőrzi.
3. Opcionálisan külön teszt a Supabase hiányára vagy demo módra.

Elvárt eredmény:
- jobb biztonság a refaktor során

Kilépési feltétel:
- a kritikus fő útvonalak teszttel fedettek

## 5. Javasolt bontás kisebb munkacsomagokra

### Munkacsomag A

Tartalom:
- Fázis 1

Kimenet:
- kisebb `App.jsx`
- kiszervezett derived logika

### Munkacsomag B

Tartalom:
- Fázis 2

Kimenet:
- nézetenként külön hook vagy view model

### Munkacsomag C

Tartalom:
- Fázis 3

Kimenet:
- domain alapú store struktúra

### Munkacsomag D

Tartalom:
- Fázis 4

Kimenet:
- szétválasztott CSS

### Munkacsomag E

Tartalom:
- Fázis 5 és 6

Kimenet:
- konzisztens adatok
- tiszta dokumentáció

### Munkacsomag F

Tartalom:
- Fázis 7

Kimenet:
- erősebb regressziós védelem

## 6. Kockázatok

- Nagy refaktor közben könnyen törhet a jelenlegi props lánc.
- A `store.js` bontása közben könnyű észrevétlen importkört létrehozni.
- A CSS szétválasztáskor megjelenési regresszió keletkezhet.
- Az adatkonzisztencia javítása teszteket és seed adatokat is érinteni fog.

## 7. Döntési pontok

Az implementáció előtt ezt a 3 kérdést érdemes végleg eldönteni:

1. Lesz-e valódi Supabase nélküli demo mód?
2. Marad-e JavaScript a közeljövőben, vagy induljon TypeScript irányba a következő nagyobb refaktor?
3. A nézetlogikát custom hookokba vagy konténerkomponensekbe érdemesebb szervezni a csapat szokásai alapján?

## 8. Ajánlott első konkrét lépés

Első tényleges munkának ezt érdemes elindítani:

1. `App.jsx` derived logikájának kiszervezése
2. `TodayView`-hoz tartozó műveletek külön hookba vitele
3. teljes ellenőrzés a meglévő tesztekkel

Ez adja a legjobb nyereség / kockázat arányt.
