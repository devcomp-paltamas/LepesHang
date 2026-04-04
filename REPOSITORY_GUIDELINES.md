# REPOSITORY GUIDELINES

Projekt: LépésHang
Állapot: alap repository irányelvek
Dátum: 2026-04-04

## 1. Cél

Ez a fájl azt rögzíti, hogyan érdemes a repositoryt szervezni és karbantartani úgy, hogy a projekt átlátható, bővíthető és biztonságosan módosítható maradjon.

Ez nem a részletes fejlesztési szabályok helye.

Arra ezek a fájlok valók:
- [SPEC.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/SPEC.md): mit épít a projekt
- [ARCHITECTURE.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/ARCHITECTURE.md): hogyan van felépítve
- [ROADMAP.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/ROADMAP.md): merre fejlődik tovább
- [CONTRIBUTING.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/CONTRIBUTING.md): hogyan érdemes benne dolgozni

## 2. Alapelv

A repository legyen:
- könnyen bejárható
- kevés rejtett szabállyal működő
- mobil-első termékhez illeszkedő
- dokumentáció és kód szempontból is következetes

Elsődleges elv:
- ami a projektről szól, az a projekt gyökerében vagy a rendes forrásstruktúrában legyen
- ami munkanapló, prompt, vagy agent-specifikus segédanyag, az a `codex/` mappába kerüljön

## 3. Dokumentumstruktúra

### 3.1 A projekt gyökerében maradjon

Ide valók a hosszabb életű, projekt-szintű dokumentumok:
- [README.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/README.md)
- [SPEC.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/SPEC.md)
- [ARCHITECTURE.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/ARCHITECTURE.md)
- [ROADMAP.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/ROADMAP.md)
- [CONTRIBUTING.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/CONTRIBUTING.md)
- [REPOSITORY_GUIDELINES.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/REPOSITORY_GUIDELINES.md)

### 3.2 A `codex/` mappába kerüljön

Ide valók a rövidebb életű vagy eszközspecifikus anyagok:
- promptnaplók
- beszélgetés-mentések
- pillanatképek
- agent workflow jegyzetek
- ideiglenes kutatási fájlok

Jelenlegi példa:
- [2026-04-04-beszelgetes-naplo.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/codex/prompts/2026-04-04-beszelgetes-naplo.md)

## 4. Forráskód-struktúra

A forráskód szervezése maradjon domain- és felelősségalapú.

Főbb elvek:
- a view fájlok a megjelenítésért feleljenek
- a hookok a nézeti állapotot és interakciókat fogják össze
- a store modulok kezeljék a perzisztenciát és a domain műveleteket
- a derived state lehetőleg selector vagy segéd rétegbe kerüljön

Kerülendő:
- üzleti logika szétszórása több view komponensben
- ugyanazon szabály több helyen történő újraírása
- központi, túlterhelt komponensek további hizlalása

## 5. Módosítási szabályok

Egy változtatásnál az legyen a cél, hogy:
- egyértelmű legyen, mi változott
- kiszámítható legyen a hatása
- a mobil használhatóság ne romoljon
- a dokumentáció kövesse a működést, ha a viselkedés vagy a szerkezet is változik

Ajánlott:
- egy feladat, egy jól körülhatárolt változtatás
- UI módosításnál reszponzív ellenőrzés
- adatmodell-változásnál séma és mock környezet frissítése is

## 6. Minőségi kapu

Legalább ez maradjon meg minden érdemi módosítás után:
- a projekt buildeljen
- a releváns fő felhasználói útvonal legyen ellenőrizve

Minimum ellenőrzés:
- `npm run build`

Ha szükséges:
- releváns `tests/e2e/*.spec.js`
- vizuális vagy célzott regressziós ellenőrzés

## 7. Dokumentációfrissítés

Frissíteni kell a dokumentációt, ha változik:
- a termék célja vagy scope-ja
- a nézetek szerepe
- az architektúra
- a repository szerkezete
- a fejlesztési szabályrendszer

Irányelv:
- termékjellegű változás: `SPEC.md`
- technikai szerkezeti változás: `ARCHITECTURE.md`
- jövőbeli irány vagy prioritás: `ROADMAP.md`
- fejlesztési munkamód: `CONTRIBUTING.md`
- repository-szintű rend és elhelyezési szabály: `REPOSITORY_GUIDELINES.md`

## 8. Mi számít jó repository állapotnak

Egy jó állapotú repository:
- gyorsan átlátható új belépőnek is
- nem keveri a projekt-dokumentációt az ideiglenes munkafájlokkal
- nem támaszkodik hallgatólagos szabályokra
- kevés helyen tárolja az alapigazságokat
- támogatja a fokozatos refaktort, nem akadályozza
