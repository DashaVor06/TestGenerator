// Use case: список тестов пользователя с поиском/сортировкой/фильтрацией.

import type { TestRepository } from "@/application/ports";
import type { Test } from "@/domain/entities";

export interface ListTestsInput {
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface ListTestsDeps {
  tests: TestRepository;
}

export async function listTests(
  ownerId: string,
  input: ListTestsInput,
  deps: ListTestsDeps
): Promise<Test[]> {
  return deps.tests.list({
    ownerId,
    search: input.search,
    category: input.category,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  });
}
