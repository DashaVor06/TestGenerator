import type { QuestionType } from "./enums";

/** Отдельный вопрос в составе теста. */
export interface Question {
  id: string;
  testId: string;
  type: QuestionType;
  text: string;
  difficulty: string | null;
  explanation: string | null;
  order: number;
}
