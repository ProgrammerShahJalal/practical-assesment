import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    className: { type: String, trim: true, default: "", maxlength: 40 },
    section: { type: String, trim: true, default: "", maxlength: 20 },
  },
  { timestamps: true },
);

export const Student = mongoose.model("Student", studentSchema);
