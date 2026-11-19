// Генерация короткого токена для ссылки на тест.
// Токен случайный, поэтому приватный тест нельзя найти перебором.

import { randomBytes } from "node:crypto";

/** Возвращает строку из 11 символов, безопасную для адреса страницы. */
export function createShareToken(): string {
  return randomBytes(8).toString("base64url");
}
