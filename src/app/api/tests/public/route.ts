// /api/tests/public — каталог публичных тестов (доступен гостям).

import type { NextRequest } from "next/server";
import { publicCatalogQuerySchema } from "@/application/validation/test";
import { listPublicTests } from "@/application/use-cases/public/list-public-tests";
import { testRepository } from "@/infrastructure/persistence/prisma-test-repository";
import { badRequest, handleError, ok } from "@/app/api/_lib/http";

export async function GET(request: NextRequest) {
  try {
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = publicCatalogQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const result = await listPublicTests(parsed.data, { tests: testRepository });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
