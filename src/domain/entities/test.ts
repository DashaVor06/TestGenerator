import type {
  Difficulty,
  ProcessingStatus,
  QuestionType,
  TestLanguage,
  Visibility,
} from "./enums";

/** Параметры последней генерации теста (сохраняются в БД для повторного запуска). */
export interface TestSettings {
  /** Сколько всего вопросов было запрошено. */
  questionCount: number;
  /** Сколько вопросов каждого типа было запрошено. */
  typeCounts: Partial<Record<QuestionType, number>>;
  /** Сколько вопросов «на размышление» было запрошено. */
  thinkingCount: number;
  difficulty: Difficulty | null;
  materialId: string | null;
}

/** Сгенерированный тест. */
export interface Test {
  id: string;
  ownerId: string;
  /** Материал, по которому построен тест. */
  materialId: string | null;
  title: string;
  category: string | null;
  description: string | null;
  language: TestLanguage;
  visibility: Visibility;
  /** Короткая ссылка для доступа к тесту (нужна для UNLISTED). */
  shareToken: string | null;
  status: ProcessingStatus;
  settings: TestSettings | null;
  createdAt: Date;
}
