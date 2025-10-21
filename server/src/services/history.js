
import axios from "axios";
const DATA_GOV_BASE = process.env.DATA_GOV_BASE || "https://data.gov.il/api/3/action/datastore_search";
const RES_HISTORY1 = process.env.DATA_GOV_HISTORY1 || "56063a99-8a3e-4ff4-912e-5966c0279bad";
const RES_HISTORY2 = process.env.DATA_GOV_HISTORY2 || "bb2355dc-9ec7-4f06-9c3f-3344672171da";
async function fetchCkanByPlate(resourceId, plate, limit = 100){
  const filters = encodeURIComponent(JSON.stringify({ mispar_rechev: String(plate) }));
  const url = `${DATA_GOV_BASE}?resource_id=${resourceId}&filters=${filters}&limit=${limit}`;
  const resp = await axios.get(url, { timeout: 20000 });
  const result = resp?.data?.result || {};
  return { records: result.records || [], fields: result.fields || [], total: result.total ?? null };
}
export async function fetchHistory1(plate){ return fetchCkanByPlate(RES_HISTORY1, plate, 200); }
export async function fetchHistory2Ownership(plate){ return fetchCkanByPlate(RES_HISTORY2, plate, 200); }


// --- Helpers to normalize history (mileage + ownership) ---
function keyOf(obj, rx){ return Object.keys(obj).find(k => rx.test(k)); }
function toTs(v){
  if (!v) return null;
  const s = String(v).trim();
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s)
        : /^\d{2}\/\d{2}\/\d{4}/.test(s) ? new Date(s.split('/').reverse().join('-'))
        : new Date(s);
  const t = d.getTime(); return Number.isFinite(t) ? t : null;
}
function toInt(v){ const n = parseInt(String(v).replace(/[^\d]/g,''),10); return Number.isFinite(n) ? n : null; }
function diffMonths(a,b){ try{ const s=new Date(a), e=new Date(b);
  return (e.getFullYear()-s.getFullYear())*12 + (e.getMonth()-s.getMonth()); } catch { return null; } }

export function summarizeHistory1(records=[]) {
  const series = [];
  const flags = { lpg: null, colorChange: null, tyre: null };
  for (const r of records){
    const dateKey = keyOf(r, /תאריך|מועד|date|dt|מבחן|test|mivhan/i);
    const kmKey   = keyOf(r, /נסוע|נסועה|neso?a|odometer|kilo(meter|metre)?|km|ק.?מ/i);
    const t = toTs(r[dateKey]); const km = toInt(r[kmKey]);
    if (t && km!=null) series.push({ t, km });
    const lpgKey   = keyOf(r, /גפ.?מ|lpg/i);
    const colorKey = keyOf(r, /צבע|color/i);
    const tyreKey  = keyOf(r, /צמיג|tyre|tire/i);
    if (lpgKey   && flags.lpg==null)        flags.lpg = truthy(r[lpgKey]);
    if (colorKey && flags.colorChange==null) flags.colorChange = truthy(r[colorKey]);
    if (tyreKey  && flags.tyre==null)        flags.tyre = truthy(r[tyreKey]);
  }
  series.sort((a,b)=>a.t-b.t);
  let last_km=null,last_km_date=null,max_km=null,max_km_date=null;
  if (series.length){
    const last = series[series.length-1]; last_km=last.km; last_km_date=last.t;
    const max = series.reduce((m,x)=>m.km>=x.km?m:x, series[0]); max_km=max.km; max_km_date=max.t;
  }
  return { last_km, last_km_date, max_km, max_km_date, flags, count: series.length };
}
function truthy(v){
  if (v==null) return null;
  const s=String(v).trim();
  if (/^(1|true|כן|יש)$/i.test(s)) return true;
  if (/^(0|false|לא|אין)$/i.test(s)) return false;
  return s;
}

export function buildOwnershipRows(records=[]){
  const events=[];
  for (const r of records){
    const dateKey = keyOf(r, /תאריך|date|מועד/i);
    const typeKey = keyOf(r, /בעלות|סוג|type/i);
    const extraKey= keyOf(r, /הער|תיאור|remark|desc/i);
    const t = toTs(r[dateKey]); if (!t) continue;
    const typeRaw = r[typeKey]?String(r[typeKey]).trim():"";
    events.push({ date:t, typeRaw, typeNorm: normType(typeRaw), extra: r[extraKey]?String(r[extraKey]).trim():"" });
  }
  events.sort((a,b)=>a.date-b.date);
  const rows=[];
  for (let i=0;i<events.length;i++){
    const start=events[i].date;
    const end  =(i<events.length-1)? events[i+1].date - 24*3600*1000 : null;
    rows.push({ hand:i+1, start, end, durationMonths: end? diffMonths(start,end):null,
      typeRaw:events[i].typeRaw, typeNorm:events[i].typeNorm, extra:events[i].extra, isCurrent:i===events.length-1 });
  }
  return rows;
}
function normType(s=""){
  const t=s.toLowerCase();
  if (/(פרטי|private)/.test(t)) return "פרטי";
  if (/(ליסינג|lease|leasing)/.test(t)) return "ליסינג";
  if (/(סוחר|dealer|trade)/.test(t)) return "סוחר";
  if (/(חברה|תאגיד|company|corporate)/.test(t)) return "חברה";
  if (/(יבואן|importer)/.test(t)) return "יבואן";
  if (/(השכר|rent|rental)/.test(t)) return "השכרה";
  if (/(gov|government|ממשל|צבא|משטרה)/.test(t)) return "ממשלתי";
  return s;
}
