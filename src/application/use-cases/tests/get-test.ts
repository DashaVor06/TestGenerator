// Use case: получение теста с вопросами (с проверкой авторства).

import type {
  QuestionRepository,
  TestRepository,
  TestWithQuestions,
} from "@/application/ports";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface GetTestDeps {
  tests: TestRepository;
  questions: QuestionRepository;
}

export async function getTest(
  id: string,
  currentUserId: string,
  deps: GetTestDeps
): Promise<TestWithQuestions> {
  const test = await deps.tests.findById(id);
  if (!test) {
    throw new NotFoundError("Тест", id);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому тесту");
  }

  const questions = await deps.questions.listByTestWithOptions(id);
  return { ...test, questions };
}
