// /api/tests/[id]/questions/[questionId] — редактирование и удаление вопроса.

import type { NextRequest } from "next/server";
import { updateQuestionSchema } from "@/application/validation/question";
import { updateQuestion } from "@/application/use-cases/tests/update-question";
import { deleteQuestion } from "@/application/use-cases/tests/delete-question";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { badRequest, handleError, ok, unauthorized } from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string; questionId: string };
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json().catch(() => null);
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const question = await updateQuestion(params.questionId, user.id, parsed.data, {
      tests: testRepository,
      questions: questionRepository,
    });

    return ok({ question });
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

    await deleteQuestion(params.questionId, user.id, {
      tests: testRepository,
      questions: questionRepository,
    });

    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
