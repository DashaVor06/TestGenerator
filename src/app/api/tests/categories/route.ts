// /api/tests/categories — существующие категории тестов.
// ?scope=public — категории публичных тестов (доступно без входа),
// иначе — категории тестов текущего пользователя.

import type { NextRequest } from "next/server";
import { listTestCategories } from "@/application/use-cases/tests/list-test-categories";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope === "public") {
      const categories = await listTestCategories(
        { visibility: "PUBLIC" },
        { tests: testRepository }
      );
      return ok({ categories });
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const categories = await listTestCategories(
      { ownerId: user.id },
      { tests: testRepository }
    );
    return ok({ categories });
  } catch (error) {
    return handleError(error);
  }
}
