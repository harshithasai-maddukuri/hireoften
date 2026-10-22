import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in .env");
}
const JWT_SECRET = process.env.JWT_SECRET;

// Max 10 attempts per 15 minutes per IP: blocks brute-force guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

// Input rules
const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email").max(255)),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email")),
  password: z.string().min(1, "Password is required").max(72),
});

// Cookie settings, shared by login and logout
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

// Create a token and store it in a secure cookie
function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// POST /api/auth/signup
router.post("/signup", authLimiter, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash]
    );
    const user = result.rows[0];
    setAuthCookie(res, user.id);
    res.status(201).json({ user });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query(
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  const valid = user && (await bcrypt.compare(password, user.password_hash));

  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  setAuthCookie(res, user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
});

// GET /api/auth/me: returns the logged-in user
router.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [req.userId]
  );
  const user = result.rows[0];

  if (!user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  res.json({ user });
});

export default router;