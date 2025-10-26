// CommonJS handler
module.exports = async (req, res) => {
  try {
    const { plate } = req.query;
    res.status(200).json({ plate, ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
};
