/** Вариант ответа на вопрос. */
export interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  /** Порядок вывода варианта на экране. */
  order: number;
}
