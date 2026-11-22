import bcrypt from "bcryptjs";
import { Router } from "express";
import { fail, send } from "../lib/http.js";
import { signAdminToken } from "../lib/tokens.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { Admin } from "../models/Admin.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!username || !password) return fail(res, 400, "Username and password are required.");

    const admin = await Admin.findOne({ username });
    const matches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !matches) return fail(res, 401, "Invalid username or password.");

    const token = signAdminToken(admin);

    return send(res, { token, admin: { id: admin._id, username: admin.username } });
  }),
);

authRouter.get(
  "/me",
  requireAdmin,
  asyncHandler(async (req, res) => {
    return send(res, { id: req.admin.id, username: req.admin.username });
  }),
);
