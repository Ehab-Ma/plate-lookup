// web/src/components/ShareButton.jsx
import { useState } from "react";

function buildUrlWithPlate(plate) {
  try {
    const u = new URL(window.location.href);
    if (plate) u.searchParams.set("plate", String(plate));
    return u.toString();
  } catch {
    return window.location.href;
  }
}

function formatPlate(p) {
  if (!p) return "";
  const s = String(p);
  if (s.length === 7) return `${s.slice(0,2)}-${s.slice(2,5)}-${s.slice(5)}`;
  if (s.length === 8) return `${s.slice(0,3)}-${s.slice(3,5)}-${s.slice(5)}`;
  return s;
}

export default function ShareButton({ plate, vehicle }) {
  const [copied, setCopied] = useState(false);
  const url = buildUrlWithPlate(plate);

  const title = [
    vehicle?.make,
    vehicle?.model,
    vehicle?.year,
  ].filter(Boolean).join(" ") || "בדיקת רכב";

  const text =
    `בדיקת רכב לפי מספר רישוי ${formatPlate(plate)} ` +
    [vehicle?.fuel && `· דלק: ${vehicle.fuel}`,
     vehicle?.engine_cc && `· נפח: ${vehicle.engine_cc} סמ״ק`,
     vehicle?.horsepower && `· כ״ס: ${vehicle.horsepower}`]
      .filter(Boolean).join(" ");

  async function onShare() {
    // Web Share API (mobile & modern browsers)
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); }
      catch { /* user canceled */ }
      return;
    }
    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      window.prompt("העתק את הקישור:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm"
      title="שיתוף / העתקת קישור"
    >
      {/* simple link icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M10 14l4-4m-8 7a4 4 0 010-6l3-3a4 4 0 016 6l-1 1"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {copied ? "הקישור הועתק" : "שתף"}
    </button>
  );
}
