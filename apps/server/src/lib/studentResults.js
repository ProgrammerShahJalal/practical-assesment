import { Examination } from "../models/Examination.js";
import { Result } from "../models/Result.js";
import { roundTo } from "./ranking.js";
import { examinationRows } from "./leaderboard.js";

function dateValue(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

// Ranks are always computed from the live result set for each examination,
// using the same ranking function as the admin leaderboard. Nothing is cached
// or denormalised, so admin create/update/delete is reflected immediately.
export async function rankedResultsForStudent(studentId) {
  const own = await Result.find({ student: studentId }).populate("examination").lean();
  const examIds = [
    ...new Set(own.filter((result) => result.examination).map((result) => String(result.examination._id))),
  ];

  if (!examIds.length) return [];

  const [examinations, examResults] = await Promise.all([
    Examination.find({ _id: { $in: examIds } }).lean(),
    Result.find({ examination: { $in: examIds } }).populate("student").lean(),
  ]);

  const examById = new Map(examinations.map((examination) => [String(examination._id), examination]));
  const rankByExam = new Map();

  for (const examination of examinations) {
    const id = String(examination._id);
    const standings = examinationRows(
      examination,
      examResults.filter((result) => String(result.examination) === id),
    );
    const mine = standings.find((row) => String(row.studentId) === String(studentId));
    if (mine) rankByExam.set(id, mine.rank);
  }

  return own
    .filter((result) => result.examination && examById.has(String(result.examination._id)))
    .map((result) => {
      const examId = String(result.examination._id);
      const examination = examById.get(examId);
      return {
        resultId: result._id,
        examinationId: examId,
        examTitle: examination.title,
        subject: examination.subject,
        examDate: examination.examDate,
        marksObtained: result.marksObtained,
        totalMarks: examination.totalMarks,
        percentage: roundTo((Number(result.marksObtained) / Number(examination.totalMarks)) * 100),
        rank: rankByExam.get(examId) ?? null,
        remarks: result.remarks || "",
      };
    })
    .sort((left, right) => {
      const diff = dateValue(right.examDate) - dateValue(left.examDate);
      if (diff !== 0) return diff;
      return String(left.examTitle).localeCompare(String(right.examTitle));
    });
}
