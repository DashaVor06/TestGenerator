// Хелперы аутентификации: cookie + получение текущего пользователя (presentation).

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { userRepository } from "@/infrastructure/persistence/prisma-user-repository";
import { verifyToken } from "@/infrastructure/security/jwt";
import type { User } from "@/domain/entities";

export const AUTH_COOKIE = "token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Публичное представление пользователя (без passwordHash). */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: User["role"];
  language: User["language"];
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    language: user.language,
    createdAt: user.createdAt,
  };
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/** Возвращает текущего пользователя по JWT из cookie, либо null (гость). */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  return userRepository.findById(payload.userId);
}
