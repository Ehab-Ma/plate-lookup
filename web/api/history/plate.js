export default async function handler(req, res) {
  const { plate } = req.query;

  try {
    res.status(200).json({ plate, history: [], ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
