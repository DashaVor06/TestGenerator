// Use case: сдача теста — подсчёт баллов и сохранение результата.

import type {
  QuestionRepository,
  TestRepository,
  TestResultRepository,
} from "@/application/ports";
import type { TestResult } from "@/domain/entities";
import { NotFoundError } from "@/domain/errors/domain-error";

export interface SubmitAnswersInput {
  answers: { questionId: string; optionIds: string[] }[];
}

export interface SubmitAnswersDeps {
  tests: TestRepository;
  questions: QuestionRepository;
  results: TestResultRepository;
}

export async function submitAnswers(
  testId: string,
  currentUserId: string,
  input: SubmitAnswersInput,
  deps: SubmitAnswersDeps
): Promise<TestResult> {
  const test = await deps.tests.findById(testId);
  if (!test) {
    throw new NotFoundError("Тест", testId);
  }

  const questions = await deps.questions.listByTestWithOptions(testId);
  const answerMap = new Map(
    input.answers.map((a) => [a.questionId, new Set(a.optionIds)])
  );

  let score = 0;
  let total = 0;

  for (const question of questions) {
    // Открытые вопросы (без вариантов) не оцениваются автоматически.
    if (question.options.length === 0) {
      continue;
    }
    total += 1;

    const correctIds = new Set(
      question.options.filter((o) => o.isCorrect).map((o) => o.id)
    );
    const selectedIds = answerMap.get(question.id) ?? new Set<string>();

    if (setsEqual(correctIds, selectedIds)) {
      score += 1;
    }
  }

  const percentCorrect = total > 0 ? Math.round((score / total) * 100) : 0;

  return deps.results.create({
    testId,
    userId: currentUserId,
    score,
    percentCorrect,
  });
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}
