import { describe, expect, it } from "vitest";
import { registerUser } from "@/application/use-cases/auth/register-user";
import type { PasswordHasher, UserRepository } from "@/application/ports";
import type { User } from "@/domain/entities";
import { ConflictError } from "@/domain/errors/domain-error";

const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hashed:${password}`;
  },
  async compare(password, hash) {
    return hash === `hashed:${password}`;
  },
};

interface FakeRepo extends UserRepository {
  users: User[];
}

function makeRepo(seed: User[] = []): FakeRepo {
  const users = [...seed];
  return {
    users,
    async findByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async create(input) {
      const user: User = {
        id: `id-${users.length + 1}`,
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        role: "USER",
        language: "RU",
        createdAt: new Date(),
      };
      users.push(user);
      return user;
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

describe("registerUser", () => {
  it("создаёт пользователя с хешированным паролем", async () => {
    const repo = makeRepo();
    const user = await registerUser(
      { username: "test", email: "test@example.com", password: "secret123" },
      { users: repo, hasher: fakeHasher }
    );

    expect(user.email).toBe("test@example.com");
    expect(user.passwordHash).toBe("hashed:secret123");
    expect(user.passwordHash).not.toBe("secret123");
    expect(repo.users).toHaveLength(1);
  });

  it("выбрасывает ConflictError, если email уже занят", async () => {
    const existing: User = {
      id: "id-1",
      username: "existing",
      email: "test@example.com",
      passwordHash: "hashed:xxx",
      role: "USER",
      language: "RU",
      createdAt: new Date(),
    };
    const repo = makeRepo([existing]);

    await expect(
      registerUser(
        { username: "test", email: "test@example.com", password: "secret123" },
        { users: repo, hasher: fakeHasher }
      )
    ).rejects.toThrow(ConflictError);
  });
});
