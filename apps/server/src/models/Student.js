import mongoose from "mongoose";

function hidePassword(_doc, ret) {
  delete ret.passwordHash;
  return ret;
}

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    className: { type: String, trim: true, default: "", maxlength: 40 },
    section: { type: String, trim: true, default: "", maxlength: 20 },
    // Optional: older students and the existing admin flow work without one.
    passwordHash: { type: String, select: false },
  },
  { timestamps: true },
);

studentSchema.set("toJSON", { transform: hidePassword });
studentSchema.set("toObject", { transform: hidePassword });

export const Student = mongoose.model("Student", studentSchema);
