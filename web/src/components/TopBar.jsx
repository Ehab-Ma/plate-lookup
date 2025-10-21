export default function TopBar() {
  return (
    <header className="container-card pt-6 pb-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          בדיקת רכב לפי מספר רישוי
        </h1>
        <a
          href="https://data.gov.il/dataset/private-and-commercial-vehicles"
          target="_blank" rel="noreferrer"
          className="chip"
          title="מקור הנתונים"
        >
          data.gov.il
        </a>
      </div>
      <p className="text-slate-600 mt-1">
        הזינו מספר רכב (7–8 ספרות) כדי לקבל נתונים רשמיים ממאגרי הממשלה.
      </p>
    </header>
  );
}
