import { Router } from "express";
import { send } from "../lib/http.js";
import { rankResults } from "../lib/ranking.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { Examination } from "../models/Examination.js";
import { Result } from "../models/Result.js";
import { Student } from "../models/Student.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAdmin);

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [students, examinations, results] = await Promise.all([
      Student.countDocuments(),
      Examination.find().sort({ examDate: -1, title: 1 }).limit(6).lean(),
      Result.find().populate("student").lean(),
    ]);

    const byExam = new Map();
    for (const result of results) {
      if (!result.student) continue;
      const key = String(result.examination);
      const bucket = byExam.get(key) || [];
      bucket.push({
        studentName: result.student.name,
        rollNumber: result.student.rollNumber,
        marksObtained: result.marksObtained,
      });
      byExam.set(key, bucket);
    }

    return send(res, {
      counts: {
        students,
        examinations: await Examination.countDocuments(),
        results: results.length,
      },
      examinations: examinations.map((examination) => {
        const standings = rankResults(byExam.get(String(examination._id)) || [], examination.totalMarks);
        const leaders = standings.filter((row) => row.rank === 1);
        return {
          ...examination,
          resultCount: standings.length,
          highest: standings[0]?.marksObtained ?? null,
          leaders: leaders.map((row) => ({ name: row.studentName, rollNumber: row.rollNumber })),
        };
      }),
    });
  }),
);
