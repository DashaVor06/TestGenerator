// Валидация параметров генерации теста.

import { z } from "zod";

export const generateSchema = z.object({
  materialId: z.string().min(1, "Не указан материал"),
  count: z.number().int().min(1).max(50).default(5),
  types: z
    .array(z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "OPEN"]))
    .min(1)
    .default(["MULTIPLE_CHOICE"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
