// POST /api/auth/register — регистрация пользователя.

import type { NextRequest } from "next/server";
import { registerSchema } from "@/application/validation/auth";
import { registerUser } from "@/application/use-cases/auth/register-user";
import { userRepository } from "@/infrastructure/persistence/prisma-user-repository";
import { passwordHasher } from "@/infrastructure/security/bcrypt-password-hasher";
import { signToken } from "@/infrastructure/security/jwt";
import { badRequest, created, handleError } from "@/app/api/_lib/http";
import { setAuthCookie, toPublicUser } from "@/app/api/_lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join("; ");
      return badRequest(message);
    }

    const user = await registerUser(parsed.data, {
      users: userRepository,
      hasher: passwordHasher,
    });

    const token = signToken(user.id);
    const response = created({ user: toPublicUser(user) });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return handleError(error);
  }
}
