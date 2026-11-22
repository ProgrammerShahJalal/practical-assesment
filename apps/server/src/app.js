import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { examinationsRouter } from "./routes/examinations.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { studentRouter } from "./routes/student.js";
import { studentsRouter } from "./routes/students.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // One trusted reverse proxy hop (Nginx on the VPS) so rate limiting sees
  // the client address instead of the proxy address.
  app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ data: { ok: true } });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/students", studentsRouter);
  app.use("/api/examinations", examinationsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/student", studentRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });
  app.use(errorHandler);
  return app;
}
