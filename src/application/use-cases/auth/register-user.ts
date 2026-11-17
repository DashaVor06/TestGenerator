// Use case: регистрация пользователя.

import type { PasswordHasher, UserRepository } from "@/application/ports";
import type { User } from "@/domain/entities";
import { ConflictError } from "@/domain/errors/domain-error";

export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
}

export interface RegisterUserDeps {
  users: UserRepository;
  hasher: PasswordHasher;
}

export async function registerUser(
  input: RegisterUserInput,
  deps: RegisterUserDeps
): Promise<User> {
  const existing = await deps.users.findByEmail(input.email);
  if (existing) {
    throw new ConflictError("Пользователь с таким email уже существует");
  }

  const passwordHash = await deps.hasher.hash(input.password);

  return deps.users.create({
    username: input.username,
    email: input.email,
    passwordHash,
  });
}
