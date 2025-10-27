module.exports = async (req, res) => {
  const { plate } = req.query;
  res.status(200).json({ plate, ok: true });
};
