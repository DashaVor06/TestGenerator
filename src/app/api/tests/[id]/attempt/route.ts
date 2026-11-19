// /api/tests/[id]/attempt — тест для прохождения (без правильных ответов).

import type { NextRequest } from "next/server";
import { getAttempt } from "@/application/use-cases/tests/get-attempt";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const attempt = await getAttempt(params.id, user.id, {
      tests: testRepository,
      questions: questionRepository,
    });

    return ok({ attempt });
  } catch (error) {
    return handleError(error);
  }
}
