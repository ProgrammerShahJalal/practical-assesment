import path from "node:path";
import { fileURLToPath } from "node:url";
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

function adminCredentials() {
  return {
    username: String(process.env.ADMIN_USERNAME || "admin").trim().toLowerCase(),
    password: String(process.env.ADMIN_PASSWORD || "admin123"),
  };
}

function studentPassword() {
  return String(process.env.SEED_STUDENT_PASSWORD || "student123");
}

async function ensureAdmin() {
  const { username, password } = adminCredentials();
  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists.`);
    return { username, password: null, created: false };
  }
  await Admin.create({ username, passwordHash: await bcrypt.hash(password, 10) });
  console.log(`Created admin "${username}".`);
  return { username, password, created: true };
}

// Older databases already contain the sample cohort from before the student
// panel existed. Give those students a dev password too, but never overwrite
// a password that was already set by an admin or by the student.
async function ensureSamplePasswords() {
  const rolls = SAMPLE_STUDENTS.map(([, rollNumber]) => rollNumber);
  const missing = await Student.find({
    rollNumber: { $in: rolls },
    $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }, { passwordHash: "" }],
  }).select("_id");
  if (!missing.length) return 0;

  const passwordHash = await bcrypt.hash(studentPassword(), 10);
  await Student.updateMany(
    { _id: { $in: missing.map((student) => student._id) } },
    { $set: { passwordHash } },
  );
  console.log(`Set a dev password on ${missing.length} existing sample student(s).`);
  return missing.length;
}

async function seedSamples() {
  const [studentCount, examinationCount] = await Promise.all([
    Student.countDocuments(),
    Examination.countDocuments(),
  ]);
  if (studentCount > 0 || examinationCount > 0) {
    console.log("Sample students or examinations already exist, so sample results were left untouched.");
    return { studentsAdded: 0, examinationsAdded: 0, resultsAdded: 0 };
  }

  const studentPasswordHash = await bcrypt.hash(studentPassword(), 10);
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

  const rows = [...rowsFor(mathematics, MATH_MARKS), ...rowsFor(physics, PHYSICS_MARKS)];
  await Result.insertMany(rows);
  console.log(
    `Seeded ${students.length} students, 2 examinations, and both result sets. Student password: "${studentPassword()}" (dev placeholder).`,
  );
  return {
    studentsAdded: students.length,
    examinationsAdded: 2,
    resultsAdded: rows.length,
  };
}

async function performSeed() {
  if (mongoose.connection.readyState !== 1) await connectDb();

  const admin = await ensureAdmin();
  const samplePasswordsAdded = await ensureSamplePasswords();
  const samples = await seedSamples();
  const studentsReady = samples.studentsAdded > 0 || samplePasswordsAdded > 0;

  // Only hand back passwords we actually set. If an account already exists we
  // never claim to know its password.
  return {
    adminUsername: admin.username,
    adminPassword: admin.created ? admin.password : null,
    adminCreated: admin.created,
    studentUsername: SAMPLE_STUDENTS[0][1],
    studentPassword: studentsReady ? studentPassword() : null,
    samplePasswordsAdded,
    ...samples,
  };
}

// Shared by the CLI script and the one-click setup endpoint. Reusing one
// promise keeps a double-click (or two visitors) from inserting the same
// cohort twice.
let running = null;
export function runSeed() {
  if (!running) {
    running = performSeed().finally(() => {
      running = null;
    });
  }
  return running;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const result = await runSeed();
    console.log(
      `Setup complete. Admin: ${result.adminUsername}${result.adminPassword ? ` / ${result.adminPassword}` : " (password unchanged)"}`,
    );
    console.log(
      `Students added: ${result.studentsAdded}, examinations added: ${result.examinationsAdded}, results added: ${result.resultsAdded}.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
