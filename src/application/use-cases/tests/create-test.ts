// Use case: создание теста.

import type { TestRepository } from "@/application/ports";
import type { Test } from "@/domain/entities";

export interface CreateTestInput {
  title: string;
  category?: string | null;
  description?: string | null;
}

export interface CreateTestDeps {
  tests: TestRepository;
}

export async function createTest(
  ownerId: string,
  input: CreateTestInput,
  deps: CreateTestDeps
): Promise<Test> {
  return deps.tests.create({
    ownerId,
    title: input.title,
    category: input.category ?? null,
    description: input.description ?? null,
  });
}
