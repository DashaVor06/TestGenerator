/** Результат прохождения теста. */
export interface TestResult {
  id: string;
  testId: string;
  /** NULL, если тест проходил незарегистрированный пользователь. */
  userId: string | null;
  /** Имя гостя (заполняется, когда userId = NULL). */
  guestName: string | null;
  /** Сколько баллов набрано. */
  score: number;
  /** Максимум баллов (без вопросов, которые проверяются вручную). */
  maxScore: number;
  percentCorrect: number;
  /** Сколько длилось прохождение. */
  durationMs: number | null;
  completedAt: Date;
}
