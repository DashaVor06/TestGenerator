// Валидация входных данных для материалов.

import { z } from "zod";

/** Максимальная длина текста материала (в символах). */
export const MAX_MATERIAL_CHARS = 200_000;

export const createMaterialSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название должно быть не короче 2 символов")
    .max(200, "Название должно быть не длиннее 200 символов"),
  content: z.string().max(MAX_MATERIAL_CHARS, "Текст материала слишком длинный").nullish(),
});

/** Материал, добавленный по ссылке на статью. */
export const createUrlMaterialSchema = z.object({
  title: z.string().trim().max(200).optional(),
  sourceUrl: z.string().trim().url("Некорректная ссылка").max(2000),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type CreateUrlMaterialInput = z.infer<typeof createUrlMaterialSchema>;
