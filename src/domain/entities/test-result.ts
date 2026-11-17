/** Результат прохождения теста пользователем. */
export interface TestResult {
  id: string;
  testId: string;
  userId: string;
  score: number;
  percentCorrect: number;
  completedAt: Date;
}
