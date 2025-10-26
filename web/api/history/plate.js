export default async function handler(req, res) {
  try {
    const { plate } = req.query;
    res.status(200).json({ plate, history: [] });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
}
