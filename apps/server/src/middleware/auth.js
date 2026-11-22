import { fail } from "../lib/http.js";
import { verifyAdminToken, verifyStudentToken } from "../lib/tokens.js";

function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function requireAdmin(req, res, next) {
  const token = bearer(req);
  if (!token) return fail(res, 401, "Sign in required.");

  const session = verifyAdminToken(token);
  if (!session) return fail(res, 401, "Session expired. Sign in again.");

  req.admin = { id: session.id, username: session.username };
  return next();
}

export function requireStudent(req, res, next) {
  const token = bearer(req);
  if (!token) return fail(res, 401, "Sign in required.");

  const session = verifyStudentToken(token);
  if (!session) return fail(res, 401, "Session expired. Sign in again.");

  req.student = { id: session.id, registrationNumber: session.registrationNumber };
  return next();
}
