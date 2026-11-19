/** Запись журнала обращений к ИИ. Нужна, чтобы считать расходы. */
export interface Generation {
  id: string;
  testId: string;
  userId: string;
  model: string;
  /** Режим мышления: low или high. */
  effort: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  questionsCount: number;
  createdAt: Date;
}
