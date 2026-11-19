// Валидация параметров генерации теста.
//
// Пользователь сам указывает, сколько вопросов каждого типа ему нужно
// (а не «автоматический подбор»), сложность и число вопросов «на размышление».

import { z } from "zod";

export const questionTypeSchema = z.enum([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "OPEN",
]);

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

/** Максимум вопросов за один запуск генерации. */
export const MAX_QUESTIONS = 50;

export const generateSchema = z
  .object({
    materialId: z.string().uuid("Выберите материал"),
    /** Сколько вопросов каждого типа нужно. */
    typeCounts: z.record(questionTypeSchema, z.coerce.number().int().min(0).max(MAX_QUESTIONS)),
    difficulty: difficultySchema.nullish(),
    /** Сколько вопросов должны быть «на размышление». */
    thinkingCount: z.coerce.number().int().min(0).max(MAX_QUESTIONS).default(0),
    language: z.enum(["RU", "EN"]).optional(),
  })
  .superRefine((value, ctx) => {
    const total = Object.values(value.typeCounts).reduce((sum, count) => sum + count, 0);

    if (total < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["typeCounts"],
        message: "Укажите хотя бы один вопрос",
      });
    }

    if (total > MAX_QUESTIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["typeCounts"],
        message: `За один раз можно сгенерировать не больше ${MAX_QUESTIONS} вопросов`,
      });
    }

    if (value.thinkingCount > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["thinkingCount"],
        message: "Вопросов «на размышление» не может быть больше общего количества",
      });
    }
  });

export type GenerateInput = z.infer<typeof generateSchema>;
