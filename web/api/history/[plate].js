module.exports = async (req, res) => {
  const { plate } = req.query;
  if (!plate) return res.status(400).json({ error: 'missing plate' });
  res.json({ route: 'history', plate });
};
