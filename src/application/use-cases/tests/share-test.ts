// Use case: смена приватности теста и выдача ссылки для доступа.
//
// PRIVATE — тест виден только автору;
// UNLISTED — доступен по прямой ссылке, но не показывается в каталоге;
// PUBLIC — доступен по ссылке и показывается в общем каталоге.

import type { TestRepository } from "@/application/ports";
import type { Test, Visibility } from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface ShareTestInput {
  visibility: Visibility;
  regenerateToken?: boolean;
}

export interface ShareTestDeps {
  tests: TestRepository;
  /** Функция создания короткого токена ссылки. */
  createToken: () => string;
}

export async function shareTest(
  id: string,
  currentUserId: string,
  input: ShareTestInput,
  deps: ShareTestDeps
): Promise<Test> {
  const test = await deps.tests.findById(id);
  if (!test) {
    throw new NotFoundError("Тест", id);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно публиковать только свои тесты");
  }

  // Для приватного теста ссылка не нужна.
  if (input.visibility === "PRIVATE") {
    return deps.tests.update(id, {
      visibility: "PRIVATE",
      shareToken: input.regenerateToken ? null : test.shareToken,
    });
  }

  // Для публичного теста ссылка обязательна: создаём её при первом включении.
  const needNewToken = input.regenerateToken === true || !test.shareToken;
  const shareToken = needNewToken ? deps.createToken() : test.shareToken;

  return deps.tests.update(id, {
    visibility: input.visibility,
    shareToken,
  });
}
