// /api/profile/language — сохранение выбранного языка интерфейса.

import type { NextRequest } from "next/server";
import { z } from "zod";
import { updateLanguage } from "@/application/use-cases/auth/update-language";
import { userRepository } from "@/infrastructure/persistence/prisma-user-repository";
import { getCurrentUser, toPublicUser } from "@/app/api/_lib/auth";
import { badRequest, handleError, ok, unauthorized } from "@/app/api/_lib/http";

const schema = z.object({
  language: z.enum(["RU", "EN"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Некорректный язык интерфейса");
    }

    const updated = await updateLanguage(user.id, parsed.data.language, {
      users: userRepository,
    });

    return ok({ user: toPublicUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
