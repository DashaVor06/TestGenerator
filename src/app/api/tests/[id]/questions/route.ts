// /api/tests/[id]/questions — добавление вопроса вручную.

import type { NextRequest } from "next/server";
import { createQuestionSchema } from "@/application/validation/question";
import { addQuestion } from "@/application/use-cases/tests/add-question";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { badRequest, created, handleError, unauthorized } from "@/app/api/_lib/http";

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
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const question = await addQuestion(params.id, user.id, parsed.data, {
      tests: testRepository,
      questions: questionRepository,
    });

    return created({ question });
  } catch (error) {
    return handleError(error);
  }
}
