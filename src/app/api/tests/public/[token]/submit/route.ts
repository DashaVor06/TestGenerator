// /api/tests/public/[token]/submit — сдача теста по ссылке.
// Гость указывает имя, авторизованный пользователь сохраняет результат в профиль.

import type { NextRequest } from "next/server";
import { publicSubmitSchema } from "@/application/validation/submit";
import { submitPublicAttempt } from "@/application/use-cases/public/submit-public-attempt";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { testResultRepository } from "@/infrastructure/persistence/prisma-test-result-repository";
import { checkRateLimit } from "@/infrastructure/security/rate-limiter";
import { getCurrentUser } from "@/app/api/_lib/auth";
import {
  badRequest,
  handleError,
  ok,
  tooManyRequests,
} from "@/app/api/_lib/http";

interface RouteContext {
  params: { token: string };
}

/** Простой ключ для ограничения частоты: IP клиента. */
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const limit = checkRateLimit(`public-submit:${clientKey(request)}`, 30);
    if (!limit.allowed) {
      return tooManyRequests(
        "Слишком много попыток. Попробуйте позже",
        limit.retryAfterSeconds
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = publicSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const user = await getCurrentUser();

    const result = await submitPublicAttempt(params.token, user?.id ?? null, parsed.data, {
      tests: testRepository,
      questions: questionRepository,
      results: testResultRepository,
    });

    return ok({ result });
  } catch (error) {
    return handleError(error);
  }
}
