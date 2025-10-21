// web/src/components/KeyValueTable.jsx

// תוויות בעברית
const LABELS = {
  plate: "מספר רכב",
  make: "יצרן",
  model: "דגם",
  year: "שנה",
  trim: "רמת גימור",

  engine_cc: "נפח מנוע (סמ״ק)",
  horsepower: "כוח סוס (כ״ס)",
  gearbox: "תיבת הילוכים",
  fuel: "סוג מנוע/דלק",
  color: "צבע",
  ownership: "סוג בעלות",

  first_registration: "רישום ראשון",
  last_test_date: "מבחן רישוי אחרון",
  next_test_date: "מבחן רישוי הבא",

  model_code: "קוד דגם",
  manufacturer_code: "קוד יצרן",
  chassis: "מספר שלדה",

  door_count: "מס׳ דלתות",
  seating: "מס׳ מושבים",
  weight_kerb: "משקל כולל (ק״ג)",
  remarks: "הערות",

  tire_front: "מידת צמיג קדמי",
  tire_rear: "מידת צמיג אחורי",
  country: "מדינת ייצור",
  drive: "הנעה",
  license_fee: "אגרת רישוי (≈)",
};

// סדר תצוגה (מה שלא כאן יוצג בסוף)
const ORDER = [
  "plate", "year", "make", "model", "trim",
  "fuel", "engine_cc", "horsepower", "drive", "color",
  "tire_front", "tire_rear",
  "first_registration", "last_test_date", "next_test_date",
  "chassis",
  "door_count", "seating", "weight_kerb",
  "country", "ownership", "license_fee", "remarks",
];

// שדות להסתיר
const HIDE_KEYS = new Set(["gearbox", "model_code", "manufacturer_code"]);

// שדות שתמיד יוצגו גם אם אין ערך (יודפס "—")
const ALWAYS_SHOW = new Set(["engine_cc", "horsepower"]);

// ---------- helpers ----------
const nf  = new Intl.NumberFormat("he-IL");
const nfc = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });

function pad2(n){ return String(n).padStart(2,"0"); }

function looksLikeDateKey(key){
  return /(date|dt|registration|test|mivhan|מבחן|רישוי|רישום|מסירה|first|next|last)/i.test(key || "");
}

// תאריכים → DD/MM/YYYY או MM/YYYY
function formatSlashDate(v){
  if (v == null || v === "") return null;
  const s = String(v).trim();

  // YYYY-MM-DD / YYYY/M/D / YYYY.MM.DD
  let m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (m){ const [,y,mo,d] = m; return `${pad2(d)}/${pad2(mo)}/${y}`; }

  // DD.MM.YYYY / DD/MM/YYYY
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m){ const [,d,mo,y] = m; return `${pad2(d)}/${pad2(mo)}/${y}`; }

  // YYYY-MM (או YYYY.M / YYYY/M)
  m = s.match(/^(\d{4})[./-](\d{1,2})$/);
  if (m){ const [,y,mo] = m; return `${pad2(mo)}/${y}`; }

  // חותמות זמן מספריות
  if (/^\d+$/.test(s)){
    const n = Number(s);
    let d = null;
    if (n > 1e12) d = new Date(n);                  // ms
    else if (n > 1e9 && n < 1e10) d = new Date(n*1000); // sec
    if (d && !isNaN(d)) return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
  }

  return null; // לא זוהה — נשאיר כמו שהוא
}

function prettyFuel(v){
  if (!v) return v;
  const s = String(v).toLowerCase();
  if (/electric|חשמל/.test(s)) return "חשמלי";
  if (/hybrid|היבר/.test(s))   return "היברידי";
  if (/diesel|דיזל/.test(s))   return "דיזל";
  if (/gas|בנזין|petrol|benzin/.test(s)) return "בנזין";
  return v;
}

function formatValue(key, value){
  if (value == null || value === "") return "—";

  if (looksLikeDateKey(key)){
    const f = formatSlashDate(value);
    if (f) return f;
  }

  if (key === "engine_cc"){
    const n = Number(value);
    return Number.isFinite(n) ? `${nf.format(n)} סמ״ק` : String(value);
  }
  if (key === "horsepower"){
    const n = Number(value);
    return Number.isFinite(n) ? `${nf.format(n)} כ״ס` : String(value);
  }
  if (key === "weight_kerb"){
    const n = Number(value);
    return Number.isFinite(n) ? `${nf.format(n)} ק״ג` : String(value);
  }
  if (key === "license_fee"){
    const n = Number(value);
    return Number.isFinite(n) ? nfc.format(n) : String(value);
  }

  if (key === "fuel") return prettyFuel(value);

  return String(value);
}

export default function KeyValueTable({ obj }) {
  if (!obj) return null;

  // מציגים אם: לא שדה מוסתר, וגם (יש ערך || מוגדר ALWAYS_SHOW)
  const entries = Object.entries(obj)
    .filter(([k, v]) => !HIDE_KEYS.has(k) && (v != null && v !== "" || ALWAYS_SHOW.has(k)));

  if (!entries.length) return <div className="text-gray-500">אין נתונים להצגה.</div>;

  const orderIndex = (k) => {
    const i = ORDER.indexOf(k);
    return i === -1 ? 999 + (k?.charCodeAt?.(0) ?? 0) : i;
  };

  const sorted = [...entries].sort((a,b) => orderIndex(a[0]) - orderIndex(b[0]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {sorted.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          <div className="text-gray-500 min-w-28">{LABELS[k] || k}</div>
          <div className="font-medium text-gray-900 break-words">{formatValue(k, v)}</div>
        </div>
      ))}
    </div>
  );
}
