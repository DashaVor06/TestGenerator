// Порт внешнего сервиса генерации вопросов (сторонний ИИ-сервис).
// Реализация — в infrastructure/external.

import type { QuestionType } from "@/domain/entities";

export interface GenerateQuestionsParams {
  /** Текст материала, по которому генерируются вопросы. */
  content: string;
  /** Количество вопросов. */
  count: number;
  /** Требуемые типы вопросов. */
  types: QuestionType[];
  /** Уровень сложности (easy / medium / hard). */
  difficulty?: string;
}

export interface GeneratedAnswerOption {
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  type: QuestionType;
  text: string;
  difficulty: string | null;
  explanation: string | null;
  options: GeneratedAnswerOption[];
}

export interface QuestionGenerator {
  generate(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]>;
}
