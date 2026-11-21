import mongoose from "mongoose";

const examinationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    examDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true, min: 0.01 },
    description: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { timestamps: true },
);

export const Examination = mongoose.model("Examination", examinationSchema);
