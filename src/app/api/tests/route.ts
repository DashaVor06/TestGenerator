// /api/tests — список тестов пользователя (GET) и создание (POST).

import type { NextRequest } from "next/server";
import { createTestSchema, listTestsQuerySchema } from "@/application/validation/test";
import { createTest } from "@/application/use-cases/tests/create-test";
import { listTests } from "@/application/use-cases/tests/list-tests";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { badRequest, created, handleError, ok, unauthorized } from "@/app/api/_lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listTestsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const tests = await listTests(user.id, parsed.data, { tests: testRepository });
    return ok({ tests });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json().catch(() => null);
    const parsed = createTestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const test = await createTest(user.id, parsed.data, { tests: testRepository });
    return created({ test });
  } catch (error) {
    return handleError(error);
  }
}
