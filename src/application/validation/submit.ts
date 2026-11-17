// Валидация ответов при сдаче теста.

import { z } from "zod";

export const submitAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1, "Не указан вопрос"),
      optionIds: z.array(z.string()).default([]),
    })
  ),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
