// Use case: удаление теста (с проверкой авторства).

import type { TestRepository } from "@/application/ports";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface DeleteTestDeps {
  tests: TestRepository;
}

export async function deleteTest(
  id: string,
  currentUserId: string,
  deps: DeleteTestDeps
): Promise<void> {
  const existing = await deps.tests.findById(id);
  if (!existing) {
    throw new NotFoundError("Тест", id);
  }
  if (existing.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно удалять только свои тесты");
  }

  await deps.tests.delete(id);
}
