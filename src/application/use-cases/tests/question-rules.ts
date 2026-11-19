// Правила проверки вопроса, который пользователь создаёт или редактирует вручную.
// Схема zod проверяет только форму данных, а здесь — смысл:
// например, у вопроса с одним выбором должен быть ровно один правильный ответ.

import type { CreateQuestionOptionInput } from "@/application/ports";
import type { QuestionType } from "@/domain/entities";
import { ValidationError } from "@/domain/errors/domain-error";

export interface QuestionData {
  type: QuestionType;
  options: CreateQuestionOptionInput[];
  expectedAnswer: string | null;
}

export interface NormalizedQuestionData {
  options: CreateQuestionOptionInput[];
  expectedAnswer: string | null;
}

/** Приводит данные вопроса к правилам его типа. */
export function normalizeQuestionData(data: QuestionData): NormalizedQuestionData {
  const options = data.options
    .map((option) => ({ text: option.text.trim(), isCorrect: option.isCorrect }))
    .filter((option) => option.text.length > 0)
    .map((option, index) => ({ ...option, order: index }));

  if (data.type === "OPEN") {
    return { options: [], expectedAnswer: null };
  }

  if (data.type === "SHORT_ANSWER") {
    const expected = (data.expectedAnswer ?? "").trim();
    if (expected.length === 0) {
      throw new ValidationError("Для вопроса с коротким ответом укажите эталонный ответ");
    }
    return { options: [], expectedAnswer: expected };
  }

  const correctCount = options.filter((option) => option.isCorrect).length;

  if (data.type === "TRUE_FALSE") {
    if (options.length !== 2) {
      throw new ValidationError("Для типа «верно/неверно» нужно ровно два варианта");
    }
    if (correctCount !== 1) {
      throw new ValidationError("Один из двух вариантов должен быть правильным");
    }
    return { options, expectedAnswer: null };
  }

  if (options.length < 2) {
    throw new ValidationError("Нужно минимум два варианта ответа");
  }

  if (data.type === "SINGLE_CHOICE" && correctCount !== 1) {
    throw new ValidationError("У вопроса с одним выбором должен быть ровно один правильный вариант");
  }

  if (data.type === "MULTIPLE_CHOICE" && correctCount < 1) {
    throw new ValidationError("Отметьте хотя бы один правильный вариант");
  }

  return { options, expectedAnswer: null };
}
