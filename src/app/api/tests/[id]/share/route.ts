// /api/tests/[id]/share — смена приватности теста и выдача ссылки.

import type { NextRequest } from "next/server";
import { shareTestSchema } from "@/application/validation/test";
import { shareTest } from "@/application/use-cases/tests/share-test";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { createShareToken } from "@/infrastructure/security/share-token";
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
    const parsed = shareTestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const test = await shareTest(params.id, user.id, parsed.data, {
      tests: testRepository,
      createToken: createShareToken,
    });

    return ok({ test });
  } catch (error) {
    return handleError(error);
  }
}
