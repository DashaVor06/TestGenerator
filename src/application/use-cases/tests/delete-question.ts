// Use case: удаление вопроса.

import type {
  QuestionRepository,
  TestRepository,
} from "@/application/ports";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface DeleteQuestionDeps {
  tests: TestRepository;
  questions: QuestionRepository;
}

export async function deleteQuestion(
  questionId: string,
  currentUserId: string,
  deps: DeleteQuestionDeps
): Promise<void> {
  const question = await deps.questions.findById(questionId);
  if (!question) {
    throw new NotFoundError("Вопрос", questionId);
  }

  const test = await deps.tests.findById(question.testId);
  if (!test) {
    throw new NotFoundError("Тест", question.testId);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно удалять только свои вопросы");
  }

  await deps.questions.delete(questionId);
}
