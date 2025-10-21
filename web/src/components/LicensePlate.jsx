// web/src/components/LicensePlate.jsx
import React from "react";

/** מקבל מספר רכב גולמי ומחזיר קבוצות להצגה בלוחית (2-3-2 או 3-2-3 וכו') */
function splitIL(plate) {
  const p = String(plate || "").replace(/\D/g, "");
  if (!p) return [];
  if (p.length === 7) return [p.slice(0, 2), p.slice(2, 5), p.slice(5)];
  if (p.length === 8) return [p.slice(0, 3), p.slice(3, 5), p.slice(5)];
  if (p.length === 6) return [p.slice(0, 2), p.slice(2, 4), p.slice(4)];
  return [p]; // fallback
}

/** לוחית רישוי בסגנון ישראלי */
export default function LicensePlate({ value, size = "md", className = "" }) {
  const groups = splitIL(value);

  const sizeCls = {
    sm: "text-xl h-12",
    md: "text-3xl h-16",
    lg: "text-4xl md:text-5xl h-20",
  }[size];

  return (
    <div
      dir="ltr"
      className={`inline-flex overflow-hidden rounded-md ring-1 ring-slate-900/15 shadow-md ${sizeCls} ${className}`}
      aria-label={`לוחית רישוי ${value || ""}`}
    >
      {/* הפס הכחול השמאלי */}
      <div className="flex flex-col items-center justify-center bg-[#1F3AAE] text-white px-2 w-12">
        <div className="text-xs font-bold leading-none">IL</div>
        <div className="text-[10px] leading-none mt-0.5">ישראל</div>
      </div>

      {/* הרקע הצהוב והספרות */}
      <div className="flex-1 bg-[#FFE166] flex items-center justify-center px-4 font-extrabold tracking-[0.08em] text-slate-900 select-text">
        {groups.length ? (
          groups.map((g, i) => (
            <React.Fragment key={i}>
              <span className="plate-num">{g}</span>
              {i < groups.length - 1 && (
                <span className="mx-2 text-slate-900">·</span>
              )}
            </React.Fragment>
          ))
        ) : (
          <span className="opacity-50">—</span>
        )}
      </div>
    </div>
  );
}
