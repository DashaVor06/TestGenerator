import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/infrastructure/security/rate-limiter";

describe("checkRateLimit", () => {
  it("пропускает запросы в пределах лимита", () => {
    const key = `test-${Math.random()}`;

    expect(checkRateLimit(key, 3).allowed).toBe(true);
    expect(checkRateLimit(key, 3).allowed).toBe(true);
    expect(checkRateLimit(key, 3).allowed).toBe(true);
  });

  it("блокирует запрос сверх лимита и подсказывает время ожидания", () => {
    const key = `test-${Math.random()}`;

    checkRateLimit(key, 1);
    const second = checkRateLimit(key, 1);

    expect(second.allowed).toBe(false);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("разные ключи не мешают друг другу", () => {
    const first = `test-a-${Math.random()}`;
    const second = `test-b-${Math.random()}`;

    checkRateLimit(first, 1);
    expect(checkRateLimit(second, 1).allowed).toBe(true);
  });
});
