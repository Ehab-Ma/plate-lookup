export default function OwnershipTable({ items }) {
  if (!items?.length) return <div className="text-slate-600">אין בעלויות להצגה.</div>;

  return (
    <div className="overflow-x-auto mt-3">
      <table className="table-base">
        <thead>
          <tr className="text-right">
            <th className="table-th">סוג בעלות</th>
            <th className="table-th">תחילה (חודש/שנה)</th>
            <th className="table-th">סיום (חודש/שנה)</th>
            <th className="table-th">משך (בשנים/חודשים)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr
              key={idx}
              className={`${
                row.isCurrent ? "bg-emerald-50/50" : idx % 2 ? "bg-slate-50/30" : ""
              } hover:bg-indigo-50/40 transition-colors`}
            >
              <td className="table-td">
                <span className={`chip ${row.isCurrent ? "chip-green" : "chip-gray"}`}>
                  {row.typeNorm || row.typeRaw || "—"}{row.isCurrent ? " (נוכחית)" : ""}
                </span>
              </td>
              <td className="table-td">{formatMonthYear(row.start)}</td>
              <td className="table-td">{row.end ? formatMonthYear(row.end) : "—"}</td>
              <td className="table-td">{formatDurationMonths(row.durationMonths)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatMonthYear(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${yyyy}`;
  } catch {
    return "";
  }
}

function formatDurationMonths(m) {
  if (m == null) return "—";
  const years = Math.floor(m / 12);
  const months = m % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? "שנה" : "שנים"}`);
  if (months) parts.push(`${months} ${months === 1 ? "חודש" : "חודשים"}`);
  return parts.length ? parts.join(" ו ") : "0 חודשים";
}
