// web/src/App.jsx
import "./styles.css";
import { useEffect, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import PlateForm from "./components/PlateForm.jsx";
import VehicleCard from "./components/VehicleCard.jsx";
import HistoryCard from "./components/HistoryCard.jsx";
import { fetchVehicle } from "./api.js";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData]     = useState(null);
  const [error, setError]   = useState("");

  async function onSearch(plate) {
    try {
      localStorage.setItem("last_plate", plate);
    } catch {}
    setError("");
    setLoading(true);
    setData(null);
    try {
      const out = await fetchVehicle(plate);
      setData(out);
         // keep a shareable permalink in the address bar
   try {
       const u = new URL(window.location.href);
       u.searchParams.set("plate", String(plate));
       window.history.replaceState(null, "", u.toString());
     } catch {}


    } catch (e) {
      setError(e?.message || "שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("last_plate");
    if (saved) onSearch(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-bg">
      <TopBar />

      <div className="container-card">
        {/* Sticky search card; allow popover to overflow and sit above others */}
        <div className="card section card--search overflow-visible">
          <PlateForm onSearch={onSearch} loading={loading} />
        </div>

        {/* Loading / error states */}
        {loading && (
          <div className="card section mt-4">טוען נתונים…</div>
        )}

        {error && (
          <div
            className="card section mt-4 bg-red-50 border border-red-200 text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Results */}
        {data && !error && (
          <>
            <VehicleCard data={data} />

            <HistoryCard
              plate={data?.normalized?.plate || data?.plate}
              lastTestDate={
                data?.normalized?.last_test_date ??
                data?.raw?.records?.[0]?.mivchan_acharon_dt
              }
              firstReg={
                data?.normalized?.first_registration ??
                data?.raw?.records?.[0]?.moed_aliya_lakvish
              }
            />
          </>
        )}

        <footer className="mt-10 text-sm text-slate-500 text-center">
          נבנה באהבה ל־Open Data. מתאים לקו״ח ולפורטפוליו.
        </footer>
      </div>
    </div>
  );
}
