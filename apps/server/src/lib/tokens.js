import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";

const ADMIN_ROLE = "admin";
const STUDENT_ROLE = "student";

function adminSecret() {
  return process.env.JWT_SECRET || "";
}

// A different key for student tokens means a token can never cross roles, even
// if both roles happen to share the same role claim shape. The derived default
// keeps existing local deployments working without a config change; setting
// STUDENT_JWT_SECRET explicitly is recommended in production.
function studentSecret() {
  if (process.env.STUDENT_JWT_SECRET) return process.env.STUDENT_JWT_SECRET;
  return createHmac("sha256", adminSecret())
    .update("result-ledger:student-token:v1")
    .digest("hex");
}

function sign(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function signAdminToken(admin) {
  return sign(
    { sub: String(admin._id), username: admin.username, role: ADMIN_ROLE },
    adminSecret(),
    process.env.JWT_EXPIRES_IN || "12h",
  );
}

export function signStudentToken(student) {
  return sign(
    {
      sub: String(student._id),
      role: STUDENT_ROLE,
      registrationNumber: student.rollNumber,
    },
    studentSecret(),
    process.env.STUDENT_JWT_EXPIRES_IN || "12h",
  );
}

export function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, adminSecret());
    // Legacy admin tokens were issued without a role. They are still valid
    // here because only the admin key can sign them; student tokens use a
    // different key and are always rejected.
    if (payload?.sub && (payload.role === ADMIN_ROLE || payload.role === undefined)) {
      return { id: payload.sub, username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}

export function verifyStudentToken(token) {
  try {
    const payload = jwt.verify(token, studentSecret());
    if (payload?.sub && payload.role === STUDENT_ROLE) {
      return { id: payload.sub, registrationNumber: payload.registrationNumber };
    }
    return null;
  } catch {
    return null;
  }
}
