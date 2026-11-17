// /api/tests/[id]/submit — сдача теста и подсчёт результата.

import type { NextRequest } from "next/server";
import { submitAnswersSchema } from "@/application/validation/submit";
import { submitAnswers } from "@/application/use-cases/tests/submit-answers";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { testResultRepository } from "@/infrastructure/persistence/prisma-test-result-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { badRequest, handleError, ok, unauthorized } from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json().catch(() => null);
    const parsed = submitAnswersSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const result = await submitAnswers(params.id, user.id, parsed.data, {
      tests: testRepository,
      questions: questionRepository,
      results: testResultRepository,
    });

    return ok({ result });
  } catch (error) {
    return handleError(error);
  }
}
