
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export async function fetchVehicle(plate){const res=await fetch(`${API_URL}/api/vehicle/${encodeURIComponent(plate)}`); const data=await res.json(); if(!res.ok) throw new Error(data?.error||"שגיאה בטעינת נתוני רכב"); return data;}


export async function fetchHistory(plate){
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const res = await fetch(`${API_URL}/api/history/${encodeURIComponent(plate)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "שגיאה בטעינת היסטוריה");
  return data;
}
