// Use case: список существующих категорий тестов.
// Нужен для выпадающего фильтра — чтобы предлагать только реальные категории.

import type { TestRepository } from "@/application/ports";
import type { Visibility } from "@/domain/entities";

export interface ListTestCategoriesInput {
  ownerId?: string;
  visibility?: Visibility;
}

export interface ListTestCategoriesDeps {
  tests: TestRepository;
}

export async function listTestCategories(
  input: ListTestCategoriesInput,
  deps: ListTestCategoriesDeps
): Promise<string[]> {
  return deps.tests.listCategories(input);
}
