import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { pool } from "./db.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Security and parsing middleware
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check route: also confirms the database is reachable
app.get("/api/health", async (_req: Request, res: Response) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "connected" });
});

// Auth routes: /api/auth/signup, /api/auth/login, /api/auth/logout
app.use("/api/auth", authRouter);

// 404 handler: runs when no route matched
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler: catches any error thrown in routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

// Start the server
app.listen(PORT, () => {
  if (process.env.NODE_ENV === "production") {
    console.log(`HireOften API running on port ${PORT}`);
  } else {
    console.log(`HireOften API running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  }
});