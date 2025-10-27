const API = ''; // same origin

export async function fetchVehicle(plate) {
  const res = await fetch(`${API}/api/vehicle/${encodeURIComponent(plate)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'שגיאה בטעינת נתוני רכב');
  return data;
}

export async function fetchHistory(plate) {
  const res = await fetch(`${API}/api/history/${encodeURIComponent(plate)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'שגיאה בטעינת היסטוריה');
  return data;
}
