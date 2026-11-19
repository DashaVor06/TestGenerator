import { describe, expect, it } from "vitest";
import { loginUser } from "@/application/use-cases/auth/login-user";
import type { PasswordHasher, UserRepository } from "@/application/ports";
import type { User } from "@/domain/entities";
import { UnauthorizedError } from "@/domain/errors/domain-error";

const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
  async compare(password, hash) {
    return hash === `hashed:${password}`;
  },
};

function makeRepo(users: User[]): UserRepository {
  return {
    async findByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async create() {
      throw new Error("не используется в этом тесте");
    },
    async updateLanguage(id, language) {
      const user = users.find((u) => u.id === id);
      if (!user) {
        throw new Error("Пользователь не найден");
      }
      user.language = language;
      return user;
    },
  };
}

const user: User = {
  id: "id-1",
  username: "test",
  email: "test@example.com",
  passwordHash: "hashed:secret123",
  role: "USER",
  language: "RU",
  createdAt: new Date(),
};

describe("loginUser", () => {
  it("возвращает пользователя при верных учётных данных", async () => {
    const result = await loginUser(
      { email: "test@example.com", password: "secret123" },
      { users: makeRepo([user]), hasher: fakeHasher }
    );
    expect(result.id).toBe("id-1");
    expect(result.email).toBe("test@example.com");
  });

  it("выбрасывает UnauthorizedError при неверном email", async () => {
    await expect(
      loginUser(
        { email: "nobody@example.com", password: "secret123" },
        { users: makeRepo([user]), hasher: fakeHasher }
      )
    ).rejects.toThrow(UnauthorizedError);
  });

  it("выбрасывает UnauthorizedError при неверном пароле", async () => {
    await expect(
      loginUser(
        { email: "test@example.com", password: "wrong-password" },
        { users: makeRepo([user]), hasher: fakeHasher }
      )
    ).rejects.toThrow(UnauthorizedError);
  });
});
