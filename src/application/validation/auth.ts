// Валидация входных данных (DTO) для аутентификации.

import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Имя пользователя должно быть не короче 2 символов")
    .max(50, "Имя пользователя должно быть не длиннее 50 символов"),
  email: z.string().trim().email("Некорректный email"),
  password: z
    .string()
    .min(6, "Пароль должен быть не короче 6 символов")
    .max(100, "Пароль должен быть не длиннее 100 символов"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
