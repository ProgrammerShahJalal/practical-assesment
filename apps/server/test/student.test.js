import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

process.env.JWT_SECRET = "unit-test-admin-secret-not-for-production";
process.env.STUDENT_JWT_SECRET = "unit-test-student-secret-not-for-production";
process.env.TRUST_PROXY = "0";

const { createApp } = await import("../src/app.js");
const { Admin } = await import("../src/models/Admin.js");
const { Examination } = await import("../src/models/Examination.js");
const { Result } = await import("../src/models/Result.js");
const { Student } = await import("../src/models/Student.js");
const { resetLoginLimiter } = await import("../src/middleware/rateLimit.js");

const oid = () => new mongoose.Types.ObjectId();
const hash = (value) => bcrypt.hashSync(value, 10);
const STUDENT_PASSWORD = "StudentPass123!";
const OTHER_PASSWORD = "OtherPass123!";
const NO_RESULT_PASSWORD = "NoResult123!";
const ADMIN_PASSWORD = "AdminPass123!";

const examA = {
  _id: oid(),
  title: "Midterm Mathematics",
  subject: "Mathematics",
  examDate: new Date(Date.UTC(2026, 2, 12)),
  totalMarks: 100,
  description: "",
};
const examB = {
  _id: oid(),
  title: "Final Physics",
  subject: "Physics",
  examDate: new Date(Date.UTC(2026, 5, 18)),
  totalMarks: 50,
  description: "",
};

const studentA = {
  _id: oid(), name: "Ayesha Rahman", rollNumber: "R-1001", email: "ayesha@example.edu",
  className: "10", section: "A", passwordHash: hash(STUDENT_PASSWORD),
};
const studentB = {
  _id: oid(), name: "Bilal Hossain", rollNumber: "R-1002", email: "bilal@example.edu",
  className: "10", section: "A", passwordHash: hash(STUDENT_PASSWORD),
};
const studentC = {
  _id: oid(), name: "Chitra Das", rollNumber: "R-1003", email: "chitra@example.edu",
  className: "10", section: "A", passwordHash: hash(STUDENT_PASSWORD),
};
const studentD = {
  _id: oid(), name: "Dev Kapoor", rollNumber: "R-1004", email: "dev@example.edu",
  className: "10", section: "A", passwordHash: hash(STUDENT_PASSWORD),
};
const studentE = {
  _id: oid(), name: "Elina Chowdhury", rollNumber: "R-1005", email: "elina@example.edu",
  className: "10", section: "A", passwordHash: hash(STUDENT_PASSWORD),
};
const noResultStudent = {
  _id: oid(), name: "No Results", rollNumber: "R-1009", email: "none@example.edu",
  className: "10", section: "A", passwordHash: hash(NO_RESULT_PASSWORD),
};

const admin = { _id: oid(), username: "admin", passwordHash: hash(ADMIN_PASSWORD) };

let examinations = [{ ...examA }, { ...examB }];
let students = [studentA, studentB, studentC, studentD, studentE, noResultStudent].map((row) => ({ ...row }));
let results = [
  { _id: oid(), student: studentA._id, examination: examA._id, marksObtained: 92, remarks: "" },
  { _id: oid(), student: studentB._id, examination: examA._id, marksObtained: 92, remarks: "" },
  { _id: oid(), student: studentC._id, examination: examA._id, marksObtained: 88, remarks: "" },
  { _id: oid(), student: studentD._id, examination: examA._id, marksObtained: 76, remarks: "" },
  { _id: oid(), student: studentA._id, examination: examB._id, marksObtained: 18, remarks: "" },
];

// Minimal query stand-in: awaits like a promise but also supports the
// populate/select/sort/lean chain used by the routes.
function query(value, leanValue = value) {
  const promise = Promise.resolve(value);
  promise.lean = async () => leanValue;
  promise.select = () => promise;
  promise.populate = () => promise;
  promise.sort = () => promise;
  promise.limit = () => promise;
  return promise;
}

function examDocument(exam) {
  return {
    ...exam,
    set(fields) {
      Object.assign(this, fields);
      return this;
    },
    async save() {
      const index = examinations.findIndex((row) => String(row._id) === String(exam._id));
      if (index >= 0) examinations[index] = { ...examinations[index], ...this };
      return this;
    },
  };
}

function studentDocument(row) {
  return {
    ...row,
    async save() {
      const index = students.findIndex((item) => String(item._id) === String(row._id));
      if (index >= 0) students[index] = { ...students[index], passwordHash: this.passwordHash };
      return this;
    },
  };
}

function matchesExam(resultId, examId) {
  return String(resultId) === String(examId);
}

mock.method(Admin, "findOne", async (filter) => (filter.username === admin.username ? { ...admin } : null));

mock.method(Student, "findOne", (filter) => {
  const found = students.find((row) => row.rollNumber === String(filter.rollNumber || "").toUpperCase());
  return query(found ? { ...found } : null);
});

mock.method(Student, "findById", (id) => {
  const found = students.find((row) => String(row._id) === String(id));
  return query(found ? studentDocument(found) : null, found ? { ...found } : null);
});

mock.method(Student, "find", (filter = {}) => {
  const ids = filter?._id?.$in || [];
  return query(students.filter((row) => ids.some((id) => String(id) === String(row._id))).map((row) => ({ ...row, _id: row._id })));
});

mock.method(Student, "create", async (fields) => {
  const doc = new Student({ ...fields, _id: oid() });
  students.push({ ...fields, _id: doc._id });
  return doc;
});

mock.method(Student, "findByIdAndUpdate", async (id, fields) => {
  const index = students.findIndex((row) => String(row._id) === String(id));
  if (index < 0) return null;
  students[index] = { ...students[index], ...fields };
  return new Student(students[index]);
});

mock.method(Student, "countDocuments", async () => students.length);

mock.method(Examination, "findById", (id) => {
  const found = examinations.find((row) => String(row._id) === String(id));
  return query(found ? examDocument(found) : null, found ? { ...found } : null);
});

mock.method(Examination, "find", () => query(examinations.map((row) => ({ ...row }))));
mock.method(Examination, "countDocuments", async () => examinations.length);

mock.method(Result, "find", (filter = {}) => {
  let rows = [...results];
  if (filter.student) rows = rows.filter((row) => String(row.student) === String(filter.student));
  if (filter.examination?.$in) {
    rows = rows.filter((row) => filter.examination.$in.some((id) => String(id) === String(row.examination)));
  } else if (filter.examination) {
    rows = rows.filter((row) => String(row.examination) === String(filter.examination));
  }
  const populated = rows.map((row) => ({
    ...row,
    student: students.find((item) => String(item._id) === String(row.student)) || null,
    examination: examinations.find((item) => String(item._id) === String(row.examination)) || null,
  }));
  return query(populated);
});

mock.method(Result, "aggregate", async () => {
  const counts = new Map();
  for (const row of results) {
    const key = String(row.examination);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].map(([_id, count]) => ({ _id, count }));
});

mock.method(Result, "countDocuments", async (filter = {}) =>
  results.filter((row) => !filter.examination || matchesExam(row.examination, filter.examination)).length,
);

mock.method(Result, "deleteOne", async (filter) => {
  const before = results.length;
  results = results.filter(
    (row) =>
      !matchesExam(row.examination, filter.examination) ||
      String(row.student) !== String(filter.student),
  );
  return { deletedCount: before - results.length };
});

mock.method(Result, "findOneAndUpdate", async (filter, update) => {
  const existing = results.find(
    (row) => matchesExam(row.examination, filter.examination) && String(row.student) === String(filter.student),
  );
  if (existing) Object.assign(existing, update);
  else results.push({ _id: oid(), ...filter, ...update });
  return existing || results[results.length - 1];
});

const server = createApp().listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function request(path, { method = "GET", token, body, forwardedFor } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined || method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function login(registrationNumber, password) {
  const response = await request("/api/student/auth/login", {
    method: "POST",
    body: { registrationNumber, password },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.data.token;
}

async function adminLogin() {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { username: "admin", password: ADMIN_PASSWORD },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.data.token;
}

after(() => {
  server.close();
  mock.restoreAll();
});

test("student login succeeds with a registration number and fails generically", async () => {
  resetLoginLimiter();
  const success = await request("/api/student/auth/login", {
    method: "POST",
    body: { registrationNumber: "r-1001", password: STUDENT_PASSWORD },
  });
  assert.equal(success.status, 200);
  assert.ok(success.body.data.token);
  assert.equal(success.body.data.student.registrationNumber, "R-1001");
  assert.equal(success.body.data.student.name, "Ayesha Rahman");

  const wrongPassword = await request("/api/student/auth/login", {
    method: "POST",
    body: { registrationNumber: "R-1001", password: "wrong-password" },
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error, "Invalid registration number or password.");

  const unknownStudent = await request("/api/student/auth/login", {
    method: "POST",
    body: { registrationNumber: "R-9999", password: STUDENT_PASSWORD },
  });
  assert.equal(unknownStudent.status, 401);
  assert.equal(unknownStudent.body.error, wrongPassword.body.error);

  const missing = await request("/api/student/auth/login", { method: "POST", body: { registrationNumber: "R-1001" } });
  assert.equal(missing.status, 400);
});

test("student and admin tokens cannot cross roles", async () => {
  resetLoginLimiter();
  const studentToken = await login("R-1001", STUDENT_PASSWORD);
  const adminToken = await adminLogin();

  const adminRouteWithStudentToken = await request("/api/auth/me", { token: studentToken });
  assert.equal(adminRouteWithStudentToken.status, 401);
  for (const [path, method] of [
    ["/api/students", "POST"],
    [`/api/examinations/${examA._id}`, "PUT"],
    [`/api/examinations/${examA._id}/results`, "PUT"],
    [`/api/leaderboard/${examA._id}`, "GET"],
    ["/api/dashboard", "GET"],
  ]) {
    const blocked = await request(path, { method, token: studentToken, body: {} });
    assert.equal(blocked.status, 401, path);
  }

  const studentRouteWithAdminToken = await request("/api/student/me", { token: adminToken });
  assert.equal(studentRouteWithAdminToken.status, 401);
  const studentLeaderboardWithAdminToken = await request(`/api/student/leaderboard/${examA._id}`, {
    token: adminToken,
  });
  assert.equal(studentLeaderboardWithAdminToken.status, 401);

  const noToken = await request("/api/student/results");
  assert.equal(noToken.status, 401);

  const ownProfile = await request("/api/student/me", { token: studentToken });
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.body.data.registrationNumber, "R-1001");
});

test("a student only receives their own results and ignores a supplied studentId", async () => {
  resetLoginLimiter();
  const studentToken = await login("R-1001", STUDENT_PASSWORD);
  const otherToken = await login("R-1002", STUDENT_PASSWORD);

  const mine = await request("/api/student/results", { token: studentToken });
  assert.equal(mine.status, 200);
  assert.deepEqual(
    mine.body.data.items.map((row) => row.examTitle),
    ["Final Physics", "Midterm Mathematics"],
  );
  assert.equal(mine.body.data.pagination.total, 2);

  const attemptedCrossAccess = await request("/api/student/results?studentId=" + String(studentB._id), {
    token: studentToken,
  });
  assert.deepEqual(attemptedCrossAccess.body.data.items, mine.body.data.items);

  const oneExam = await request(`/api/student/results/${examB._id}`, { token: studentToken });
  assert.equal(oneExam.status, 200);
  assert.equal(oneExam.body.data.result.marksObtained, 18);
  assert.equal(JSON.stringify(oneExam.body).includes("Bilal Hossain"), false);

  const otherStudent = await request(`/api/student/results/${examB._id}`, { token: otherToken });
  assert.equal(otherStudent.status, 404);

  const noResultToken = await login("R-1009", NO_RESULT_PASSWORD);
  const empty = await request("/api/student/dashboard", { token: noResultToken });
  assert.equal(empty.body.data.totalExamsAttempted, 0);
  assert.equal(empty.body.data.latestResult, null);
  const emptyExam = await request(`/api/student/results/${examA._id}`, { token: noResultToken });
  assert.equal(emptyExam.status, 404);
});

test("leaderboard uses the shared ranking logic, ties, and hides private fields", async () => {
  resetLoginLimiter();
  const token = await login("R-1001", STUDENT_PASSWORD);
  const board = await request(`/api/student/leaderboard/${examA._id}`, { token });
  assert.equal(board.status, 200);

  const standings = board.body.data.standings;
  assert.deepEqual(
    standings.map((row) => [row.rank, row.rollNumber, row.marksObtained]),
    [
      [1, "R-1001", 92],
      [1, "R-1002", 92],
      [3, "R-1003", 88],
      [4, "R-1004", 76],
    ],
  );
  assert.equal(standings.find((row) => row.isMe).rollNumber, "R-1001");
  assert.equal(board.body.data.myRank, 1);
  assert.deepEqual(Object.keys(standings[0]).sort(), [
    "isMe", "marksObtained", "percentage", "rank", "rollNumber", "studentName", "totalMarks",
  ]);
  assert.equal(JSON.stringify(board.body).includes("ayesha@example.edu"), false);

  const badId = await request("/api/student/leaderboard/not-an-id", { token });
  assert.equal(badId.status, 400);
  const missing = await request(`/api/student/leaderboard/${oid()}`, { token });
  assert.equal(missing.status, 404);
});

test("leaderboard stays correct after an admin creates, updates, and deletes a result", async () => {
  resetLoginLimiter();
  const studentToken = await login("R-1001", STUDENT_PASSWORD);
  const adminToken = await adminLogin();
  const path = `/api/examinations/${examA._id}/results`;

  const ranks = async () => {
    const board = await request(`/api/student/leaderboard/${examA._id}`, { token: studentToken });
    assert.equal(board.status, 200);
    return board.body.data.standings.map((row) => [row.rank, row.rollNumber]);
  };

  assert.deepEqual(await ranks(), [[1, "R-1001"], [1, "R-1002"], [3, "R-1003"], [4, "R-1004"]]);

  const created = await request(path, {
    method: "PUT",
    token: adminToken,
    body: { entries: [{ studentId: String(studentE._id), marksObtained: 95, remarks: "" }] },
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.deepEqual(await ranks(), [
    [1, "R-1005"], [2, "R-1001"], [2, "R-1002"], [4, "R-1003"], [5, "R-1004"],
  ]);

  const updated = await request(path, {
    method: "PUT",
    token: adminToken,
    body: { entries: [{ studentId: String(studentE._id), marksObtained: 90, remarks: "" }] },
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(await ranks(), [
    [1, "R-1001"], [1, "R-1002"], [3, "R-1005"], [4, "R-1003"], [5, "R-1004"],
  ]);

  const deleted = await request(path, {
    method: "PUT",
    token: adminToken,
    body: { entries: [{ studentId: String(studentE._id), marksObtained: null, remarks: "" }] },
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(await ranks(), [[1, "R-1001"], [1, "R-1002"], [3, "R-1003"], [4, "R-1004"]]);
});

test("passwords never appear in responses and can be changed safely", async () => {
  resetLoginLimiter();
  const adminToken = await adminLogin();
  const created = await request("/api/students", {
    method: "POST",
    token: adminToken,
    body: { name: "New Student", rollNumber: "R-1010", email: "", password: "BrandNew123!" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(JSON.stringify(created.body).includes("passwordHash"), false);
  assert.equal(JSON.stringify(created.body).includes("BrandNew123!"), false);

  const updated = await request(`/api/students/${studentC._id}`, {
    method: "PUT",
    token: adminToken,
    body: { name: "Chitra Das", rollNumber: "R-1003", password: "AnotherPass123!" },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(JSON.stringify(updated.body).includes("passwordHash"), false);

  const token = await login("R-1010", "BrandNew123!");
  for (const path of ["/api/student/me", "/api/student/dashboard", "/api/student/results", "/api/student/exams"]) {
    const response = await request(path, { token });
    assert.equal(response.status, 200, path);
    assert.equal(JSON.stringify(response.body).includes("passwordHash"), false, path);
    assert.equal(JSON.stringify(response.body).includes("BrandNew123!"), false, path);
  }

  const badCurrent = await request("/api/student/me/password", {
    method: "PATCH",
    token,
    body: { currentPassword: "wrong", newPassword: "ChangedPass123!", confirmPassword: "ChangedPass123!" },
  });
  assert.equal(badCurrent.status, 400);

  const mismatch = await request("/api/student/me/password", {
    method: "PATCH",
    token,
    body: { currentPassword: "BrandNew123!", newPassword: "ChangedPass123!", confirmPassword: "other" },
  });
  assert.equal(mismatch.status, 400);

  const changed = await request("/api/student/me/password", {
    method: "PATCH",
    token,
    body: { currentPassword: "BrandNew123!", newPassword: "ChangedPass123!", confirmPassword: "ChangedPass123!" },
  });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.equal(JSON.stringify(changed.body).includes("passwordHash"), false);

  const oldLogin = await request("/api/student/auth/login", {
    method: "POST",
    body: { registrationNumber: "R-1010", password: "BrandNew123!" },
  });
  assert.equal(oldLogin.status, 401);
  const newLogin = await login("R-1010", "ChangedPass123!");
  assert.ok(newLogin);
});

test("student login is rate limited", async () => {
  resetLoginLimiter();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request("/api/student/auth/login", {
      method: "POST",
      body: { registrationNumber: "R-1001", password: "nope" },
    });
    assert.equal(response.status, 401);
  }
  const limited = await request("/api/student/auth/login", {
    method: "POST",
    body: { registrationNumber: "R-1001", password: STUDENT_PASSWORD },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error, "Too many sign-in attempts. Try again later.");
  resetLoginLimiter();
});
