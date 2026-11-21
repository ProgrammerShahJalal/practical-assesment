import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    examination: { type: mongoose.Schema.Types.ObjectId, ref: "Examination", required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    remarks: { type: String, trim: true, default: "", maxlength: 240 },
  },
  { timestamps: true },
);

resultSchema.index({ student: 1, examination: 1 }, { unique: true });
resultSchema.index({ examination: 1, marksObtained: -1 });

export const Result = mongoose.model("Result", resultSchema);
