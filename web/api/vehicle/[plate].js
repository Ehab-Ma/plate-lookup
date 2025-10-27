export default async function handler(req, res) {
  const { plate } = req.query;
  if (!plate) return res.status(400).json({ error: 'missing plate' });
  res.json({ route: 'vehicle', plate });
};
