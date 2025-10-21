// server/src/services/dataGov.js
import dotenv from "dotenv";
dotenv.config();

const BASE = process.env.DATA_GOV_BASE || "https://data.gov.il/api/3/action/datastore_search";
const VEHICLES_RESOURCE = process.env.DATA_GOV_RESOURCE_ID || "053cea08-09bc-40ec-8f7a-156f0677aff3";
const MODEL_SPECS_RESOURCE = process.env.MODEL_SPECS_RESOURCE_ID || "142afde2-6228-49f9-8a29-9b6c3a0cbe40";

// ---------- helpers ----------
function buildFilters(obj = {}) {
  const clean = Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
  );
  return Object.keys(clean).length ? `&filters=${encodeURIComponent(JSON.stringify(clean))}` : "";
}

async function ckanSearch({ resource_id, filters = {}, limit = 100, q = "" }) {
  const url =
    `${BASE}?resource_id=${encodeURIComponent(resource_id)}&limit=${limit}` +
    buildFilters(filters) +
    (q ? `&q=${encodeURIComponent(q)}` : "");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`CKAN request failed: ${r.status} ${r.statusText}`);
  const j = await r.json();
  return j?.result || { records: [] };
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// נסה להוציא CC/HP מרשומה אחת עם שמות שדה מגוונים
function extractFromRow(row = {}) {
  const keys = Object.keys(row);

  const pick = (re) => {
    const k = keys.find((kk) => re.test(kk));
    if (!k) return null;
    const v = row[k];
    return v == null || v === "" ? null : String(v);
  };

  // נפח מנוע (סמ״ק) — שם השדה משתנה בין מקורות
  const engine_cc =
    toNum(
      pick(/(נפח|סמ.?ק|סמק|nef(ah|ach).*m(anoa|noa)|nefach_manoa|engine.*(cc|size|volume)|^cc$|motor.*cc)/i)
    ) ?? null;

  // כוח סוס — ישירות (HP) או המרה מ־kW
  const hpDirect = toNum(pick(/(כ.?ח.?ס|ko(ah|ach).*sus|horse.*power|^hp$)/i));
  let horsepower = hpDirect;
  if (horsepower == null) {
    const kw = toNum(pick(/(^|_)(kw|kilowatt|kilo.?watt|קילו.?ואט)(_|$)|הספק.*ק.?ו/i));
    if (kw != null) horsepower = Math.round(kw * 1.341);
  }

  return { engine_cc, horsepower };
}

// חפש את הרשומה הראשונה באמת עם אחד הערכים (CC/HP)
function firstWithSpecs(records = []) {
  for (const r of records) {
    const ex = extractFromRow(r);
    if (ex.engine_cc != null || ex.horsepower != null) {
      return { record: r, extract: ex };
    }
  }
  return { record: null, extract: null };
}

// ---------- APIs ----------
export async function fetchVehicleByPlate(plate) {
  const result = await ckanSearch({
    resource_id: VEHICLES_RESOURCE,
    limit: 1,
    filters: { mispar_rechev: plate },
  });
  const record = result.records?.[0] || null;
  return { record, raw: result };
}

// שליפת מפרטי דגם (WLTP) לפי קודים/שמות/שנה — כמה ניסיונות הולכים ונרפים
export async function fetchModelSpecs(rec = {}) {
  const makeCode  = rec.tozeret_cd ?? rec["tozeret_cd"];
  const modelCode = rec.degem_cd   ?? rec["degem_cd"];
  const modelName = rec.kinuy_mishari ?? rec["kinuy_mishari"] ?? rec.degem_nm ?? rec["degem_nm"];
  const year      = rec.shnat_yitzur ?? rec["shnat_yitzur"];

  const attempts = [];

  // 1) קודים + שנה
  attempts.push(await ckanSearch({
    resource_id: MODEL_SPECS_RESOURCE, limit: 100,
    filters: { tozeret_cd: makeCode, degem_cd: modelCode, shnat_yitzur: year }
  }));

  // 2) קודים בלבד
  attempts.push(await ckanSearch({
    resource_id: MODEL_SPECS_RESOURCE, limit: 100,
    filters: { tozeret_cd: makeCode, degem_cd: modelCode }
  }));

  // 3) שם דגם + שנה
  if (modelName) attempts.push(await ckanSearch({
    resource_id: MODEL_SPECS_RESOURCE, limit: 100,
    filters: { degem_nm: modelName, shnat_yitzur: year }
  }));

  // 4) שם דגם בלבד
  if (modelName) attempts.push(await ckanSearch({
    resource_id: MODEL_SPECS_RESOURCE, limit: 100,
    filters: { degem_nm: modelName }
  }));

  // 5) חיפוש חופשי (q) בשם הדגם + שנה
  if (modelName) attempts.push(await ckanSearch({
    resource_id: MODEL_SPECS_RESOURCE, limit: 100,
    q: modelName, filters: { shnat_yitzur: year }
  }));

  // 6) חיפוש חופשי בשם הדגם בלבד
  if (modelName) attempts.push(await ckanSearch({
    resource_id: MODEL_SPECS_RESOURCE, limit: 100,
    q: modelName
  }));

  // בחר את הראשונה שבפועל מכילה CC/HP
  for (const res of attempts) {
    const { record, extract } = firstWithSpecs(res.records || []);
    if (record) {
      return { query: { makeCode, modelCode, modelName, year }, count: res?.records?.length || 0, record, extract };
    }
  }

  // לא נמצאה התאמה
  return { query: { makeCode, modelCode, modelName, year }, count: 0, record: null, extract: null };
}

export function extractSpecsFromRecord(res) {
  if (!res?.record) return { engine_cc: null, horsepower: null, record: null };
  return { ...res.extract, record: res.record };
}
