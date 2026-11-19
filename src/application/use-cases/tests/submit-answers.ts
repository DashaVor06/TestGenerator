// Use case: сдача теста — проверка ответов, сохранение результата и разбор.

import type {
  QuestionRepository,
  QuestionWithOptions,
  TestRepository,
  TestResultRepository,
} from "@/application/ports";
import type { SubmitAnswersInput } from "@/application/validation/submit";
import type { AttemptResultDto } from "./attempt-dto";
import { buildReviewItems, toResultDto, toScorableQuestion } from "./attempt-dto";
import type { Test } from "@/domain/entities";
import { gradeAttempt } from "@/domain/scoring";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/domain-error";

export interface SubmitAnswersDeps {
  tests: TestRepository;
  questions: QuestionRepository;
  results: TestResultRepository;
}

/** Кто проходит тест: зарегистрированный пользователь или гость. */
export interface AttemptAuthor {
  userId: string | null;
  guestName: string | null;
}

/**
 * Общая часть сдачи теста: проверяет ответы, сохраняет результат
 * и собирает разбор ошибок. Используется и автором теста, и гостем.
 */
export async function createAttempt(
  test: Test,
  questions: QuestionWithOptions[],
  author: AttemptAuthor,
  input: SubmitAnswersInput,
  deps: SubmitAnswersDeps
): Promise<AttemptResultDto> {
  if (questions.length === 0) {
    throw new ValidationError("В тесте нет вопросов");
  }

  const graded = gradeAttempt(questions.map(toScorableQuestion), input.answers);

  const lookup = new Map(
    graded.answers.map((answer) => [
      answer.questionId,
      {
        optionIds: answer.selectedOptionIds,
        text: answer.textAnswer,
        isCorrect: answer.isCorrect,
      },
    ])
  );

  const result = await deps.results.create({
    testId: test.id,
    userId: author.userId,
    guestName: author.guestName,
    score: graded.score,
    maxScore: graded.maxScore,
    percentCorrect: graded.percentCorrect,
    durationMs: input.durationMs ?? null,
    answers: graded.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds,
      textAnswer: answer.textAnswer,
      isCorrect: answer.isCorrect,
      pointsAwarded: answer.pointsAwarded,
    })),
  });

  return {
    result: toResultDto(result),
    test: { id: test.id, title: test.title },
    items: buildReviewItems(questions, lookup),
  };
}

/** Сдача теста авторизованным пользователем. */
export async function submitAnswers(
  testId: string,
  currentUserId: string,
  input: SubmitAnswersInput,
  deps: SubmitAnswersDeps
): Promise<AttemptResultDto> {
  const test = await deps.tests.findById(testId);
  if (!test) {
    throw new NotFoundError("Тест", testId);
  }

  // Чужой приватный тест проходить нельзя.
  if (test.ownerId !== currentUserId && test.visibility === "PRIVATE") {
    throw new ForbiddenError("Нет доступа к этому тесту");
  }

  const questions = await deps.questions.listByTestWithOptions(testId);

  return createAttempt(
    test,
    questions,
    { userId: currentUserId, guestName: null },
    input,
    deps
  );
}
