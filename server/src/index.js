// server/src/index.js
import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { z } from "zod";

import { normalizePlate } from "./utils/plate.js";
import { normalizeVehicle } from "./utils/normalize.js";

// data.gov services
import {
  fetchVehicleByPlate,
  fetchModelSpecs, // may return null if not configured / no match
} from "./services/dataGov.js";

// history services
import {
  fetchHistory1,
  fetchHistory2Ownership,
  summarizeHistory1,
  buildOwnershipRows,
} from "./services/history.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");
// Allow assets to load from a different port during dev
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Plate validator: keep only digits, require 7–8
const PlateSchema = z
  .string()
  .transform(normalizePlate)
  .refine((p) => /^[0-9]{7,8}$/.test(p), "מספר רכב חייב להיות 7–8 ספרות");

// Root
app.get("/", (_req, res) => {
  res.json({ ok: true, name: "plate-lookup-server", version: "1.0.0" });
});

// Shared handler for vehicle lookup (used by two routes)
async function handleVehicleLookup(plateRaw, res) {
  const plate = PlateSchema.parse(plateRaw || "");

  // 1) fetch main record by plate
  const { record, raw } = await fetchVehicleByPlate(plate);
  if (!record) {
    return res.status(404).json({ error: "לא נמצא רכב עם המספר הזה", plate });
  }

  // 2) normalize base record
  const normalized = normalizeVehicle(record);

  // 3) enrichment: model specs (engine_cc / horsepower) from configured resource (e.g., WLTP)
  let specsDebug = null;
  try {
    const specRes = await fetchModelSpecs(record); // service decides how to search (may be null)
    specsDebug = specRes || null;

    if (specRes?.extract) {
      if (!normalized.engine_cc && specRes.extract.engine_cc != null) {
        normalized.engine_cc = specRes.extract.engine_cc;
      }
      if (!normalized.horsepower && specRes.extract.horsepower != null) {
        normalized.horsepower = specRes.extract.horsepower;
      }
    }
  } catch (e) {
    specsDebug = { error: String(e?.message || e) };
  }

  // 4) response
  return res.json({
    plate,
    normalized,
    raw: {
      ...(raw || {}),
      records: raw?.records ?? (record ? [record] : []),
      specs_debug: specsDebug,
    },
    disclaimer: 'הנתונים מוצגים כפי שסופקו ע"י data.gov.il. שדות עשויים להשתנות.',
  });
}

// GET /api/vehicle/:plate
app.get("/api/vehicle/:plate", async (req, res) => {
  try {
    await handleVehicleLookup(req.params.plate, res);
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: err.issues?.[0]?.message || "קלט לא תקין" });
    }
    console.error(err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// GET /api/vehicle?plate=1234567
app.get("/api/vehicle", async (req, res) => {
  try {
    const p = req.query.plate;
    if (!p) return res.status(400).json({ error: "חסר פרמטר plate" });
    await handleVehicleLookup(p, res);
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: err.issues?.[0]?.message || "קלט לא תקין" });
    }
    console.error(err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// History endpoint used by the web
app.get("/api/history/:plate", async (req, res) => {
  try {
    const plate = PlateSchema.parse(req.params.plate || "");
    const [h1, h2] = await Promise.all([
      fetchHistory1(plate),
      fetchHistory2Ownership(plate),
    ]);

    const mileage = summarizeHistory1(h1.records || []);
    const ownership_rows = buildOwnershipRows(h2.records || []);

    res.json({
      plate,
      history1: h1,  // raw changes/tests
      ownership: h2, // raw ownerships
      summary: {
        last_km: mileage.last_km,
        last_km_date: mileage.last_km_date,
        max_km: mileage.max_km,
        max_km_date: mileage.max_km_date,
        ownership_count: ownership_rows.length,
        ownership_rows,
      },
      disclaimer: "עיבוד נתונים בוצע בצד השרת; נתוני המקור מצורפים כ-raw.",
    });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: err.issues?.[0]?.message || "קלט לא תקין" });
    }
    console.error(err);
    res.status(500).json({ error: "שגיאת שרת" });
  }
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`plate-lookup-server listening on http://localhost:${PORT}`);
});
