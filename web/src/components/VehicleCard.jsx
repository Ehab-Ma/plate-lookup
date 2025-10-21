// web/src/components/VehicleCard.jsx
import KeyValueTable from "./KeyValueTable.jsx";
import Badge from "./Badge.jsx";
import LicensePlate from "./LicensePlate.jsx";
import ShareButton from "./ShareButton.jsx";
import CopyShareLink from "./CopyShareLink.jsx";


// Toggle raw/debug view via ?debug=1 or localStorage('debug_raw' = '1')
const SHOW_DEBUG =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("debug") === "1" ||
    localStorage.getItem("debug_raw") === "1");

export default function VehicleCard({ data }) {
  const n = data?.normalized || {};
  const raw = data?.raw?.records?.[0] || {};
  const title = [n.make, n.model, n.year].filter(Boolean).join(" ");

  return (
    <>
      <div className="card section mt-4">
        {/* Header cluster */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="section-title">{title || `רכב ${n.plate || ""}`}</h2>

            <div className="flex gap-2 mt-2 flex-wrap">
              {n.fuel && <Badge>מנוע: {n.fuel}</Badge>}
              {isNum(n.engine_cc) && (
                <Badge>נפח: {formatNumber(n.engine_cc)} סמ״ק</Badge>
              )}
              {isNum(n.horsepower) && (
                <Badge>כ״ס: {formatNumber(n.horsepower)}</Badge>
              )}
              {n.color && <Badge>צבע: {n.color}</Badge>}
            </div>
          </div>

          {/* Plate preview */}
          {n.plate && (
            <div className="plate-shadow">
              <LicensePlate value={n.plate} size="md" />
            </div>
          )}
          <div className="flex items-center gap-3">
              <ShareButton plate={n.plate} vehicle={n} />
              <CopyShareLink plate={n.plate} /> 
             {n.plate && (
              <div className="plate-shadow">
                 <LicensePlate value={n.plate} size="md" />
               </div>
             )}
           </div>



        </div>

        {/* Facts grid */}
        <div className="mt-4">
          <KeyValueTable obj={n} />
        </div>
      </div>

      {/* Raw data (hidden by default) */}
      {SHOW_DEBUG && (
        <details className="card section">
          <summary className="cursor-pointer font-semibold">
            הצג נתונים גולמיים (Raw)
          </summary>
          <div className="mt-3">
            <pre className="text-xs overflow-auto bg-slate-50 rounded-lg p-3 border border-slate-200">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </>
  );
}

function isNum(v) {
  const n = Number(v);
  return Number.isFinite(n);
}
function formatNumber(n) {
  try {
    return Number(n).toLocaleString("he-IL");
  } catch {
    return String(n ?? "");
  }
}
