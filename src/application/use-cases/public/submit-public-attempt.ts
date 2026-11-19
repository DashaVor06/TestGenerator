// Use case: сдача публичного теста гостем или пользователем.

import type {
  QuestionRepository,
  TestRepository,
  TestResultRepository,
} from "@/application/ports";
import type { PublicSubmitInput } from "@/application/validation/submit";
import type { AttemptResultDto } from "@/application/use-cases/tests/attempt-dto";
import { createAttempt } from "@/application/use-cases/tests/submit-answers";
import { NotFoundError, ValidationError } from "@/domain/errors/domain-error";

export interface SubmitPublicAttemptDeps {
  tests: TestRepository;
  questions: QuestionRepository;
  results: TestResultRepository;
}

export async function submitPublicAttempt(
  token: string,
  currentUserId: string | null,
  input: PublicSubmitInput,
  deps: SubmitPublicAttemptDeps
): Promise<AttemptResultDto> {
  const test = await deps.tests.findByShareToken(token);
  if (!test || test.visibility === "PRIVATE") {
    throw new NotFoundError("Тест", token);
  }

  const questions = await deps.questions.listByTestWithOptions(test.id);
  if (questions.length === 0) {
    throw new ValidationError("В тесте нет вопросов");
  }

  // Авторизованный пользователь сохраняет результат в свой профиль,
  // гость проходит тест анонимно и указывает только имя.
  const author = currentUserId
    ? { userId: currentUserId, guestName: null }
    : { userId: null, guestName: input.guestName ?? "Гость" };

  return createAttempt(test, questions, author, input, deps);
}
