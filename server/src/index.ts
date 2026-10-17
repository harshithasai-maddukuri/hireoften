import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4000;

// Security and parsing middleware
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

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
  console.log(`HireOften API running on port ${PORT}`);
});