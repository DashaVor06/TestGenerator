// Валидация ответов при сдаче теста.

import { z } from "zod";

export const submittedAnswerSchema = z.object({
  questionId: z.string().min(1, "Не указан вопрос"),
  optionIds: z.array(z.string()).default([]),
  /** Текстовый ответ — для вопросов SHORT_ANSWER и OPEN. */
  text: z.string().max(5000, "Слишком длинный ответ").nullish(),
});

export const submitAnswersSchema = z.object({
  answers: z.array(submittedAnswerSchema).min(1, "Нет ответов"),
  /** Длительность прохождения в миллисекундах. */
  durationMs: z.coerce.number().int().min(0).max(24 * 60 * 60 * 1000).nullish(),
});

/** Сдача теста гостем: дополнительно приходит имя. */
export const publicSubmitSchema = submitAnswersSchema.extend({
  guestName: z.string().trim().min(1, "Укажите имя").max(50).optional(),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
export type PublicSubmitInput = z.infer<typeof publicSubmitSchema>;
