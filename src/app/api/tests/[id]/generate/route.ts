// /api/tests/[id]/generate — запуск генерации вопросов.
//
// Запрос возвращает ответ сразу (202), а генерация идёт в фоне:
// статус теста пишется в БД, о завершении сообщает WebSocket.
// Это не блокирует интерфейс и не упирается в таймаут HTTP.

import type { NextRequest } from "next/server";
import { generateSchema } from "@/application/validation/generation";
import { generateTest } from "@/application/use-cases/tests/generate-test";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { generationRepository } from "@/infrastructure/persistence/prisma-generation-repository";
import { questionGenerator } from "@/infrastructure/external/question-generator-factory";
import { notificationService } from "@/infrastructure/realtime/notification-service";
import { checkRateLimit } from "@/infrastructure/security/rate-limiter";
import { config } from "@/config";
import { getCurrentUser } from "@/app/api/_lib/auth";
import {
  badRequest,
  handleError,
  ok,
  tooManyRequests,
  unauthorized,
} from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Защита от случайного перерасхода денег на ИИ.
    const limit = checkRateLimit(
      `generate:${user.id}`,
      config.limits.generationsPerHour
    );
    if (!limit.allowed) {
      return tooManyRequests(
        `Слишком много генераций. Повторите через ${limit.retryAfterSeconds} с`,
        limit.retryAfterSeconds
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    // Генерация в фоне: ответ пользователю приходит сразу.
    void generateTest(
      params.id,
      user.id,
      {
        materialId: parsed.data.materialId,
        typeCounts: parsed.data.typeCounts,
        difficulty: parsed.data.difficulty ?? null,
        thinkingCount: parsed.data.thinkingCount,
        language: parsed.data.language,
      },
      {
        tests: testRepository,
        materials: materialRepository,
        questions: questionRepository,
        generator: questionGenerator,
        notifier: notificationService,
        generations: generationRepository,
      }
    ).catch((error) => {
      console.error("Ошибка генерации теста:", error);
    });

    return ok({ status: "PROCESSING" }, 202);
  } catch (error) {
    return handleError(error);
  }
}
