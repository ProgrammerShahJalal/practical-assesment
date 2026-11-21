import { Router } from "express";
import { fail, send } from "../lib/http.js";
import { gradingPolicy, rankResults, summarizeLeaderboard } from "../lib/ranking.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { Examination } from "../models/Examination.js";
import { Result } from "../models/Result.js";

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAdmin);

leaderboardRouter.get(
  "/:examinationId",
  asyncHandler(async (req, res) => {
    const examination = await Examination.findById(req.params.examinationId).lean();
    if (!examination) return fail(res, 404, "Examination not found.");

    const results = await Result.find({ examination: examination._id }).populate("student").lean();
    const rows = [];
    for (const result of results) {
      if (!result.student) continue;
      rows.push({
        resultId: result._id,
        studentId: result.student._id,
        studentName: result.student.name,
        rollNumber: result.student.rollNumber,
        className: result.student.className,
        section: result.student.section,
        marksObtained: result.marksObtained,
        remarks: result.remarks || "",
      });
    }

    const standings = rankResults(rows, examination.totalMarks);
    return send(res, {
      examination,
      policy: gradingPolicy(),
      summary: summarizeLeaderboard(standings),
      standings,
    });
  }),
);
