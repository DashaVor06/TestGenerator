// Use case: редактирование вопроса.

import type {
  QuestionRepository,
  TestRepository,
} from "@/application/ports";
import type { UpdateQuestionBody } from "@/application/validation/question";
import type { Question } from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";
import { normalizeQuestionData } from "./question-rules";

export interface UpdateQuestionDeps {
  tests: TestRepository;
  questions: QuestionRepository;
}

export async function updateQuestion(
  questionId: string,
  currentUserId: string,
  input: UpdateQuestionBody,
  deps: UpdateQuestionDeps
): Promise<Question> {
  const question = await deps.questions.findById(questionId);
  if (!question) {
    throw new NotFoundError("Вопрос", questionId);
  }

  const test = await deps.tests.findById(question.testId);
  if (!test) {
    throw new NotFoundError("Тест", question.testId);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно изменять только свои вопросы");
  }

  // Берём новые значения, а если поле не передано — оставляем старое.
  const type = input.type ?? question.type;
  const options = input.options ?? [];
  const expectedAnswer =
    input.expectedAnswer !== undefined ? input.expectedAnswer : question.expectedAnswer;

  // Варианты проверяем только если они переданы или изменился тип вопроса.
  const normalized =
    input.options !== undefined || input.type !== undefined
      ? normalizeQuestionData({ type, options, expectedAnswer })
      : { options: undefined, expectedAnswer };

  return deps.questions.update(questionId, {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.text !== undefined ? { text: input.text } : {}),
    ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
    ...(input.cognitiveLevel !== undefined
      ? { cognitiveLevel: input.cognitiveLevel }
      : {}),
    ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
    ...(input.sourceQuote !== undefined ? { sourceQuote: input.sourceQuote } : {}),
    ...(input.points !== undefined ? { points: input.points } : {}),
    ...(normalized.options !== undefined ? { options: normalized.options } : {}),
    expectedAnswer: normalized.expectedAnswer ?? null,
  });
}
