/** Ответ пользователя на конкретный вопрос. Нужен для разбора ошибок. */
export interface TestAnswer {
  id: string;
  resultId: string;
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  isCorrect: boolean;
  pointsAwarded: number;
  createdAt: Date;
}
