// Общие типы и небольшие помощники страницы управления тестом.
// Вынесены отдельно, чтобы карточки не дублировали описания данных.

import type { Language, TranslationKey } from "@/i18n/dictionary";

/** Статус обработки теста. */
export type TestStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";

/** Кто может увидеть и пройти тест. */
export type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

/** Тип вопроса. От него зависит способ проверки ответа. */
export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "OPEN";

/** Сложность вопроса. */
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

/** Уровень мышления по таксономии Блума. */
export type CognitiveLevel = "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE";

export interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface Question {
  id: string;
  testId: string;
  type: QuestionType;
  text: string;
  difficulty: Difficulty | null;
  cognitiveLevel: CognitiveLevel;
  explanation: string | null;
  sourceQuote: string | null;
  expectedAnswer: string | null;
  points: number;
  order: number;
  options: AnswerOption[];
}

export interface Test {
  id: string;
  ownerId: string;
  materialId: string | null;
  title: string;
  category: string | null;
  description: string | null;
  language: Language;
  visibility: Visibility;
  shareToken: string | null;
  status: TestStatus;
  createdAt: string;
}

export interface TestWithQuestions extends Test {
  questions: Question[];
}

export interface Material {
  id: string;
  title: string;
  content: string | null;
}

/** Вариант ответа в форме вопроса (у сохранённых вариантов есть id, здесь он не нужен). */
export interface OptionDraft {
  text: string;
  isCorrect: boolean;
}

/** Черновик вопроса в форме. */
export interface QuestionDraft {
  type: QuestionType;
  text: string;
  points: number;
  difficulty: Difficulty | "";
  cognitiveLevel: CognitiveLevel;
  explanation: string;
  sourceQuote: string;
  expectedAnswer: string;
  options: OptionDraft[];
}

// Ограничения совпадают с проверкой на сервере.
export const MAX_QUESTIONS = 50;
export const MIN_POINTS = 1;
export const MAX_POINTS = 10;

export const QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "OPEN",
];
export const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
export const COGNITIVE_LEVELS: CognitiveLevel[] = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
];
export const VISIBILITIES: Visibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];

// Ключи словаря для подписей, чтобы не собирать их строками.
export const TYPE_KEYS: Record<QuestionType, TranslationKey> = {
  SINGLE_CHOICE: "tests.question.type.SINGLE_CHOICE",
  MULTIPLE_CHOICE: "tests.question.type.MULTIPLE_CHOICE",
  TRUE_FALSE: "tests.question.type.TRUE_FALSE",
  SHORT_ANSWER: "tests.question.type.SHORT_ANSWER",
  OPEN: "tests.question.type.OPEN",
};

export const DIFFICULTY_KEYS: Record<Difficulty, TranslationKey> = {
  EASY: "tests.generation.difficulty.EASY",
  MEDIUM: "tests.generation.difficulty.MEDIUM",
  HARD: "tests.generation.difficulty.HARD",
};

export const COGNITIVE_KEYS: Record<CognitiveLevel, TranslationKey> = {
  REMEMBER: "tests.question.cognitive.REMEMBER",
  UNDERSTAND: "tests.question.cognitive.UNDERSTAND",
  APPLY: "tests.question.cognitive.APPLY",
  ANALYZE: "tests.question.cognitive.ANALYZE",
};

export const VISIBILITY_KEYS: Record<Visibility, TranslationKey> = {
  PRIVATE: "tests.visibility.PRIVATE",
  UNLISTED: "tests.visibility.UNLISTED",
  PUBLIC: "tests.visibility.PUBLIC",
};

export const VISIBILITY_HINT_KEYS: Record<Visibility, TranslationKey> = {
  PRIVATE: "tests.visibility.hint.PRIVATE",
  UNLISTED: "tests.visibility.hint.UNLISTED",
  PUBLIC: "tests.visibility.hint.PUBLIC",
};

export const STATUS_KEYS: Record<TestStatus, TranslationKey> = {
  PENDING: "tests.status.PENDING",
  PROCESSING: "tests.status.PROCESSING",
  READY: "tests.status.READY",
  ERROR: "tests.status.ERROR",
};

export const STATUS_BADGES: Record<TestStatus, string> = {
  PENDING: "badge badge--warning",
  PROCESSING: "badge badge--primary",
  READY: "badge badge--success",
  ERROR: "badge badge--danger",
};

/** Есть ли у вопроса варианты ответа. */
export function hasOptions(type: QuestionType): boolean {
  return (
    type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE"
  );
}

/** Нужен ли эталонный ответ (он проверяется у свободных ответов). */
export function hasExpectedAnswer(type: QuestionType): boolean {
  return type === "SHORT_ANSWER" || type === "OPEN";
}

/** Ограничивает число диапазоном. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Оставляет ровно два варианта — столько требует тип «верно/неверно». */
export function twoOptions(options: OptionDraft[]): OptionDraft[] {
  const first = options[0] ?? { text: "", isCorrect: true };
  const second = options[1] ?? { text: "", isCorrect: false };
  return [first, second];
}

/** Пустая форма нового вопроса. */
export function emptyDraft(): QuestionDraft {
  return {
    type: "SINGLE_CHOICE",
    text: "",
    points: 1,
    difficulty: "",
    cognitiveLevel: "UNDERSTAND",
    explanation: "",
    sourceQuote: "",
    expectedAnswer: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

/** Заполняет форму по уже сохранённому вопросу. */
export function draftFromQuestion(question: Question): QuestionDraft {
  return {
    type: question.type,
    text: question.text,
    points: question.points,
    difficulty: question.difficulty ?? "",
    cognitiveLevel: question.cognitiveLevel,
    explanation: question.explanation ?? "",
    sourceQuote: question.sourceQuote ?? "",
    expectedAnswer: question.expectedAnswer ?? "",
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  };
}
