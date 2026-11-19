// Общие функции построения DTO для прохождения теста и разбора ошибок.
// Главное правило безопасности: до сдачи теста правильные ответы
// (isCorrect) в ответы API не попадают.

import type { QuestionWithOptions } from "@/application/ports";
import type { Question, Test, TestAnswer, TestResult } from "@/domain/entities";
import { canAutoGrade, type ScorableQuestion } from "@/domain/scoring";

/** Вариант ответа, который видит проходящий тест. */
export interface AttemptOptionDto {
  id: string;
  text: string;
}

/** Вопрос без правильных ответов. */
export interface AttemptQuestionDto {
  id: string;
  type: Question["type"];
  text: string;
  points: number;
  options: AttemptOptionDto[];
}

/** Тест, готовый к прохождению. */
export interface AttemptTestDto {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  language: Test["language"];
  questionCount: number;
  totalPoints: number;
  questions: AttemptQuestionDto[];
}

/** Вариант ответа с отметками — показывается только после сдачи. */
export interface ReviewOptionDto extends AttemptOptionDto {
  isCorrect: boolean;
  selected: boolean;
}

/** Один вопрос в разборе ошибок. */
export interface ReviewItemDto {
  questionId: string;
  text: string;
  type: Question["type"];
  points: number;
  options: ReviewOptionDto[];
  yourOptionIds: string[];
  yourText: string | null;
  correctOptionIds: string[];
  expectedAnswer: string | null;
  isCorrect: boolean;
  /** false — вопрос проверяется преподавателем (развёрнутый ответ). */
  autoGraded: boolean;
  explanation: string | null;
  /** Фрагмент материала, на котором основан вопрос. */
  sourceQuote: string | null;
}

/** Итог прохождения. */
export interface ResultDto {
  id: string;
  testId: string;
  userId: string | null;
  guestName: string | null;
  score: number;
  maxScore: number;
  percentCorrect: number;
  durationMs: number | null;
  completedAt: Date;
}

export interface AttemptResultDto {
  result: ResultDto;
  test: { id: string; title: string };
  items: ReviewItemDto[];
}

/** Преобразует вопрос к виду, пригодному для автоматической проверки. */
export function toScorableQuestion(question: QuestionWithOptions): ScorableQuestion {
  return {
    id: question.id,
    type: question.type,
    points: question.points,
    expectedAnswer: question.expectedAnswer,
    options: question.options.map((option) => ({
      id: option.id,
      isCorrect: option.isCorrect,
    })),
  };
}

/** Тест для прохождения: правильные ответы скрыты. */
export function buildAttemptDto(
  test: Test,
  questions: QuestionWithOptions[]
): AttemptTestDto {
  return {
    id: test.id,
    title: test.title,
    description: test.description,
    category: test.category,
    language: test.language,
    questionCount: questions.length,
    totalPoints: questions.reduce(
      (sum, question) => (canAutoGrade(toScorableQuestion(question)) ? sum + question.points : sum),
      0
    ),
    questions: questions.map((question) => ({
      id: question.id,
      type: question.type,
      text: question.text,
      points: question.points,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
      })),
    })),
  };
}

/** Данные ответа пользователя, нужные для разбора. */
export interface AnswerLookupItem {
  optionIds: string[];
  text: string | null;
  isCorrect: boolean;
}

/** Собирает разбор: ваш ответ, правильный ответ, пояснение и цитата из материала. */
export function buildReviewItems(
  questions: QuestionWithOptions[],
  lookup: Map<string, AnswerLookupItem>
): ReviewItemDto[] {
  return questions.map((question) => {
    const answer = lookup.get(question.id);
    const selectedIds = answer?.optionIds ?? [];
    const correctOptionIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);

    return {
      questionId: question.id,
      text: question.text,
      type: question.type,
      points: question.points,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
        selected: selectedIds.includes(option.id),
      })),
      yourOptionIds: selectedIds,
      yourText: answer?.text ?? null,
      correctOptionIds,
      expectedAnswer: question.expectedAnswer,
      isCorrect: answer?.isCorrect ?? false,
      autoGraded: canAutoGrade(toScorableQuestion(question)),
      explanation: question.explanation,
      sourceQuote: question.sourceQuote,
    };
  });
}

/** Итог прохождения в безопасном для API виде. */
export function toResultDto(result: TestResult): ResultDto {
  return {
    id: result.id,
    testId: result.testId,
    userId: result.userId,
    guestName: result.guestName,
    score: result.score,
    maxScore: result.maxScore,
    percentCorrect: result.percentCorrect,
    durationMs: result.durationMs,
    completedAt: result.completedAt,
  };
}

/** Итог + разбор на основе сохранённых ответов. */
export function buildResultDto(
  test: Test,
  result: TestResult,
  questions: QuestionWithOptions[],
  answers: TestAnswer[]
): AttemptResultDto {
  const lookup = new Map<string, AnswerLookupItem>(
    answers.map((answer) => [
      answer.questionId,
      {
        optionIds: answer.selectedOptionIds,
        text: answer.textAnswer,
        isCorrect: answer.isCorrect,
      },
    ])
  );

  return {
    result: {
      id: result.id,
      testId: result.testId,
      userId: result.userId,
      guestName: result.guestName,
      score: result.score,
      maxScore: result.maxScore,
      percentCorrect: result.percentCorrect,
      durationMs: result.durationMs,
      completedAt: result.completedAt,
    },
    test: { id: test.id, title: test.title },
    items: buildReviewItems(questions, lookup),
  };
}
