// Проверка ответов и подсчёт баллов. Чистые функции без обращений к БД,
// поэтому их легко покрыть unit-тестами.

import type { QuestionType } from "./entities/enums";

/** Вариант ответа в том виде, в котором он нужен для проверки. */
export interface ScorableOption {
  id: string;
  isCorrect: boolean;
}

/** Вопрос, который можно проверить автоматически. */
export interface ScorableQuestion {
  id: string;
  type: QuestionType;
  points: number;
  /** Эталонный ответ для типа SHORT_ANSWER. */
  expectedAnswer: string | null;
  options: ScorableOption[];
}

/** Ответ, который прислал пользователь. */
export interface SubmittedAnswer {
  questionId: string;
  optionIds: string[];
  text?: string | null;
}

/** Результат проверки одного ответа. */
export interface GradedAnswer {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  isCorrect: boolean;
  pointsAwarded: number;
  /** false — вопрос нельзя проверить автоматически (развёрнутый ответ). */
  autoGraded: boolean;
}

/** Результат проверки всего теста. */
export interface GradedAttempt {
  answers: GradedAnswer[];
  score: number;
  maxScore: number;
  percentCorrect: number;
}

/**
 * Можно ли проверить вопрос автоматически.
 * Развёрнутый ответ (OPEN) проверяет человек, вопрос-выбор без вариантов — ошибка данных.
 */
export function canAutoGrade(question: ScorableQuestion): boolean {
  if (question.type === "OPEN") {
    return false;
  }
  if (question.type === "SHORT_ANSWER") {
    return (question.expectedAnswer ?? "").trim().length > 0;
  }
  return question.options.length > 0;
}

/**
 * Приводит текстовый ответ к сравнимому виду:
 * нижний регистр, «ё» → «е», знаки препинания заменяются пробелом,
 * лишние пробелы убираются. Запятая и точка считаются одинаково,
 * поэтому «2,5» и «2.5» сравниваются как равные.
 */
export function normalizeAnswerText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,;:!?"'«»()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Сравнивает два набора идентификаторов вариантов (порядок не важен). */
function sameOptionSets(correctIds: string[], selectedIds: string[]): boolean {
  if (correctIds.length !== selectedIds.length) {
    return false;
  }
  const correct = new Set(correctIds);
  return selectedIds.every((id) => correct.has(id));
}

/**
 * Проверяет один ответ.
 * Для SHORT_ANSWER эталон может содержать несколько допустимых вариантов
 * через вертикальную черту: "БД|база данных".
 */
export function gradeQuestion(
  question: ScorableQuestion,
  answer: SubmittedAnswer | undefined
): GradedAnswer {
  const selectedOptionIds = answer?.optionIds ?? [];
  const textAnswer = answer?.text ?? null;

  if (!canAutoGrade(question)) {
    return {
      questionId: question.id,
      selectedOptionIds,
      textAnswer,
      isCorrect: false,
      pointsAwarded: 0,
      autoGraded: false,
    };
  }

  let isCorrect = false;

  if (question.type === "SHORT_ANSWER") {
    const normalizedUserAnswer = normalizeAnswerText(textAnswer ?? "");
    const acceptable = (question.expectedAnswer ?? "")
      .split("|")
      .map((variant) => normalizeAnswerText(variant))
      .filter((variant) => variant.length > 0);
    isCorrect = normalizedUserAnswer.length > 0 && acceptable.includes(normalizedUserAnswer);
  } else {
    // SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE — сравниваем наборы вариантов.
    const correctIds = question.options.filter((option) => option.isCorrect).map((option) => option.id);
    isCorrect = sameOptionSets(correctIds, selectedOptionIds);
  }

  return {
    questionId: question.id,
    selectedOptionIds,
    textAnswer,
    isCorrect,
    pointsAwarded: isCorrect ? question.points : 0,
    autoGraded: true,
  };
}

/** Проверяет весь тест и считает итоговые баллы. */
export function gradeAttempt(
  questions: ScorableQuestion[],
  answers: SubmittedAnswer[]
): GradedAttempt {
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  const graded = questions.map((question) =>
    gradeQuestion(question, answersByQuestion.get(question.id))
  );

  const score = graded.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
  const maxScore = questions.reduce(
    (sum, question) => (canAutoGrade(question) ? sum + question.points : sum),
    0
  );

  return {
    answers: graded,
    score,
    maxScore,
    percentCorrect: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
  };
}
