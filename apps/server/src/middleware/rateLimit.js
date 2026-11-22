// Small fixed-window limiter kept in process memory. It is sufficient for the
// login endpoint and avoids adding a dependency; on multiple API instances a
// shared store would be needed, but this project runs a single process.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function keyFor(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function loginLimiter(req, res, next) {
  const key = keyFor(req);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    res.setHeader("RateLimit-Limit", String(MAX_ATTEMPTS));
    res.setHeader("RateLimit-Remaining", String(MAX_ATTEMPTS - 1));
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    res.setHeader("RateLimit-Limit", String(MAX_ATTEMPTS));
    res.setHeader("RateLimit-Remaining", "0");
    res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: "Too many sign-in attempts. Try again later." });
  }

  entry.count += 1;
  res.setHeader("RateLimit-Limit", String(MAX_ATTEMPTS));
  res.setHeader("RateLimit-Remaining", String(MAX_ATTEMPTS - entry.count));
  return next();
}

export function resetLoginLimiter() {
  attempts.clear();
}
