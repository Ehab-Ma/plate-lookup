// web/api/vehicle/[plate].js  (ESM)
const BASE = 'https://data.gov.il/api/3/action/datastore_search';
// Main "רכב" dataset (active vehicles)
const RID_VEHICLE = '053cea08-09bc-40ec-8f7a-156f0677aff3';

export default async function handler(req, res) {
  try {
    const { plate } = req.query;
    if (!plate) return res.status(400).json({ error: 'missing plate' });

    // CKAN simple full-text query on the mispar_rechev field
    const url = `${BASE}?resource_id=${RID_VEHICLE}&limit=1&q=${encodeURIComponent(`mispar_rechev:${plate}`)}`;

    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`upstream ${r.status}`);

    const j = await r.json();
    const rec = j?.result?.records?.[0] || null;

    if (!rec) {
      // Not found in the dataset
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
      return res.status(404).json({ found: false });
    }

    // Map only the fields you need in the UI (you can expand later)
    const data = {
      plate: rec.mispar_rechev,
      maker: rec.tozeret_nm,
      model: rec.kinuy_mishari,
      year: rec.shnat_yitzur,
      color: rec.tzeva_rechev,
      firstRegistration: rec.moed_aliya_lakvish,
      ownership: rec.baalut,
      status: rec.tokef_dt, // validity date (if you use it)
    };

    // Cache at the edge for a day to avoid hitting the API too much
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');
    return res.json({ found: true, data });
  } catch (err) {
    // Helpful log for Vercel “Runtime Logs”
    console.error('vehicle handler error:', err);
    return res.status(500).json({ error: 'upstream_error', detail: String(err) });
  }
}
