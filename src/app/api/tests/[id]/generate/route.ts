// /api/tests/[id]/generate — запуск генерации вопросов (асинхронно).

import type { NextRequest } from "next/server";
import { generateSchema } from "@/application/validation/generation";
import { generateTest } from "@/application/use-cases/tests/generate-test";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { questionGenerator } from "@/infrastructure/external/question-generator-factory";
import { socketNotifier } from "@/infrastructure/realtime/socket-notifier";
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
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
    }

    // Запуск генерации в фоне (fire-and-forget): статус пишется в БД,
    // о завершении пользователя уведомляет WebSocket.
    void generateTest(
      params.id,
      parsed.data.materialId,
      user.id,
      {
        count: parsed.data.count,
        types: parsed.data.types,
        difficulty: parsed.data.difficulty,
      },
      {
        tests: testRepository,
        materials: materialRepository,
        questions: questionRepository,
        generator: questionGenerator,
        notifier: socketNotifier,
      }
    ).catch((error) => {
      console.error("Generation failed:", error);
    });

    return ok({ status: "PROCESSING" }, 202);
  } catch (error) {
    return handleError(error);
  }
}
