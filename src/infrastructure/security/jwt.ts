// Работа с JWT-токенами (инфраструктура).

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === "string") {
      return null;
    }
    const userId = (payload as { userId?: unknown }).userId;
    if (typeof userId !== "string") {
      return null;
    }
    return { userId };
  } catch {
    return null;
  }
}
