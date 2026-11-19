// Use case: создание теста.

import type { TestRepository } from "@/application/ports";
import type { Test, TestLanguage, Visibility } from "@/domain/entities";

export interface CreateTestInput {
  title: string;
  category?: string | null;
  description?: string | null;
  language?: TestLanguage;
  visibility?: Visibility;
  materialId?: string | null;
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
    language: input.language ?? "RU",
    visibility: input.visibility ?? "PRIVATE",
    materialId: input.materialId ?? null,
  });
}
