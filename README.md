
# Plate Lookup Israel — Full Stack (Node + React, RTL)

A clean, legal, and ready-to-run web app that takes an Israeli license plate (**מספר רכב**) and shows official vehicle data pulled live from **data.gov.il**.

- **Backend:** Node.js (Express) — proxies the CKAN API
- **Frontend:** React + Vite + Tailwind (RTL Hebrew UI)
- **Legal:** Uses open government data only. No scraping. Includes source credit in the footer.

> NOTE: This MVP queries the primary dataset **"מספרי רישוי של כלי רכב פרטיים ומסחריים"** via CKAN (`resource_id=053cea08-09bc-40ec-8f7a-156f0677aff3`).  
> It returns the raw government fields alongside a **normalized** subset (make/model/year/fuel/color/etc.).
> If a field is missing/renamed in the dataset, the app still shows all **raw** fields so nothing is silently lost.

## Prerequisites
- Node.js 18+ and npm
- Windows + VS Code are perfect (works on macOS/Linux too)

## Quick Start
1. **Backend** (port 4000):
   ```bash
   cd server
   npm i
   npm run dev
   ```

2. **Frontend** (port 5173):
   ```bash
   cd web
   npm i
   npm run dev
   ```

Open http://localhost:5173 and search a plate (7–8 digits, numbers only).

> Tip: enable CORS/open ports if you run both locally. The backend is already configured for CORS from any origin in dev.

## Project Structure
```
plate-lookup-israel/
  README.md
  server/
    package.json
    .env.example
    src/
      index.js
      services/dataGov.js
      utils/normalize.js
      utils/plate.js
  web/
    index.html
    package.json
    vite.config.js
    postcss.config.js
    tailwind.config.js
    src/
      main.jsx
      App.jsx
      api.js
      components/
        PlateForm.jsx
        VehicleCard.jsx
        KeyValueTable.jsx
        Badge.jsx
      styles.css
```

## Environment Variables (optional)
Create `server/.env` if you want to override defaults:
```
PORT=4000
DATA_GOV_BASE=https://data.gov.il/api/3/action/datastore_search
DATA_GOV_RESOURCE_ID=053cea08-09bc-40ec-8f7a-156f0677aff3
```

## Legal / Credit
- Vehicle data courtesy of **data.gov.il** (מאגרים ממשלתיים פתוחים).  
- You are responsible for complying with their usage terms and rate limits.  
- Do **not** present any internal estimates as an official "Levi Itzhak" price without a license.

## Production Notes
- Consider adding Redis caching and rate limiting.
- Add logging (the server includes morgan) and health checks.
- If you want additional history (נסועה/שינויים), add more datasets in `services/dataGov.js`.
```



## History Datasets Added
- History (1): resource_id `56063a99-8a3e-4ff4-912e-5966c0279bad` – mileage at last test + indicators (LPG/color/tyre).
- History (2): resource_id `bb2355dc-9ec7-4f06-9c3f-3344672171da` – ownership dates and ownership type.

New endpoint: `GET /api/history/:plate`.
