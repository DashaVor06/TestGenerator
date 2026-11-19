// /api/results — история прохождений текущего пользователя.

import { listResults } from "@/application/use-cases/results/list-results";
import { testResultRepository } from "@/infrastructure/persistence/prisma-test-result-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const results = await listResults(user.id, { results: testResultRepository });
    return ok({ results });
  } catch (error) {
    return handleError(error);
  }
}
