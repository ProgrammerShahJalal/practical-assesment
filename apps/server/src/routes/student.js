import bcrypt from "bcryptjs";
import { Router } from "express";
import { fail, send } from "../lib/http.js";
import { loadLeaderboard, publicStanding } from "../lib/leaderboard.js";
import { roundTo } from "../lib/ranking.js";
import { resultCounts } from "../lib/results.js";
import { rankedResultsForStudent } from "../lib/studentResults.js";
import { signStudentToken } from "../lib/tokens.js";
import { parseObjectId, parsePagination, parsePassword } from "../lib/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireStudent } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";
import { Examination } from "../models/Examination.js";
import { Student } from "../models/Student.js";

export const studentRouter = Router();

// Used only to keep the timing of a missing account close to a bad password.
const DUMMY_HASH = bcrypt.hashSync("invalid-login-attempt", 10);
const INVALID_CREDENTIALS = "Invalid registration number or password.";

studentRouter.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const registrationNumber = String(req.body?.registrationNumber ?? req.body?.rollNumber ?? "")
      .trim()
      .toUpperCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!registrationNumber || !password) {
      return fail(res, 400, "Registration number and password are required.");
    }

    const student = await Student.findOne({ rollNumber: registrationNumber }).select("+passwordHash");
    const matches = await bcrypt.compare(password, student?.passwordHash || DUMMY_HASH);
    if (!student || !student.passwordHash || !matches) return fail(res, 401, INVALID_CREDENTIALS);

    return send(res, {
      token: signStudentToken(student),
      student: {
        id: student._id,
        registrationNumber: student.rollNumber,
        name: student.name,
      },
    });
  }),
);

studentRouter.use(requireStudent);

studentRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const student = await Student.findById(req.student.id).lean();
    if (!student) return fail(res, 401, "Session expired. Sign in again.");

    return send(res, {
      id: student._id,
      registrationNumber: student.rollNumber,
      name: student.name,
      email: student.email || "",
      batch: student.className || "",
      department: student.section || "",
      className: student.className || "",
      section: student.section || "",
    });
  }),
);

studentRouter.patch(
  "/me/password",
  asyncHandler(async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = parsePassword(req.body?.newPassword);
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!currentPassword) return fail(res, 400, "Current password is required.");
    if (newPassword.error) return fail(res, 400, newPassword.error);
    if (!newPassword.value) return fail(res, 400, "New password is required.");
    if (newPassword.value !== confirmPassword) return fail(res, 400, "New passwords do not match.");

    const student = await Student.findById(req.student.id).select("+passwordHash");
    if (!student) return fail(res, 401, "Session expired. Sign in again.");
    if (!student.passwordHash) {
      return fail(res, 400, "No password is set for this account. Ask an administrator to set one.");
    }
    if (!(await bcrypt.compare(currentPassword, student.passwordHash))) {
      return fail(res, 400, "Current password is incorrect.");
    }

    student.passwordHash = await bcrypt.hash(newPassword.value, 10);
    await student.save();
    return send(res, { changed: true });
  }),
);

studentRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const results = await rankedResultsForStudent(req.student.id);
    const percentages = results.map((result) => Number(result.percentage));
    const latest = results[0] || null;

    return send(res, {
      totalExamsAttempted: results.length,
      averagePercentage: percentages.length ? roundTo(percentages.reduce((a, b) => a + b, 0) / percentages.length) : null,
      bestPercentage: percentages.length ? roundTo(Math.max(...percentages)) : null,
      latestRank: latest?.rank ?? null,
      latestResult: latest,
      recentResults: results.slice(0, 5),
    });
  }),
);

studentRouter.get(
  "/results",
  asyncHandler(async (req, res) => {
    const page = parsePagination(req.query);
    if (page.error) return fail(res, 400, page.error);

    const requestedExam = String(req.query.examination ?? req.query.examId ?? "").trim();
    let examId = "";
    if (requestedExam) {
      const parsed = parseObjectId(requestedExam, "examination id");
      if (parsed.error) return fail(res, 400, parsed.error);
      const exists = await Examination.findById(parsed.value, "_id").lean();
      if (!exists) return fail(res, 404, "Examination not found.");
      examId = parsed.value;
    }

    // The student id comes only from the verified token. Query parameters are
    // ignored, so one student can never request another student's results.
    let results = await rankedResultsForStudent(req.student.id);
    if (examId) results = results.filter((result) => result.examinationId === examId);

    const total = results.length;
    const { page: requestedPage, limit } = page.value;
    const pages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(requestedPage, pages);
    const items = results.slice((currentPage - 1) * limit, currentPage * limit);

    return send(res, {
      items,
      pagination: { page: currentPage, limit, total, pages, hasMore: currentPage < pages },
    });
  }),
);

studentRouter.get(
  "/results/:examId",
  asyncHandler(async (req, res) => {
    const parsed = parseObjectId(req.params.examId, "examination id");
    if (parsed.error) return fail(res, 400, parsed.error);

    const examination = await Examination.findById(parsed.value).lean();
    if (!examination) return fail(res, 404, "Examination not found.");

    const results = await rankedResultsForStudent(req.student.id);
    const result = results.find((row) => row.examinationId === parsed.value);
    if (!result) return fail(res, 404, "No result recorded for this examination.");

    return send(res, {
      result,
      examination: {
        _id: examination._id,
        title: examination.title,
        subject: examination.subject,
        examDate: examination.examDate,
        totalMarks: examination.totalMarks,
      },
    });
  }),
);

studentRouter.get(
  "/exams",
  asyncHandler(async (req, res) => {
    const [examinations, counts, ownResults] = await Promise.all([
      Examination.find().sort({ examDate: -1, title: 1 }).lean(),
      resultCounts(),
      rankedResultsForStudent(req.student.id),
    ]);
    const ownExamIds = new Set(ownResults.map((result) => result.examinationId));

    return send(
      res,
      examinations.map((examination) => {
        const resultCount = counts.get(String(examination._id)) || 0;
        return {
          _id: examination._id,
          title: examination.title,
          subject: examination.subject,
          examDate: examination.examDate,
          totalMarks: examination.totalMarks,
          status: resultCount > 0 ? "published" : "pending",
          resultCount,
          hasResult: ownExamIds.has(String(examination._id)),
        };
      }),
    );
  }),
);

studentRouter.get(
  "/leaderboard/:examId",
  asyncHandler(async (req, res) => {
    const parsed = parseObjectId(req.params.examId, "examination id");
    if (parsed.error) return fail(res, 400, parsed.error);

    const board = await loadLeaderboard(parsed.value);
    if (!board) return fail(res, 404, "Examination not found.");

    const mine = board.standings.find((row) => String(row.studentId) === String(req.student.id));
    return send(res, {
      examination: {
        _id: board.examination._id,
        title: board.examination.title,
        subject: board.examination.subject,
        examDate: board.examination.examDate,
        totalMarks: board.examination.totalMarks,
      },
      summary: board.summary,
      policy: { description: board.policy.description },
      standings: board.standings.map((row) =>
        publicStanding(row, req.student.id, board.examination.totalMarks),
      ),
      myRank: mine?.rank ?? null,
      isParticipant: Boolean(mine),
    });
  }),
);
