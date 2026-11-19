import type { CognitiveLevel, Difficulty, QuestionType } from "./enums";

/** Отдельный вопрос в составе теста. */
export interface Question {
  id: string;
  testId: string;
  type: QuestionType;
  text: string;
  difficulty: Difficulty | null;
  cognitiveLevel: CognitiveLevel;
  /** Пояснение к правильному ответу (показывается после прохождения). */
  explanation: string | null;
  /** Фрагмент материала, на котором основан вопрос. */
  sourceQuote: string | null;
  /** Эталонный ответ для вопроса типа SHORT_ANSWER. */
  expectedAnswer: string | null;
  points: number;
  order: number;
}
