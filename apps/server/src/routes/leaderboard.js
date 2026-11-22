import { Router } from "express";
import { fail, send } from "../lib/http.js";
import { loadLeaderboard } from "../lib/leaderboard.js";
import { parseObjectId } from "../lib/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAdmin);

leaderboardRouter.get(
  "/:examinationId",
  asyncHandler(async (req, res) => {
    const parsed = parseObjectId(req.params.examinationId);
    if (parsed.error) return fail(res, 400, parsed.error);

    const board = await loadLeaderboard(parsed.value);
    if (!board) return fail(res, 404, "Examination not found.");
    return send(res, board);
  }),
);
