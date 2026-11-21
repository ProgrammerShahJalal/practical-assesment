export function errorHandler(error, _req, res, _next) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    const label = field === "rollNumber" ? "roll number" : field;
    return res.status(409).json({ error: `A record with that ${label} already exists.` });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ error: "Invalid id." });
  }

  console.error(error);
  return res.status(error.status || 500).json({ error: "Unexpected server error." });
}
