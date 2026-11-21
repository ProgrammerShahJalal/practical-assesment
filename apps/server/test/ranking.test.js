import assert from "node:assert/strict";
import test from "node:test";
import {
  GRADE_BANDS,
  gradeForPercentage,
  rankResults,
  summarizeLeaderboard,
} from "../src/lib/ranking.js";

test("grade bands stay ordered from highest to lowest", () => {
  const minimums = GRADE_BANDS.map((band) => band.minPercentage);
  const sorted = [...minimums].sort((left, right) => right - left);
  assert.deepEqual(minimums, sorted);
});

test("grade boundaries use the published cutoffs", () => {
  assert.equal(gradeForPercentage(100), "A+");
  assert.equal(gradeForPercentage(90), "A+");
  assert.equal(gradeForPercentage(89.99), "A");
  assert.equal(gradeForPercentage(80), "A");
  assert.equal(gradeForPercentage(70), "B");
  assert.equal(gradeForPercentage(60), "C");
  assert.equal(gradeForPercentage(40), "D");
  assert.equal(gradeForPercentage(39.99), "F");
  assert.equal(gradeForPercentage(0), "F");
});

test("competition ranking shares ties and skips the next place", () => {
  const ranked = rankResults(
    [
      { studentName: "Chitra Das", rollNumber: "R-1003", marksObtained: 88 },
      { studentName: "Bilal Hossain", rollNumber: "R-1002", marksObtained: 92 },
      { studentName: "Ayesha Rahman", rollNumber: "R-1001", marksObtained: 92 },
      { studentName: "Elina Chowdhury", rollNumber: "R-1005", marksObtained: 76 },
      { studentName: "Dev Kapoor", rollNumber: "R-1004", marksObtained: 76 },
    ],
    100,
  );

  assert.deepEqual(
    ranked.map((row) => [row.rank, row.rollNumber, row.marksObtained, row.grade, row.passed]),
    [
      [1, "R-1001", 92, "A+", true],
      [1, "R-1002", 92, "A+", true],
      [3, "R-1003", 88, "A", true],
      [4, "R-1004", 76, "B", true],
      [4, "R-1005", 76, "B", true],
    ],
  );
});

test("equal marks are ordered by name and a real zero still ranks", () => {
  const ranked = rankResults(
    [
      { studentName: "Ben", rollNumber: "R-2", marksObtained: 10 },
      { studentName: "Ana", rollNumber: "R-1", marksObtained: 10 },
      { studentName: "Cara", rollNumber: "R-3", marksObtained: 0 },
    ],
    50,
  );

  assert.deepEqual(
    ranked.map((row) => [row.rank, row.studentName, row.percentage, row.grade, row.passed]),
    [
      [1, "Ana", 20, "F", false],
      [1, "Ben", 20, "F", false],
      [3, "Cara", 0, "F", false],
    ],
  );
});

test("percentage follows the examination total, not a fixed scale of 100", () => {
  const ranked = rankResults(
    [{ studentName: "Hasan Ali", rollNumber: "R-1008", marksObtained: 49 }],
    50,
  );
  assert.equal(ranked[0].percentage, 98);
  assert.equal(ranked[0].grade, "A+");
  assert.equal(ranked[0].rank, 1);
});

test("summary counts passes at 40 percent and averages recorded marks", () => {
  const ranked = rankResults(
    [
      { studentName: "Ana", rollNumber: "R-1", marksObtained: 40 },
      { studentName: "Ben", rollNumber: "R-2", marksObtained: 39 },
    ],
    100,
  );
  assert.deepEqual(summarizeLeaderboard(ranked), {
    participants: 2,
    highest: 40,
    lowest: 39,
    average: 39.5,
    passCount: 1,
    failCount: 1,
    passRate: 50,
  });
});

test("an examination with no recorded results has an empty board", () => {
  assert.deepEqual(rankResults([], 100), []);
  assert.equal(summarizeLeaderboard([]).participants, 0);
  assert.equal(summarizeLeaderboard([]).average, null);
});

test("ranking refuses a zero total so percentages cannot divide by zero", () => {
  assert.throws(() => rankResults([], 0), /greater than zero/);
});
