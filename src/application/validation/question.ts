// Валидация ручного создания и редактирования вопросов.

import { z } from "zod";
import { difficultySchema, questionTypeSchema } from "./generation";

export const cognitiveLevelSchema = z.enum([
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
]);

export const questionOptionSchema = z.object({
  text: z.string().trim().min(1, "Вариант ответа не может быть пустым").max(500),
  isCorrect: z.boolean().default(false),
});

const questionFields = {
  type: questionTypeSchema,
  text: z
    .string()
    .trim()
    .min(3, "Текст вопроса слишком короткий")
    .max(2000, "Текст вопроса слишком длинный"),
  difficulty: difficultySchema.nullish(),
  cognitiveLevel: cognitiveLevelSchema.optional(),
  explanation: z.string().trim().max(2000).nullish(),
  sourceQuote: z.string().trim().max(1000).nullish(),
  expectedAnswer: z.string().trim().max(500).nullish(),
  points: z.coerce.number().int().min(1).max(10).default(1),
  options: z.array(questionOptionSchema).max(10).default([]),
};

export const createQuestionSchema = z.object(questionFields);

export const updateQuestionSchema = z.object({
  type: questionTypeSchema.optional(),
  text: questionFields.text.optional(),
  difficulty: difficultySchema.nullish(),
  cognitiveLevel: cognitiveLevelSchema.optional(),
  explanation: questionFields.explanation,
  sourceQuote: questionFields.sourceQuote,
  expectedAnswer: questionFields.expectedAnswer,
  points: questionFields.points.optional(),
  options: questionFields.options.optional(),
});

export type CreateQuestionBody = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionBody = z.infer<typeof updateQuestionSchema>;
