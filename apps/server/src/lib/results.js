import { Result } from "../models/Result.js";

export async function resultCounts() {
  const counts = await Result.aggregate([{ $group: { _id: "$examination", count: { $sum: 1 } } }]);
  return new Map(counts.map((row) => [String(row._id), row.count]));
}
