// Валидация входных данных для CRUD тестов.

import { z } from "zod";

/** Язык теста. */
export const testLanguageSchema = z.enum(["RU", "EN"]);

/** Приватность теста: PRIVATE, UNLISTED (по ссылке), PUBLIC (в каталоге). */
export const visibilitySchema = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);

const titleSchema = z
  .string()
  .trim()
  .min(2, "Название должно быть не короче 2 символов")
  .max(200, "Название должно быть не длиннее 200 символов");

export const createTestSchema = z.object({
  title: titleSchema,
  category: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(2000).nullish(),
  language: testLanguageSchema.optional(),
  materialId: z.string().uuid("Некорректный идентификатор материала").nullish(),
});

/**
 * Приватность меняется только через отдельный эндпоинт публикации,
 * потому что вместе с ней нужно выдать или отозвать ссылку доступа.
 */
export const updateTestSchema = z.object({
  title: titleSchema.optional(),
  category: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(2000).nullish(),
  language: testLanguageSchema.optional(),
});

export const listTestsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  sortBy: z.enum(["createdAt", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Публикация теста: смена приватности и (при необходимости) новая ссылка. */
export const shareTestSchema = z.object({
  visibility: visibilitySchema,
  regenerateToken: z.boolean().optional(),
});

/** Параметры публичного каталога. */
export const publicCatalogQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  sortBy: z.enum(["createdAt", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type ListTestsQuery = z.infer<typeof listTestsQuerySchema>;
export type ShareTestInput = z.infer<typeof shareTestSchema>;
