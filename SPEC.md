# SPEC

Projekt: LépésHang
Állapot: alap projekt-specifikáció
Dátum: 2026-04-04

## Kapcsolódó dokumentumok

- [README.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/README.md): indítás, futtatás, alap környezet
- [ARCHITECTURE.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/ARCHITECTURE.md): jelenlegi technikai szerkezet
- [ROADMAP.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/ROADMAP.md): fejlesztési irányok és prioritások
- [CONTRIBUTING.md](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/CONTRIBUTING.md): fejlesztési és hozzájárulási szabályok

## 1. Cél

A LépésHang egy mobil-első rutin- és tanulásmenedzsment alkalmazás.

Az elsődleges cél:
- csökkenteni a napi döntési terhelést
- előre strukturálni a reggeli és esti rutinokat
- egy helyen kezelni a napi feladatokat, gondolatokat és szokásokat
- támogatni a fókuszált tanulási és önfejlesztési folyamatot

## 2. Probléma

A felhasználó napi szinten több apró döntést hoz:
- mit csináljon reggel
- mit csináljon este
- mivel haladjon ma
- mit rögzítsen későbbre
- hogyan kövesse a szokásait

Ez mentális terhelést okoz, és széttördeli a fókuszt.

A rendszer célja, hogy a napi működésből kivegye a felesleges újradöntéseket.

## 3. Célfelhasználó

Az alkalmazás azoknak készül, akik:
- napi rutinokban gondolkodnak
- tanulási vagy önfejlesztési blokkokat követnek
- egyszerű, gyorsan áttekinthető mobil felületet akarnak
- nem komplex projektmenedzsment rendszert keresnek

## 4. Termékpozíció

A termék nem általános todo-app.

Fő karaktere:
- napi működésre optimalizált
- kevés döntés, kevés zaj
- rutinblokk-központú
- gyors rögzítésre és áttekinthetőségre épít

## 5. Fő nézetek

### 5.1 Mai nap

Cél:
- a napi rutinblokkok és a napi működés gyors áttekintése

Tartalom:
- reggeli és esti blokk
- napi blokk indítása és lezárása
- napi gondolat rögzítése
- szokáskövető

### 5.2 Gondolatok + tervezés

Cél:
- a napi feladatok és a gondolatnapló kezelése

Tartalom:
- prioritásos feladatlista
- aktív és lezárt feladatok
- gondolatnapló archívum

### 5.3 Kiegészítők

Cél:
- háttérkarbantartás és részletesebb szerkesztés

Tartalom:
- heti tervező
- forrástár
- opciókezelés
- heti és napi ajánlási tartalmak

## 6. Funkcionális követelmények

### 6.1 Rutinblokkok

A rendszer tudja:
- megjeleníteni a napi rutinblokkokat
- blokkhoz forrást rendelni
- blokkot elindítani
- blokkot lezárni
- naplózni az eredményt, értékelést és megjegyzést

### 6.2 Feladatkezelés

A rendszer tudja:
- napi feladatot rögzíteni prioritással
- feladatot szerkeszteni
- feladatot lezárni
- feladatot törölni
- a lezárt feladatokat listázni
- a napi lezárt feladatokat is megjeleníteni az előzmények között

### 6.3 Gondolatnapló

A rendszer tudja:
- napi gondolatot gyorsan rögzíteni
- a korábbi gondolatokat listázni
- a gondolatokat törölni
- lapozni az archív bejegyzések között

### 6.4 Szokáskövetés

A rendszer tudja:
- szokást létrehozni
- napi célt és mértékegységet kezelni
- napi teljesítést rögzíteni
- a teljesítést léptetéssel és kézi bevitellel menteni
- megjeleníteni rövid előzményt az elmúlt napokról
- szokást szerkeszteni és törölni

### 6.5 Forrástár

A rendszer tudja:
- forrásokat rögzíteni
- kategóriához és szolgáltatóhoz kötni
- aktív/inaktív állapotot kezelni
- a heti tervezéshez felhasználható forráslistát biztosítani

### 6.6 Heti tervezés

A rendszer tudja:
- heti nézetben megmutatni a napokat
- rutinblokkokhoz forrást rendelni
- a heti tervet szerkeszthető formában kezelni

## 7. Nem célok

Jelenleg nem cél:
- többfelhasználós együttműködés
- csapatmunka
- komplex projektmenedzsment
- részletes statisztikai dashboard
- gamification
- offline-first működés

## 8. UI/UX elvek

Az alkalmazás felülete legyen:
- mobil-első
- gyorsan szkennelhető
- kevés döntést igénylő
- tömör, de nem zsúfolt
- konzisztens a fő nézetek között

Kiemelt elvek:
- a napi használat gyakori műveletei legyenek elöl
- a ritkább szerkesztések legyenek másodlagosak vagy lenyithatók
- a lapozás és vezérlők legyenek kompaktak mobilon is
- desktopon a layout használja ki a plusz szélességet

## 9. Technikai környezet

Jelenlegi stack:
- React 18
- Vite
- Supabase
- Playwright
- globális CSS alapú UI réteg

Adattárolás:
- Supabase táblák
- induló séma a `supabase/schema.sql` fájlban

## 10. Minőségi követelmények

### 10.1 Stabilitás

Új funkció vagy UI változtatás után ellenőrizni kell:
- `npm run build`
- releváns Playwright tesztek

### 10.2 Karbantarthatóság

Elvárás:
- domain logika különüljön el
- a nézetlogika legyen nézetenként kezelhető
- a store műveletek maradjanak jól szétválasztva

### 10.3 Tesztelhetőség

Elvárás:
- a kritikus napi útvonalak legyenek E2E teszttel fedve
- UI regresszióra legyen vizuális ellenőrzés

## 11. Jelenlegi ismert prioritások

Magas prioritás:
- az `App.jsx` további tehermentesítése
- a CSS további bontása
- az architektúra tisztítása nézet- és domainhatárok mentén

Közepes prioritás:
- dokumentáció és futási modell pontosítása
- adatkonzisztencia javítása
- további mobil finomhangolások

## 12. Elfogadási feltételek az MVP-hez

Az MVP akkor tekinthető stabil alapnak, ha:
- a napi rutinblokkok kezelhetők
- a napi feladatok kezelhetők
- a gondolatok rögzíthetők és visszanézhetők
- a szokások napi szinten kényelmesen követhetők
- a heti terv és a forrástár alapműködése kész
- a fő útvonalak builddel és teszttel ellenőrizhetők

## 13. Nyitott kérdések

Tisztázandó később:
- mennyire legyen kötelező a Supabase a teljes futáshoz
- kell-e külön desktop-specifikus optimalizálás
- szükséges-e erősebb típusosság vagy runtime validáció
- kell-e mobil vizuális regressziós teszt a jelenlegi desktop mellé
