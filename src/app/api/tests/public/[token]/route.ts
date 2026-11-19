// /api/tests/public/[token] — тест по короткой ссылке (доступен гостям).

import type { NextRequest } from "next/server";
import { getPublicTest } from "@/application/use-cases/public/get-public-test";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { questionRepository } from "@/infrastructure/persistence/prisma-question-repository";
import { handleError, ok } from "@/app/api/_lib/http";

interface RouteContext {
  params: { token: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const attempt = await getPublicTest(params.token, {
      tests: testRepository,
      questions: questionRepository,
    });

    return ok({ attempt });
  } catch (error) {
    return handleError(error);
  }
}
