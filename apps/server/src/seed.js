import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "./config/db.js";
import { Admin } from "./models/Admin.js";
import { Examination } from "./models/Examination.js";
import { Result } from "./models/Result.js";
import { Student } from "./models/Student.js";

dotenv.config();

const SAMPLE_STUDENTS = [
  ["Ayesha Rahman", "R-1001", "ayesha.rahman@example.edu"],
  ["Bilal Hossain", "R-1002", "bilal.hossain@example.edu"],
  ["Chitra Das", "R-1003", "chitra.das@example.edu"],
  ["Dev Kapoor", "R-1004", "dev.kapoor@example.edu"],
  ["Elina Chowdhury", "R-1005", "elina.chowdhury@example.edu"],
  ["Farhan Ahmed", "R-1006", "farhan.ahmed@example.edu"],
  ["Grace Mendez", "R-1007", "grace.mendez@example.edu"],
  ["Hasan Ali", "R-1008", "hasan.ali@example.edu"],
];

const MATH_MARKS = [
  ["R-1001", 92],
  ["R-1002", 92],
  ["R-1003", 88],
  ["R-1004", 76],
  ["R-1005", 76],
  ["R-1006", 64],
  ["R-1007", 51],
  ["R-1008", 39],
];

const PHYSICS_MARKS = [
  ["R-1008", 49],
  ["R-1007", 46],
  ["R-1006", 46],
  ["R-1005", 40],
  ["R-1004", 35],
  ["R-1003", 31],
  ["R-1002", 22],
  ["R-1001", 18],
];

async function ensureAdmin() {
  const username = String(process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "admin123");
  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists.`);
    return;
  }
  await Admin.create({ username, passwordHash: await bcrypt.hash(password, 10) });
  console.log(`Created admin "${username}".`);
}

async function seedSamples() {
  const [studentCount, examinationCount] = await Promise.all([
    Student.countDocuments(),
    Examination.countDocuments(),
  ]);
  if (studentCount > 0 || examinationCount > 0) {
    console.log("Sample students or examinations already exist, so sample results were left untouched.");
    return;
  }

  const studentPasswordHash = await bcrypt.hash(String(process.env.SEED_STUDENT_PASSWORD || "student123"), 10);
  const students = await Student.insertMany(
    SAMPLE_STUDENTS.map(([name, rollNumber, email]) => ({
      name,
      rollNumber,
      email,
      className: "10",
      section: "A",
      passwordHash: studentPasswordHash,
    })),
  );
  const byRoll = new Map(students.map((student) => [student.rollNumber, student]));

  const mathematics = await Examination.create({
    title: "Midterm Mathematics",
    subject: "Mathematics",
    examDate: new Date(Date.UTC(2026, 2, 12)),
    totalMarks: 100,
    description: "Class 10 midterm. Two students share the top mark.",
  });
  const physics = await Examination.create({
    title: "Final Physics",
    subject: "Physics",
    examDate: new Date(Date.UTC(2026, 5, 18)),
    totalMarks: 50,
    description: "Class 10 final. Ranked on this paper's total of 50, separate from Mathematics.",
  });

  const rowsFor = (examination, pairs) =>
    pairs.map(([rollNumber, marksObtained]) => ({
      student: byRoll.get(rollNumber)._id,
      examination: examination._id,
      marksObtained,
    }));

  await Result.insertMany([...rowsFor(mathematics, MATH_MARKS), ...rowsFor(physics, PHYSICS_MARKS)]);
  console.log(
    `Seeded 8 students, 2 examinations, and both result sets. Student password: "${process.env.SEED_STUDENT_PASSWORD || "student123"}" (dev placeholder).`,
  );
}

try {
  await connectDb();
  await ensureAdmin();
  await seedSamples();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
