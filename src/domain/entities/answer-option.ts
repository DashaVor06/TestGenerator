/** Вариант ответа на вопрос. */
export interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
}
