export default async function handler(req, res) {
  try {
    const { plate } = req.query;
    if (!plate) return res.status(400).json({ error: 'missing plate' });

    
    const payload = { plate, stub: true, route: 'history' };

    res.json(payload);
  } catch (err) {
    console.error('history handler error:', err);
    res.status(500).json({ error: 'internal_error', detail: String(err?.message || err) });
  }
}
