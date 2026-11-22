import bcrypt from "bcryptjs";
import { Router } from "express";
import { escapeRegex, parsePassword, parseStudent } from "../lib/validate.js";
import { fail, send } from "../lib/http.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { Result } from "../models/Result.js";
import { Student } from "../models/Student.js";

export const studentsRouter = Router();

studentsRouter.use(requireAdmin);

studentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q ?? "").trim();
    const filter = query
      ? {
          $or: ["name", "rollNumber", "className", "section", "email"].map((field) => ({
            [field]: new RegExp(escapeRegex(query), "i"),
          })),
        }
      : {};

    const students = await Student.find(filter).sort({ rollNumber: 1 }).lean();
    return send(res, students);
  }),
);

studentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = parseStudent(req.body);
    if (parsed.error) return fail(res, 400, parsed.error);
    const password = parsePassword(req.body?.password);
    if (password.error) return fail(res, 400, password.error);

    const fields = { ...parsed.value };
    if (password.value) fields.passwordHash = await bcrypt.hash(password.value, 10);
    const student = await Student.create(fields);
    return send(res, student, 201);
  }),
);

studentsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = parseStudent(req.body);
    if (parsed.error) return fail(res, 400, parsed.error);
    const password = parsePassword(req.body?.password);
    if (password.error) return fail(res, 400, password.error);

    const fields = { ...parsed.value };
    if (password.value) fields.passwordHash = await bcrypt.hash(password.value, 10);
    const student = await Student.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true,
    });
    if (!student) return fail(res, 404, "Student not found.");
    return send(res, student);
  }),
);

studentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return fail(res, 404, "Student not found.");
    await Result.deleteMany({ student: student._id });
    return send(res, { deleted: true });
  }),
);
