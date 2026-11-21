import jwt from "jsonwebtoken";
import { fail } from "../lib/http.js";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail(res, 401, "Sign in required.");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return fail(res, 401, "Session expired. Sign in again.");
  }
}
