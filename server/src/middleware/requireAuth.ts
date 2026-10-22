import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// To know req.userId can exist
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string };
    req.userId = payload.sub;
    next(); // token is valid, continue to the route
  } catch {
    res.status(401).json({ error: "Session expired, please log in again" });
  }
}