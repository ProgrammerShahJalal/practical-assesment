import { Examination } from "../models/Examination.js";
import { Result } from "../models/Result.js";
import { gradingPolicy, rankResults, summarizeLeaderboard } from "./ranking.js";

export function examinationRows(examination, results) {
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
  return rankResults(rows, examination.totalMarks);
}

// The one source of leaderboard truth. Admin and student routes both load
// their boards through here, so ranks cannot drift between the two panels.
export async function loadLeaderboard(examinationId) {
  const examination = await Examination.findById(examinationId).lean();
  if (!examination) return null;

  const results = await Result.find({ examination: examination._id }).populate("student").lean();
  const standings = examinationRows(examination, results);
  return {
    examination,
    policy: gradingPolicy(),
    summary: summarizeLeaderboard(standings),
    standings,
  };
}

// Only fields the student panel is allowed to see about other students.
export function publicStanding(row, currentStudentId, totalMarks) {
  return {
    rank: row.rank,
    rollNumber: row.rollNumber,
    studentName: row.studentName,
    marksObtained: row.marksObtained,
    totalMarks: Number(totalMarks),
    percentage: row.percentage,
    isMe: String(row.studentId) === String(currentStudentId),
  };
}
