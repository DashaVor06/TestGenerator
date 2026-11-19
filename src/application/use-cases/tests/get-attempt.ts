// Use case: прохождение теста автором (или теста, открытого по ссылке).

import type {
  QuestionRepository,
  TestRepository,
} from "@/application/ports";
import type { AttemptTestDto } from "./attempt-dto";
import { buildAttemptDto } from "./attempt-dto";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/domain-error";

export interface GetAttemptDeps {
  tests: TestRepository;
  questions: QuestionRepository;
}

export async function getAttempt(
  testId: string,
  currentUserId: string,
  deps: GetAttemptDeps
): Promise<AttemptTestDto> {
  const test = await deps.tests.findById(testId);
  if (!test) {
    throw new NotFoundError("Тест", testId);
  }

  if (test.ownerId !== currentUserId && test.visibility === "PRIVATE") {
    throw new ForbiddenError("Нет доступа к этому тесту");
  }

  const questions = await deps.questions.listByTestWithOptions(testId);
  if (questions.length === 0) {
    throw new ValidationError("В тесте пока нет вопросов");
  }

  return buildAttemptDto(test, questions);
}
