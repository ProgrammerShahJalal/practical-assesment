import { Router } from "express";
import { fail, send } from "../lib/http.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { runSeed } from "../seed.js";

export const setupRouter = Router();

// Temporary helper for a fresh deployment, exposed to the login screens so a
// site with no data can still be entered. It is safe to call more than once:
// existing passwords are never reset and existing records are never replaced.
// Set DISABLE_QUICK_SETUP=true to switch it off once a real database is live.
setupRouter.post(
  "/quick-start",
  asyncHandler(async (_req, res) => {
    if (String(process.env.DISABLE_QUICK_SETUP || "").toLowerCase() === "true") {
      return fail(res, 403, "One-click setup has been turned off on this server.");
    }
    return send(res, await runSeed());
  }),
);
