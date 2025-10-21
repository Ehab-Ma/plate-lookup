// web/src/components/HistoryCard.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchHistory } from "../api.js";
import OwnershipTable from "./OwnershipTable.jsx";

/* ---------- debug toggle (hidden by default) ---------- */
const SHOW_DEBUG =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("debug") === "1" ||
    localStorage.getItem("debug_raw") === "1");

/* ===================== helpers ===================== */

// numbers like "143,509" → 143509
function parseNumber(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// many formats → timestamp (ms)
function dateToTs(v) {
  if (v == null || v === "") return null;

  if (typeof v === "number") {
    const n = v;
    if (n > 1e12) return n;                    // ms
    if (n > 1e9 && n < 1e10) return n * 1000;  // sec
    if (n > 20000 && n < 80000) return (n - 25569) * 86400 * 1000; // Excel days
    const s = String(n);
    if (/^\d{6}$/.test(s))  return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-01`).getTime();
    if (/^\d{8}$/.test(s))  return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`).getTime();
    return Number.isFinite(n) ? n : null;
  }

  let s = String(v).trim()
    .replace(/\u200f|\u200e/g, "")
    .replace(/[־–—]/g, "-")
    .replace(/\s+/g, " ");

  // DD/MM/YYYY or DD.MM.YYYY
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yy = parseInt(m[3], 10);
    const gy = yy < 1700 ? (yy + 622 - Math.floor(yy / 33)) : yy; // rough hijri→greg
    return new Date(`${gy}-${mm}-${dd}`).getTime();
  }

  // MM/YYYY
  m = s.match(/^(\d{1,2})[./-](\d{4})$/);
  if (m) return new Date(`${m[2]}-${m[1].padStart(2, "0")}-01`).getTime();

  // YYYY/MM
  m = s.match(/^(\d{4})[./-](\d{1,2})$/);
  if (m) return new Date(`${m[1]}-${m[2].padStart(2, "0")}-01`).getTime();

  // YYYYMM / YYYYMMDD
  if (/^\d{6}$/.test(s))  return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-01`).getTime();
  if (/^\d{8}$/.test(s))  return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`).getTime();

  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();

  // numeric fallback
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n > 1e12) return n;
    if (n > 1e9 && n < 1e10) return n * 1000;
    if (n > 20000 && n < 80000) return (n - 25569) * 86400 * 1000;
    return n;
  }

  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

// validate ts is in a sane year range
function safeTs(v) {
  const t = dateToTs(v);
  if (!t) return null;
  const y = new Date(t).getFullYear();
  return y >= 1990 && y <= 2100 ? t : null;
}

function formatMonthYear(ts, sep = "/") {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : dateToTs(ts));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${sep}${yyyy}`;
}

function formatNumber(n) {
  try { return n?.toLocaleString?.("he-IL") ?? String(n); }
  catch { return String(n ?? ""); }
}

// inclusive month diff
function monthsDiffInclusive(startTs, endTs) {
  try {
    const s = new Date(startTs), e = new Date(endTs);
    let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() >= s.getDate()) m += 1;
    return Math.max(0, m);
  } catch { return null; }
}

function normalizeOwnershipType(v) {
  const s = (v || "").toString().trim();
  if (!s) return "";
  if (/פרטי|בעלים פרטי/i.test(s)) return "פרטי";
  if (/ליסינג|השכרה/i.test(s)) return "ליסינג / השכרה";
  if (/סוחר|סוכנות/i.test(s)) return "סוחר";
  if (/חברה|תאגיד/i.test(s)) return "חברה";
  if (/ממשלתי|ציבורי/i.test(s)) return "ממשלתי";
  return s;
}

/* =============== shaping (series + ownership) =============== */

function buildMileageSeries(history) {
  const out = [];
  if (!history?.records?.length) return out;

  const okYear = (ts) => {
    if (!ts) return false;
    const y = new Date(ts).getFullYear();
    return y >= 1990 && y <= 2100;
  };
  const EXCLUDE = /(first|ראשונ|מסירה|registration|רישו?ם)/i;

  for (const r of history.records) {
    const keys = Object.keys(r);
    let km = null;

    // by key name
    const kmKey = keys.find(k =>
      /(ק.?מ|קמ|נסוע|נסועה|km|kilo(meter|metre)?|odo(meter)?|odometer)/i.test(k)
    );
    if (kmKey != null) km = parseNumber(r[kmKey]);

    // by value text
    if (km == null) {
      for (const k of keys) {
        const v = r[k];
        if (typeof v === "string" && /(ק.?מ)/i.test(v)) {
          const n = parseNumber(v);
          if (n != null) { km = n; break; }
        }
      }
    }
    if (km == null) continue;

    // pick best date
    const pickTs = () => {
      let k = keys.find(k => /(עדכון|update).*(ק.?מ|km|odometer|נסוע|נסועה)/i.test(k) && !EXCLUDE.test(k));
      if (k) { const ts = dateToTs(r[k]); if (okYear(ts)) return ts; }

      k = keys.find(k => /(תאריך|מועד|date|dt).*(מבחן|טסט|בדיק|רישוי|inspection|test|mivhan)/i.test(k) && !EXCLUDE.test(k));
      if (k) { const ts = dateToTs(r[k]); if (okYear(ts)) return ts; }

      k = keys.find(k => /(תאריך|מועד|date|dt)/i.test(k) && !EXCLUDE.test(k));
      if (k) { const ts = dateToTs(r[k]); if (okYear(ts)) return ts; }

      let best = null;
      for (const kk of keys) {
        const v = r[kk];
        const ts = (typeof v === "string" || typeof v === "number") ? dateToTs(v) : null;
        if (okYear(ts) && !EXCLUDE.test(kk) && (!best || ts > best)) best = ts;
      }
      return best;
    };

    const t = pickTs();
    if (t) out.push({ t, km });
  }

  return out.sort((a, b) => a.t - b.t);
}

function extractOwnershipType(rec) {
  if (!rec) return "";
  const keys = Object.keys(rec);

  const prefer = keys.filter(k =>
    /(baalut.*(sug|type)|sug.*baalut|^sug$|^baalut$|owner(ship)?_?type)/i.test(k)
  );
  for (const k of prefer) {
    const v = rec[k];
    if (v == null) continue;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") {
      const map = { 1:"פרטי", 2:"חברה", 3:"ליסינג / השכרה", 4:"מונית", 5:"השכרה", 6:"סוחר", 7:"ממשלתי" };
      if (map[v]) return map[v];
    }
  }

  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && /(פרטי|סוחר|ליסינג|השכרה|חברה|ממשלתי|ציבורי|מונית|יבואן)/i.test(v)) {
      return v.trim();
    }
  }
  return "";
}

function buildOwnershipRows(ownership) {
  const recs = (ownership?.records || [])
    .map((r) => {
      const keys = Object.keys(r);
      const dtKey =
        keys.find((k) => /^baalut[_-]?dt$/i.test(k)) ||
        keys.find((k) => /(תאריך|date|dt)/i.test(k));
      const start = dateToTs(r[dtKey]);
      if (!start) return null;
      const typeRaw = extractOwnershipType(r);
      return { start, typeRaw };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  const rows = [];
  for (let i = 0; i < recs.length; i++) {
    const cur = recs[i];
    const next = recs[i + 1];
    const nextStart = next ? next.start : null;
    let end = nextStart ? new Date(nextStart).getTime() - 24 * 3600 * 1000 : null;

    // guard: if start > end (same month / noisy data) — align start to month start
    let start = cur.start;
    if (end && start > end) {
      const d = new Date(end);
      start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    }

    rows.push({
      typeNorm: normalizeOwnershipType(cur.typeRaw),
      typeRaw: cur.typeRaw,
      start,
      end,
      isCurrent: !next,
      durationMonths: monthsDiffInclusive(start, end ?? Date.now()),
    });
  }

  return rows;
}

/* ===================== sparkline ===================== */
function Sparkline({ data }) {
  const width = 560, height = 120, padding = 24;
  if (!data?.length) return null;
  const xs = data.map(d => d.t), ys = data.map(d => d.km);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const x = v => padding + ((v - minX) / (maxX - minX || 1)) * (width - 2 * padding);
  const y = v => height - padding - ((v - minY) / (maxY - minY || 1)) * (height - 2 * padding);
  const path = data.map((d, i) => `${i ? "L" : "M"} ${x(d.t)} ${y(d.km)}`).join(" ");
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      {data.map((d, i) => (
        <circle key={i} cx={x(d.t)} cy={y(d.km)} r="2.5" />
      ))}
    </svg>
  );
}

/* ===================== main ===================== */
export default function HistoryCard({ plate, lastTestDate, firstReg }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!plate) return;
      setErr(""); setLoading(true); setData(null);
      try {
        const json = await fetchHistory(plate);
        if (!dead) setData(json);
      } catch (e) {
        if (!dead) setErr(e.message || "Failed to load history");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, [plate]);

  const ownershipRows = useMemo(
    () => (data ? buildOwnershipRows(data.ownership) : []),
    [data]
  );

  // series for sparkline (history1 + history2)
  const series = useMemo(() => {
    if (!data) return [];
    return [
      ...buildMileageSeries(data?.history1),
      ...buildMileageSeries(data?.history2),
    ].sort((a, b) => a.t - b.t);
  }, [data]);

  // ---- last KM number + date (robust) ----
  const serverKm = data?.summary?.last_km ?? null;
  const serverKmDate = data?.summary?.last_km_date ?? null;

  const lastKm = useMemo(() => {
    if (serverKm != null) return serverKm;
    if (series.length) return series[series.length - 1].km;
    return null;
  }, [serverKm, series]);

  // Prefer lastTestDate when present/newer or when km date is missing/sketchy
  const displayKmDateTs = useMemo(() => {
    const kmTs =
      safeTs(serverKmDate) ??
      (series.length ? safeTs(series[series.length - 1].t) : null);

    const testTs  = safeTs(lastTestDate);
    const firstTs = safeTs(firstReg);

    if (testTs && (!kmTs || (firstTs && kmTs <= firstTs) || testTs > kmTs)) {
      return testTs;
    }
    return kmTs || null;
  }, [serverKmDate, series, lastTestDate, firstReg]);

  return (
    <>
      <div className="card section mt-4">
        <h3 className="section-title">היסטוריה (נסועה/שינויים ובעלויות)</h3>

        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {lastKm != null && (
            <span className="badge">
              {displayKmDateTs
                ? `ק"מ אחרון שדווח במבחן הרישוי ב ${formatMonthYear(displayKmDateTs, "/")} הוא: ${formatNumber(lastKm)} קילומטרים`
                : `ק"מ אחרון שדווח: ${formatNumber(lastKm)} קילומטרים`
              }
            </span>
          )}
        </div>

        {loading && <div className="mt-4 text-slate-600">טוען היסטוריה…</div>}
        {err && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-3">
            {err}
          </div>
        )}

        {!loading && !err && series.length > 1 && <Sparkline data={series} />}

        {!loading && !err && (
          <div className="mt-4">
            <OwnershipTable items={ownershipRows} />
          </div>
        )}
      </div>

      {SHOW_DEBUG && data && (
        <details className="card section">
          <summary className="cursor-pointer font-semibold">Raw history JSON</summary>
          <div className="mt-3">
            <pre className="text-xs overflow-auto bg-slate-50 rounded-lg p-3 border border-slate-200">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </>
  );
}
