// Use case: обновление теста (с проверкой авторства).

import type { TestRepository } from "@/application/ports";
import type { Test, TestLanguage, Visibility } from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface UpdateTestInput {
  title?: string;
  category?: string | null;
  description?: string | null;
  language?: TestLanguage;
  visibility?: Visibility;
}

export interface UpdateTestDeps {
  tests: TestRepository;
}

export async function updateTest(
  id: string,
  currentUserId: string,
  input: UpdateTestInput,
  deps: UpdateTestDeps
): Promise<Test> {
  const existing = await deps.tests.findById(id);
  if (!existing) {
    throw new NotFoundError("Тест", id);
  }
  if (existing.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно изменять только свои тесты");
  }

  return deps.tests.update(id, input);
}
