# ARCHITECTURE

Projekt: LépésHang
Állapot: induló architektúra-leírás
Dátum: 2026-04-04

## 1. Áttekintés

A LépésHang egy React + Vite alapú, mobil-első alkalmazás, amely Supabase adatforrást használ.

Az architektúra fő célja:
- egyszerű kliensoldali működés
- gyors iteráció
- jól elkülöníthető domain logika
- tesztelhető UI és adatfolyam

## 2. Fő rétegek

### 2.1 App réteg

Fő fájl:
- `src/App.jsx`

Feladata:
- alkalmazás szintű állapot összerakása
- nézetváltás kezelése
- kezdeti adatbetöltés
- toast és theme kezelés
- a view modellek átadása a nézeteknek

### 2.2 Nézetréteg

Fő fájlok:
- `src/views/TodayView.jsx`
- `src/views/PlanningView.jsx`
- `src/views/DetailsView.jsx`

Feladata:
- a felület kirajzolása
- felhasználói interakciók kezelése a kapott callbackeken keresztül
- nézet-specifikus layout és megjelenítés

Elv:
- a nézet legyen főleg megjelenítő réteg
- a komolyabb műveleti logika hookokban vagy lib modulokban maradjon

### 2.3 Hook réteg

Fő fájlok:
- `src/hooks/useTodayView.js`
- `src/hooks/usePlanningView.js`
- `src/hooks/useDetailsView.js`
- `src/hooks/usePlanningUi.js`
- `src/hooks/useDetailsView.js`

Feladata:
- nézetenkénti állapotkezelés
- UI-specifikus műveletek
- űrlapok és lokális state kezelése
- store hívások és reload logika összekötése

### 2.4 View model / selector réteg

Fő fájlok:
- `src/lib/app-view-models.js`
- `src/lib/app-selectors.js`

Feladata:
- nyers store állapotból nézetbarát adatszerkezetek előállítása
- rendezés, szűrés, derived állapot számítás

Ez a réteg csökkenti azt, hogy a nézetekben vagy az `App.jsx`-ben legyen túl sok számoló logika.

### 2.5 Store réteg

Fő fájlok:
- `src/lib/store.js`
- `src/lib/store/load-state.js`
- `src/lib/store/tasks.js`
- `src/lib/store/thoughts.js`
- `src/lib/store/habits.js`
- `src/lib/store/sources.js`
- `src/lib/store/planning.js`
- `src/lib/store/shared.js`

Feladata:
- Supabase hívások
- domain műveletek
- validáció
- normalizálás
- hiba- és kompatibilitáskezelés

Elv:
- minden domain külön modulban éljen
- a `store.js` csak aggregáló belépési pont maradjon

### 2.6 Infrastruktúra és környezet

Fő fájlok:
- `src/lib/supabase.js`
- `public/env.js`
- `.env.local`

Feladata:
- Supabase kapcsolat inicializálása
- runtime és build-time környezeti változók kezelése

## 3. Fő domainek

### 3.1 Rutinok és tervezés

Érintett modulok:
- `planning.js`
- `DetailsView.jsx`
- `TodayView.jsx`

Felelősség:
- heti terv
- napi blokkok
- forrás-hozzárendelés
- rutinindítás és lezárás

### 3.2 Feladatok

Érintett modulok:
- `tasks.js`
- `PlanningView.jsx`

Felelősség:
- napi feladatlista
- prioritáskezelés
- lezárás
- törlés
- lezárt feladatok listázása

### 3.3 Gondolatok

Érintett modulok:
- `thoughts.js`
- `PlanningView.jsx`
- `TodayView.jsx`

Felelősség:
- gyors napi gondolat rögzítés
- archív lista
- törlés

### 3.4 Szokások

Érintett modulok:
- `habits.js`
- `TodayView.jsx`

Felelősség:
- szokások létrehozása
- napi teljesítés rögzítése
- szerkesztés
- törlés
- rövid history megjelenítés

### 3.5 Forrástár és opciók

Érintett modulok:
- `sources.js`
- `DetailsView.jsx`

Felelősség:
- források kezelése
- szolgáltató és kategória opciók
- aktív állapotok

## 4. Adatfolyam

Általános működés:
1. Az alkalmazás betölti az állapotot a store rétegen keresztül.
2. A nyers adat bekerül a központi `data` állapotba.
3. A selectorok és view modellek előkészítik a nézetekhez szükséges adatot.
4. A nézetek és hookok műveleteket indítanak.
5. A store frissíti a Supabase adatokat.
6. A rendszer újratölti az állapotot, és friss nézetet rajzol.

## 5. UI szervezés

Jelenlegi állapot:
- a stílusok nagy része a `src/index.css` fájlban van

Elvárt irány:
- később nézetenként vagy funkcióként bontott CSS
- a globális fájl csak tokeneket és alap layout szabályokat tartson

## 6. Tesztelési stratégia

Jelenlegi rétegek:
- E2E tesztek: `tests/e2e/`
- vizuális regresszió: `tests/visual/`
- mockolt backend: `tests/e2e/helpers/supabaseMock.js`

Elv:
- a kritikus napi útvonalak legyenek E2E teszttel fedve
- a fontosabb UI szerkezetekhez legyen legalább célzott regressziós teszt

## 7. Jelenlegi erősségek

- egyszerű stack
- jól elkülöníthető fő domainek
- van domain alapú store bontás
- van mockolt tesztkörnyezet
- a fő nézetek külön kezelhetők

## 8. Jelenlegi gyenge pontok

- az `App.jsx` még mindig központi szereplő
- a CSS túl centralizált
- több helyen még erős a prop-alapú összekötés
- a runtime típusosság gyenge

## 9. Ajánlott fejlődési irány

Rövid távon:
- további view-level bontás
- CSS szétválasztás
- további célzott regressziós tesztek

Középtávon:
- szigorúbb adatvalidáció
- dokumentáció pontosítása
- konzisztens komponens- és stílusrendszer

Hosszú távon:
- erősebb típusosság
- stabilabb domainhatárok
- kevesebb központi állapotfüggés
