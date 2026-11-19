// Use case: добавление вопроса вручную.

import type {
  QuestionRepository,
  TestRepository,
} from "@/application/ports";
import type { CreateQuestionBody } from "@/application/validation/question";
import type { Question } from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";
import { normalizeQuestionData } from "./question-rules";

export interface AddQuestionDeps {
  tests: TestRepository;
  questions: QuestionRepository;
}

export async function addQuestion(
  testId: string,
  currentUserId: string,
  input: CreateQuestionBody,
  deps: AddQuestionDeps
): Promise<Question> {
  const test = await deps.tests.findById(testId);
  if (!test) {
    throw new NotFoundError("Тест", testId);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно изменять только свои тесты");
  }

  const normalized = normalizeQuestionData({
    type: input.type,
    options: input.options,
    expectedAnswer: input.expectedAnswer ?? null,
  });

  const existing = await deps.questions.listByTest(testId);

  return deps.questions.create(testId, {
    type: input.type,
    text: input.text,
    difficulty: input.difficulty ?? null,
    cognitiveLevel: input.cognitiveLevel ?? "REMEMBER",
    explanation: input.explanation ?? null,
    sourceQuote: input.sourceQuote ?? null,
    expectedAnswer: normalized.expectedAnswer,
    points: input.points,
    order: existing.length + 1,
    options: normalized.options,
  });
}
