import mongoose from "mongoose";
import { Router } from "express";
import { fail, send } from "../lib/http.js";
import { parseExamination, parseMarks } from "../lib/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { Examination } from "../models/Examination.js";
import { Result } from "../models/Result.js";
import { Student } from "../models/Student.js";

export const examinationsRouter = Router();

examinationsRouter.use(requireAdmin);

async function resultCounts() {
  const counts = await Result.aggregate([{ $group: { _id: "$examination", count: { $sum: 1 } } }]);
  return new Map(counts.map((row) => [String(row._id), row.count]));
}

examinationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const examinations = await Examination.find().sort({ examDate: -1, title: 1 }).lean();
    const counts = await resultCounts();
    return send(
      res,
      examinations.map((examination) => ({
        ...examination,
        resultCount: counts.get(String(examination._id)) || 0,
      })),
    );
  }),
);

examinationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = parseExamination(req.body);
    if (parsed.error) return fail(res, 400, parsed.error);
    const examination = await Examination.create(parsed.value);
    return send(res, { ...examination.toObject(), resultCount: 0 }, 201);
  }),
);

examinationsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = parseExamination(req.body);
    if (parsed.error) return fail(res, 400, parsed.error);
    const existing = await Examination.findById(req.params.id);
    if (!existing) return fail(res, 404, "Examination not found.");

    const overTotal = await Result.countDocuments({
      examination: existing._id,
      marksObtained: { $gt: parsed.value.totalMarks },
    });
    if (overTotal > 0) {
      return fail(
        res,
        400,
        "Total marks cannot be lowered below marks that are already recorded for this examination.",
      );
    }

    existing.set(parsed.value);
    await existing.save();
    const resultCount = await Result.countDocuments({ examination: existing._id });
    return send(res, { ...existing.toObject(), resultCount });
  }),
);

examinationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const examination = await Examination.findByIdAndDelete(req.params.id);
    if (!examination) return fail(res, 404, "Examination not found.");
    await Result.deleteMany({ examination: examination._id });
    return send(res, { deleted: true });
  }),
);

examinationsRouter.get(
  "/:id/sheet",
  asyncHandler(async (req, res) => {
    const examination = await Examination.findById(req.params.id).lean();
    if (!examination) return fail(res, 404, "Examination not found.");

    const [students, results] = await Promise.all([
      Student.find().lean(),
      Result.find({ examination: examination._id }).lean(),
    ]);

    students.sort((left, right) =>
      left.rollNumber.localeCompare(right.rollNumber, undefined, { numeric: true, sensitivity: "base" }),
    );
    const byStudent = new Map(results.map((result) => [String(result.student), result]));

    return send(res, {
      examination,
      rows: students.map((student) => {
        const result = byStudent.get(String(student._id));
        return {
          studentId: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          className: student.className,
          section: student.section,
          resultId: result?._id || null,
          marksObtained: result ? result.marksObtained : null,
          remarks: result?.remarks || "",
        };
      }),
    });
  }),
);

examinationsRouter.put(
  "/:id/results",
  asyncHandler(async (req, res) => {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return fail(res, 404, "Examination not found.");
    if (!Array.isArray(req.body?.entries)) return fail(res, 400, "Results must be a list of entries.");

    const seen = new Set();
    const prepared = [];

    for (const entry of req.body.entries) {
      const studentId = String(entry?.studentId ?? "");
      if (!mongoose.isValidObjectId(studentId)) return fail(res, 400, "A result entry has an invalid student.");
      if (seen.has(studentId)) return fail(res, 400, "Each student can appear only once in a result save.");
      seen.add(studentId);

      const marks = parseMarks(entry?.marksObtained, examination.totalMarks);
      if (marks.error) return fail(res, 400, marks.error);
      const remarks = String(entry?.remarks ?? "").trim();
      if (marks.value !== null && remarks.length > 240) {
        return fail(res, 400, "Remarks must be at most 240 characters.");
      }
      prepared.push({ studentId, marksObtained: marks.value, remarks });
    }

    const writing = prepared.filter((entry) => entry.marksObtained !== null);
    const found = await Student.find({ _id: { $in: writing.map((entry) => entry.studentId) } }).select("_id");
    if (found.length !== writing.length) return fail(res, 400, "One or more students do not exist.");

    for (const entry of prepared) {
      if (entry.marksObtained === null) {
        await Result.deleteOne({ examination: examination._id, student: entry.studentId });
        continue;
      }
      await Result.findOneAndUpdate(
        { examination: examination._id, student: entry.studentId },
        { marksObtained: entry.marksObtained, remarks: entry.remarks },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }

    const resultCount = await Result.countDocuments({ examination: examination._id });
    return send(res, { saved: true, resultCount });
  }),
);
