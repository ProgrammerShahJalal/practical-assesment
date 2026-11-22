import mongoose from "mongoose";
import { roundTo } from "./ranking.js";

function requiredString(value, field, max) {
  const text = String(value ?? "").trim();
  if (!text) return { error: `${field} is required.` };
  if (text.length > max) return { error: `${field} must be at most ${max} characters.` };
  return { value: text };
}

function optionalString(value, field, max) {
  const text = String(value ?? "").trim();
  if (text.length > max) return { error: `${field} must be at most ${max} characters.` };
  return { value: text };
}

export function parseEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return { value: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email is invalid." };
  return { value: email };
}

export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return { error: "Exam date is invalid." };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: "Exam date is invalid." };
  }
  return { value: date };
}

export function parseTotalMarks(value) {
  const total = Number(value);
  if (!Number.isFinite(total)) return { error: "Total marks must be a number." };
  const rounded = roundTo(total);
  if (rounded <= 0) return { error: "Total marks must be greater than zero." };
  if (rounded > 10000) return { error: "Total marks must be 10000 or less." };
  return { value: rounded };
}

export function parseMarks(value, totalMarks) {
  if (value === null || value === undefined) return { value: null };
  if (typeof value === "string" && value.trim() === "") return { value: null };
  const marks = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(marks)) return { error: "Marks must be a number." };
  const rounded = roundTo(marks);
  if (rounded < 0) return { error: "Marks cannot be negative." };
  if (rounded > Number(totalMarks)) {
    return { error: `Marks cannot exceed the examination total of ${totalMarks}.` };
  }
  return { value: rounded };
}

export function parseStudent(body = {}) {
  const name = requiredString(body.name, "Name", 120);
  if (name.error) return name;
  const rollNumber = requiredString(body.rollNumber, "Roll number", 40);
  if (rollNumber.error) return rollNumber;
  const email = parseEmail(body.email);
  if (email.error) return email;
  const className = optionalString(body.className, "Class", 40);
  if (className.error) return className;
  const section = optionalString(body.section, "Section", 20);
  if (section.error) return section;

  return {
    value: {
      name: name.value,
      rollNumber: rollNumber.value.toUpperCase(),
      email: email.value,
      className: className.value,
      section: section.value,
    },
  };
}

export function parseExamination(body = {}) {
  const title = requiredString(body.title, "Title", 160);
  if (title.error) return title;
  const subject = requiredString(body.subject, "Subject", 80);
  if (subject.error) return subject;
  const examDate = parseDateOnly(body.examDate);
  if (examDate.error) return examDate;
  const totalMarks = parseTotalMarks(body.totalMarks);
  if (totalMarks.error) return totalMarks;
  const description = optionalString(body.description, "Description", 500);
  if (description.error) return description;

  return {
    value: {
      title: title.value,
      subject: subject.value,
      examDate: examDate.value,
      totalMarks: totalMarks.value,
      description: description.value,
    },
  };
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Blank means "leave the current password alone" for the admin student form.
export function parsePassword(value) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { error: "Password must be text." };
  }
  const password = value === undefined || value === null ? "" : value;
  if (!password) return { value: "" };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 128) return { error: "Password must be at most 128 characters." };
  return { value: password };
}

export function parseObjectId(value, label = "id") {
  const id = String(value ?? "");
  if (!mongoose.isValidObjectId(id)) return { error: `Invalid ${label}.` };
  return { value: id };
}

export function parsePagination(query = {}) {
  const page = Number.parseInt(String(query.page ?? "1"), 10);
  const limit = Number.parseInt(String(query.limit ?? "10"), 10);
  if (!Number.isInteger(page) || page < 1) return { error: "Page must be a positive number." };
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return { error: "Limit must be between 1 and 50." };
  }
  return { value: { page, limit } };
}
