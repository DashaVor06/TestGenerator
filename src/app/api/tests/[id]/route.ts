// /api/tests/[id] — получение (GET), обновление (PATCH), удаление (DELETE).
// Все операции доступны только автору теста.

import type { NextRequest } from "next/server";
import { updateTestSchema } from "@/application/validation/test";
import { getTest } from "@/application/use-cases/tests/get-test";
import { updateTest } from "@/application/use-cases/tests/update-test";
import { deleteTest } from "@/application/use-cases/tests/delete-test";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { badRequest, handleError, ok, unauthorized } from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const test = await getTest(params.id, user.id, {
      tests: testRepository,
      questions: questionRepository,
    });
    return ok({ test });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json().catch(() => null);
    const parsed = updateTestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const test = await updateTest(params.id, user.id, parsed.data, {
      tests: testRepository,
    });
    return ok({ test });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    await deleteTest(params.id, user.id, { tests: testRepository });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
