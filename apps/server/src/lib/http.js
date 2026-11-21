export function send(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function fail(res, status, error) {
  return res.status(status).json({ error });
}
