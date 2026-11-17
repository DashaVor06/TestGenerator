// GET /api/auth/me — текущий пользователь (защищённый маршрут).

import type { NextRequest } from "next/server";
import { getCurrentUser, toPublicUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }
    return ok({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}
