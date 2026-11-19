// /api/results/[id] — подробный разбор ошибок по результату.

import type { NextRequest } from "next/server";
import { getResult } from "@/application/use-cases/results/get-result";
import { testResultRepository } from "@/infrastructure/persistence/prisma-test-result-repository";
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

    const result = await getResult(params.id, user.id, {
      results: testResultRepository,
    });

    return ok({ result });
  } catch (error) {
    return handleError(error);
  }
}
