// Валидация входных данных для материалов.

import { z } from "zod";

export const createMaterialSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название должно быть не короче 2 символов")
    .max(200, "Название должно быть не длиннее 200 символов"),
  content: z.string().max(50000, "Текст материала слишком длинный").nullish(),
  fileUrl: z.string().max(500).nullish(),
  fileType: z.string().max(50).nullish(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
