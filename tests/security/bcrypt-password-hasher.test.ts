import { describe, expect, it } from "vitest";
import { BcryptPasswordHasher } from "@/infrastructure/security/bcrypt-password-hasher";

describe("BcryptPasswordHasher", () => {
  const hasher = new BcryptPasswordHasher();

  it("хеширует пароль (результат отличается от исходного)", async () => {
    const hash = await hasher.hash("secret123");
    expect(hash).not.toBe("secret123");
    expect(hash).toContain("$2"); // префикс bcrypt
  });

  it("даёт разный хеш для одного пароля (соль)", async () => {
    const h1 = await hasher.hash("secret123");
    const h2 = await hasher.hash("secret123");
    expect(h1).not.toBe(h2);
  });

  it("проверяет корректный пароль", async () => {
    const hash = await hasher.hash("secret123");
    expect(await hasher.compare("secret123", hash)).toBe(true);
  });

  it("отклоняет неверный пароль", async () => {
    const hash = await hasher.hash("secret123");
    expect(await hasher.compare("wrong-password", hash)).toBe(false);
  });
});
