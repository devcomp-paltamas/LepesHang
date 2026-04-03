# Projektanalízis

Dátum: 2026-04-03
Állapot: működő MVP, de a belső szerkezet refaktorérett

## 1. Rövid értékelés

A projekt jó irányban van. A stack egyszerű és racionális, a fő felhasználói folyamatok már látszanak, és a tesztelés sem hiányzik. A legnagyobb kockázat most nem a funkcióhiány, hanem az, hogy az alkalmazásmag túl sok felelősséget tart egyben.

## 2. Fő megállapítások

### P1 - Magas prioritás

#### 1. Az `App` komponens túlterhelt

Érintett fájl:
- `src/App.jsx`

Mi a gond:
- Egy helyen történik az adatbetöltés, az állapotkezelés, a derived state számolás, a nézetváltás és a legtöbb műveleti logika.
- Ez gyorsan nehezíti a karbantartást és növeli a regressziók esélyét.

Miért fontos:
- Minden új funkció ide fog tovább torlódni.
- Egy kisebb módosítás is több nézetet vagy folyamatot érinthet mellékesen.

#### 2. A `store.js` túl sok szerepet visz egyszerre

Érintett fájl:
- `src/lib/store.js`

Mi a gond:
- Ugyanabban a fájlban van repository logika, validáció, kompatibilitási kezelés, hibakezelés és domain műveleti logika.

Miért fontos:
- Nehezebb tesztelni és bontani.
- A feladatok, gondolatok, szokások és források logikája össze van húzva.

#### 3. A CSS túl centralizált

Érintett fájl:
- `src/index.css`

Mi a gond:
- Egyetlen nagy globális stílusfájl kezeli szinte az egész felületet.

Miért fontos:
- A felületi változtatások kockázatosabbak.
- A komponensszintű felelősség nem látszik tisztán.

### P2 - Közepes prioritás

#### 4. Adat- és névkonzisztencia-probléma van a rutinblokkoknál

Érintett fájlok:
- `src/views/shared.js`
- `tests/e2e/helpers/supabaseMock.js`
- `supabase/seed.sql`

Mi a gond:
- A rendszer több helyen eltérő névformákat használ, például ékezetes és ékezet nélküli változatokat.
- Emiatt külön normalizáló logika kellett a megjelenítéshez.

Miért fontos:
- Ez később könnyen okozhat hibát szűrésnél, összerendelésnél vagy riportoknál.

#### 5. A dokumentáció és a valós működés nincs teljesen összhangban

Érintett fájlok:
- `README.md`
- `src/lib/store.js`

Mi a gond:
- A README opcionális Supabase kapcsolatról beszél, de a jelenlegi működés szerint az alkalmazás ténylegesen Supabase-függő.

Miért fontos:
- Félrevezetheti a fejlesztőt vagy deploy közben zavaró lehet.

### P3 - Alacsonyabb, de fontos prioritás

#### 6. A projekt már kinőtte a teljesen lazán típusozott JavaScript állapotot

Érintett terület:
- teljes frontend adatkezelés

Mi a gond:
- A state és a Supabase payloadok sok helyen implicit szerkezetre épülnek.

Miért fontos:
- Ahogy nő a funkcionalitás, egyre több lesz a csak futás közben észrevehető hiba.

## 3. Ami jelenleg erős

- A stack tiszta és egyszerű: Vite, React 18, Supabase, Playwright.
- A fő nézetek külön fájlokban élnek.
- Van E2E tesztelés.
- Van vizuális regressziós teszt is.
- A Supabase séma már most használható alapot ad.
- A mockolt tesztkörnyezet jól támogatja a gyors ellenőrzést.

## 4. Ellenőrzött állapot

Sikeresen lefutott:

- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `npm run test:visual`

## 5. Refaktor terv

### 1. fázis - Biztonságos szerkezeti bontás

Cél:
- a jelenlegi működés megtartása mellett csökkenteni az egy fájlra jutó felelősséget

Teendők:
1. Az `App` köré feature-szintű hookokat vagy konténereket készíteni.
2. Külön kezelni a `today`, `planning`, `details` nézet saját állapotait.
3. A derived state logikát kiszervezni külön selector vagy helper modulokba.

### 2. fázis - Adatréteg tisztítása

Cél:
- a `store.js` szétválasztása domain szerint

Teendők:
1. Külön modul a feladatoknak.
2. Külön modul a gondolatoknak.
3. Külön modul a szokásoknak.
4. Külön modul a forrásoknak és opcióknak.
5. Külön modul a heti tervezésnek és rutinoknak.

### 3. fázis - UI réteg tisztítása

Cél:
- jobban követhető komponens- és stílusstruktúra

Teendők:
1. A nagyobb view komponenseket kisebb szekciókomponensekre bontani.
2. A stílusokat nézetenként vagy modulonként szétválasztani.
3. A globális CSS-t csak valóban globális szabályokra szűkíteni.

### 4. fázis - Konzisztencia és minőség

Cél:
- kevesebb rejtett hiba, tisztább adatkezelés

Teendők:
1. Egységes rutinblokk-nevezéktan bevezetése.
2. A README és a valós runtime működés összehangolása.
3. Mobil vizuális regressziós teszt hozzáadása.
4. Később TypeScript vagy legalább szigorúbb runtime validáció bevezetése.

## 6. Ajánlott sorrend

1. `App.jsx` bontása
2. `store.js` domain alapú szétválasztása
3. CSS rétegezése
4. README és env működés tisztázása
5. adatkonzisztencia javítása
6. mobil vizuális teszt

## 7. Érintett fontos fájlok

- `src/App.jsx`
- `src/lib/store.js`
- `src/index.css`
- `src/views/shared.js`
- `tests/e2e/helpers/supabaseMock.js`
- `supabase/schema.sql`
- `supabase/seed.sql`
- `README.md`
