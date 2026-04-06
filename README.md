# LépésHang

Mobil-első MVP a rutin- és tanulásmenedzsment rendszerhez.

## Indítás

```bash
npm install
npm run dev
```

## UI tesztek

Playwright alapú felületi tesztek futtatása:

```bash
npx playwright install chromium
npm run test:e2e
```

## Képernyőkép regressziós workflow

Automatikus képernyőkép készítés és összehasonlítás Playwright snapshot teszttel:

```bash
# első futás / baseline frissítés
npm run test:visual:update

# összehasonlító ellenőrzés
npm run test:visual
```

Megjegyzés:
- A baseline képek a `tests/visual/*.spec.js-snapshots/` mappába kerülnek.
- A `test:visual` parancs hibával leáll, ha vizuális eltérés van.

## Opcionális Supabase kapcsolat

Hozz létre egy `.env.local` fájlt ezekkel az értékekkel:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_CLARITY_PROJECT_ID=...
```

Ha a deploy környezet nem tud build-time env változókat adni, használhatsz runtime konfigurációt is a [env.js](/Users/paltamasdevcomp/Downloads/Munka/LepesHang/public/env.js) fájlon keresztül:

```js
window.__LEPESHANG_ENV__ = {
  VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'your-public-anon-key',
  VITE_CLARITY_PROJECT_ID: 'your-clarity-project-id',
}
```

Az alkalmazás először a Vite env változókat nézi, és csak utána esik vissza a `public/env.js` runtime konfigurációra.

## Microsoft Clarity

Az alkalmazás fel van készítve az `@microsoft/clarity` használatára.

Bekapcsolás:
- adj meg egy `VITE_CLARITY_PROJECT_ID` értéket `.env.local` fájlban vagy a `public/env.js` runtime konfigurációban
- az alkalmazás alapból jóváhagyást kér
- a Clarity csak akkor töltődik be, ha a felhasználó engedélyezi az analitikát

Ellenőrzés böngészőben:
- nyisd meg az oldalt
- az első betöltésnél megjelenik az analitika jóváhagyó sáv
- engedélyezés után DevTools konzolban nézd meg: `window.__LEPESHANG_CLARITY__`
- sikeres bekötésnél `enabled: true`, `status: 'consent-granted'` és a `#clarity-script` script elem is megjelenik a DOM-ban

## Tartalom

- `src/`: React felület Supabase-kompatibilis store-ral
- `supabase/schema.sql`: induló adatmodell
- `supabase/seed.sql`: kezdeti mintaadatok

## MVP fókusz

- reggeli és esti rutinblokkok
- quick-play napi terv
- heti tervező nézet
- rutinindítás és teljesítési naplózás
- AI-ajánlás helye
- forrástár és heti státuszáttekintés
