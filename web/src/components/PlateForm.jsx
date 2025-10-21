// web/src/components/PlateForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";

const HISTORY_KEY = "plate_history";
const LAST_KEY = "last_plate";
const MAX_HISTORY = 12;

export default function PlateForm({ onSearch, loading = false }) {
  const [plate, setPlate] = useState("");
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // highlighted index

  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Load history + last plate
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved)) setHistory(saved);
    } catch {}
    const last = localStorage.getItem(LAST_KEY) || "";
    if (last) setPlate(last);
  }, []);

  // Autofocus + Ctrl/Cmd+K to focus the search
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const digitsOnly = (s) => (s || "").replace(/[^\d]/g, "");
  const formatPlate = (p) => {
    if (p.length === 7) return `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
    if (p.length === 8) return `${p.slice(0, 3)}-${p.slice(3, 5)}-${p.slice(5)}`;
    return p;
  };

  // Unique history (most recent first)
  const uniqueHistory = useMemo(() => {
    const list = (history || []).filter(Boolean);
    const dedup = [...new Set(list)];
    return dedup.slice(0, MAX_HISTORY);
  }, [history]);

  // On focus show all history; while typing, filter
  const suggestions = useMemo(() => {
    const q = digitsOnly(plate);
    if (!q) return uniqueHistory;
    return uniqueHistory.filter((p) => p.includes(q));
  }, [plate, uniqueHistory]);

  const persist = (p) => {
    try {
      localStorage.setItem(LAST_KEY, p);
      const next = [p, ...history.filter((x) => x !== p)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
    } catch {}
  };

  const triggerSearch = (raw) => {
    const p = digitsOnly(raw).trim();
    if (!p) return;
    persist(p);
    onSearch?.(p);
    setOpen(false);
    setHi(-1);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    triggerSearch(plate);
  };

  const handleKey = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min((i < 0 ? -1 : i) + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (hi >= 0 && hi < suggestions.length) {
        e.preventDefault();
        triggerSearch(suggestions[hi]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHi(-1);
    }
  };

  const clearHistory = () => {
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setHistory([]);
    setHi(-1);
  };

  return (
    <div ref={wrapRef} dir="rtl" className="relative w-full">
      <form onSubmit={onSubmit} className="w-full flex items-center gap-3">
        <label htmlFor="plate-input" className="text-slate-700 whitespace-nowrap">חפש</label>

        {/* Input wrapper so we can place the clear (×) button inside */}
        <div className="relative w-full">
          <input
            ref={inputRef}
            id="plate-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="מספר רכב (7–8 ספרות)"
            value={plate}
            onChange={(e) => { setPlate(e.target.value); setHi(-1); }}
            onFocus={() => { setOpen(true); setHi(-1); }}
            onKeyDown={handleKey}
            className="
              w-full py-3 pr-4 pl-10 rounded-md bg-white
              border-2 border-slate-900
              focus:outline-none focus:ring-2 focus:ring-slate-900/60 focus:border-slate-900
              transition-shadow
            "
          />

          {/* Clear (×) inside the input — RTL: place on the LEFT */}
          {plate && (
            <button
              type="button"
              aria-label="נקה"
              onClick={() => {
                setPlate("");
                setHi(-1);
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="
                absolute inset-y-0 left-2 my-auto h-6 w-6
                rounded-full text-slate-600 hover:bg-slate-100
                flex items-center justify-center
              "
              title="נקה"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="shrink-0 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "טוען…" : "חפש"}
        </button>
      </form>

      {/* Dropdown — full history on focus, filters as you type */}
      {open && suggestions.length > 0 && (
        <div
          className="
            absolute top-full right-0 left-0 mt-1
            bg-white border border-slate-200 rounded-md shadow-lg
            max-h-64 overflow-auto
            z-[9999]
          "
          role="listbox"
          aria-label="חיפושים אחרונים"
        >
          {suggestions.map((p, idx) => (
            <button
              key={`${p}-${idx}`}
              type="button"
              onMouseEnter={() => setHi(idx)}
              onMouseLeave={() => setHi(-1)}
              onClick={() => triggerSearch(p)}
              className={`w-full text-right px-3 py-2 text-sm ${hi === idx ? "bg-slate-100" : "bg-white"} hover:bg-slate-100`}
              role="option"
              aria-selected={hi === idx}
              title={`חפש ${p}`}
            >
              {formatPlate(p)}
            </button>
          ))}

          <div className="flex justify-between items-center px-3 py-2 border-t border-slate-200">
            <span className="text-xs text-slate-500">חיפושים אחרונים</span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              נקה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
