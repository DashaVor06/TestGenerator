// Use case: вход пользователя (проверка email + пароля).

import type { PasswordHasher, UserRepository } from "@/application/ports";
import type { User } from "@/domain/entities";
import { UnauthorizedError } from "@/domain/errors/domain-error";

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserDeps {
  users: UserRepository;
  hasher: PasswordHasher;
}

export async function loginUser(
  input: LoginUserInput,
  deps: LoginUserDeps
): Promise<User> {
  const user = await deps.users.findByEmail(input.email);
  if (!user) {
    throw new UnauthorizedError("Неверный email или пароль");
  }

  const passwordMatches = await deps.hasher.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Неверный email или пароль");
  }

  return user;
}
