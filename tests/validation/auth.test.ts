import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/application/validation/auth";

describe("registerSchema", () => {
  it("принимает корректные данные", () => {
    const result = registerSchema.safeParse({
      username: "test",
      email: "test@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет некорректный email", () => {
    const result = registerSchema.safeParse({
      username: "test",
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет короткий пароль", () => {
    const result = registerSchema.safeParse({
      username: "test",
      email: "test@example.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет короткое имя пользователя", () => {
    const result = registerSchema.safeParse({
      username: "a",
      email: "test@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("триммит пробелы в имени и email", () => {
    const result = registerSchema.safeParse({
      username: "  test  ",
      email: " test@example.com ",
      password: "secret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("test");
      expect(result.data.email).toBe("test@example.com");
    }
  });
});

describe("loginSchema", () => {
  it("принимает корректные данные", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success
    ).toBe(true);
  });

  it("отклоняет некорректный email", () => {
    expect(
      loginSchema.safeParse({ email: "bad", password: "x" }).success
    ).toBe(false);
  });

  it("отклоняет пустой пароль", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success
    ).toBe(false);
  });
});
