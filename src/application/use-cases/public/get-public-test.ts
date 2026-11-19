// Use case: публичный тест по короткой ссылке (доступен и гостям).

import type {
  QuestionRepository,
  TestRepository,
} from "@/application/ports";
import type { AttemptTestDto } from "@/application/use-cases/tests/attempt-dto";
import { buildAttemptDto } from "@/application/use-cases/tests/attempt-dto";
import { NotFoundError, ValidationError } from "@/domain/errors/domain-error";

export interface GetPublicTestDeps {
  tests: TestRepository;
  questions: QuestionRepository;
}

export async function getPublicTest(
  token: string,
  deps: GetPublicTestDeps
): Promise<AttemptTestDto> {
  const test = await deps.tests.findByShareToken(token);

  // Приватный тест по ссылке недоступен, а несуществующий — тоже.
  if (!test || test.visibility === "PRIVATE") {
    throw new NotFoundError("Тест", token);
  }

  const questions = await deps.questions.listByTestWithOptions(test.id);
  if (questions.length === 0) {
    throw new ValidationError("В тесте пока нет вопросов");
  }

  return buildAttemptDto(test, questions);
}
