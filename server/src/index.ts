import express from "express";
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
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`HireOften API running on http://localhost:${PORT}`);
});