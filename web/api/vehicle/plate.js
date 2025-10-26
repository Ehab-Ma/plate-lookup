export default async function handler(req, res) {
  try {
    const { plate } = req.query;
    // For now, return test data
    res.status(200).json({ plate, ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
}
