// Use case: разбор ошибок по сохранённому результату.

import type { TestResultRepository } from "@/application/ports";
import type { AttemptResultDto } from "@/application/use-cases/tests/attempt-dto";
import { buildResultDto } from "@/application/use-cases/tests/attempt-dto";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface GetResultDeps {
  results: TestResultRepository;
}

export async function getResult(
  resultId: string,
  currentUserId: string,
  deps: GetResultDeps
): Promise<AttemptResultDto> {
  const details = await deps.results.findDetailed(resultId);
  if (!details) {
    throw new NotFoundError("Результат", resultId);
  }

  // Свой результат видит только его владелец.
  if (details.result.userId && details.result.userId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому результату");
  }

  return buildResultDto(
    details.test,
    details.result,
    details.questions,
    details.answers
  );
}
