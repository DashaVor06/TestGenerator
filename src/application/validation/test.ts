// Валидация входных данных для CRUD тестов.

import { z } from "zod";

export const createTestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название должно быть не короче 2 символов")
    .max(200, "Название должно быть не длиннее 200 символов"),
  category: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(2000).nullish(),
});

export const updateTestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название должно быть не короче 2 символов")
    .max(200, "Название должно быть не длиннее 200 символов")
    .optional(),
  category: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(2000).nullish(),
});

export const listTestsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  sortBy: z.enum(["createdAt", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type ListTestsQuery = z.infer<typeof listTestsQuerySchema>;
