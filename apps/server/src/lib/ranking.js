export const PASS_PERCENTAGE = 40;

export const GRADE_BANDS = [
  { grade: "A+", minPercentage: 90 },
  { grade: "A", minPercentage: 80 },
  { grade: "B", minPercentage: 70 },
  { grade: "C", minPercentage: 60 },
  { grade: "D", minPercentage: 40 },
  { grade: "F", minPercentage: 0 },
];

export function gradingPolicy() {
  return {
    ranking: "competition",
    description:
      "Equal marks share a rank. The next distinct score takes the following position number, so tied places are skipped.",
    passPercentage: PASS_PERCENTAGE,
    grades: GRADE_BANDS,
    missingResults:
      "Students without a recorded result are omitted. Missing marks are never scored as zero.",
    scope:
      "Each leaderboard ranks a single examination. Marks are not combined or normalised across examinations.",
  };
}

export function roundTo(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function marksEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.001;
}

export function gradeForPercentage(percentage) {
  const score = Number(percentage);
  for (const band of GRADE_BANDS) {
    if (score + 1e-9 >= band.minPercentage) return band.grade;
  }
  return "F";
}

export function isPassing(percentage) {
  return Number(percentage) + 1e-9 >= PASS_PERCENTAGE;
}

function compareRows(left, right) {
  if (!marksEqual(left.marksObtained, right.marksObtained)) {
    return Number(right.marksObtained) - Number(left.marksObtained);
  }
  const nameDiff = String(left.studentName).localeCompare(String(right.studentName), undefined, {
    sensitivity: "base",
  });
  if (nameDiff !== 0) return nameDiff;
  return String(left.rollNumber).localeCompare(String(right.rollNumber), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function rankResults(results, totalMarks) {
  const total = Number(totalMarks);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Examination total marks must be greater than zero.");
  }

  const sorted = [...results].sort(compareRows);
  let currentRank = 0;
  let previousMarks = null;

  return sorted.map((row, index) => {
    const marks = roundTo(row.marksObtained);
    if (previousMarks === null || !marksEqual(marks, previousMarks)) {
      currentRank = index + 1;
      previousMarks = marks;
    }
    const percentage = roundTo((marks / total) * 100);
    return {
      ...row,
      marksObtained: marks,
      rank: currentRank,
      percentage,
      grade: gradeForPercentage(percentage),
      passed: isPassing(percentage),
    };
  });
}

export function summarizeLeaderboard(rows) {
  if (!rows.length) {
    return {
      participants: 0,
      highest: null,
      lowest: null,
      average: null,
      passCount: 0,
      failCount: 0,
      passRate: null,
    };
  }

  const marks = rows.map((row) => Number(row.marksObtained));
  const passCount = rows.filter((row) => row.passed).length;
  const sum = marks.reduce((total, value) => total + value, 0);

  return {
    participants: rows.length,
    highest: roundTo(Math.max(...marks)),
    lowest: roundTo(Math.min(...marks)),
    average: roundTo(sum / rows.length),
    passCount,
    failCount: rows.length - passCount,
    passRate: roundTo((passCount / rows.length) * 100),
  };
}
