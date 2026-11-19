// Use case: смена языка интерфейса пользователя.

import type { UserRepository } from "@/application/ports";
import type { TestLanguage, User } from "@/domain/entities";
import { NotFoundError } from "@/domain/errors/domain-error";

export interface UpdateLanguageDeps {
  users: UserRepository;
}

export async function updateLanguage(
  userId: string,
  language: TestLanguage,
  deps: UpdateLanguageDeps
): Promise<User> {
  const user = await deps.users.findById(userId);
  if (!user) {
    throw new NotFoundError("Пользователь", userId);
  }
  return deps.users.updateLanguage(userId, language);
}
