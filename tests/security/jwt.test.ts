import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/infrastructure/security/jwt";

describe("JWT", () => {
  it("подписывает и проверяет токен", () => {
    const token = signToken("user-123");
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-123");
  });

  it("возвращает null для невалидного токена", () => {
    expect(verifyToken("not-a-valid-token")).toBeNull();
  });

  it("возвращает null для пустого токена", () => {
    expect(verifyToken("")).toBeNull();
  });
});
