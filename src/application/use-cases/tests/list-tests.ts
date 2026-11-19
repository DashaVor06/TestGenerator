// Use case: список тестов пользователя с поиском, сортировкой и постраничным выводом.

import type { TestRepository } from "@/application/ports";
import type { Test } from "@/domain/entities";

export interface ListTestsInput {
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListTestsResult {
  tests: Test[];
  total: number;
  page: number;
  limit: number;
}

export interface ListTestsDeps {
  tests: TestRepository;
}

export async function listTests(
  ownerId: string,
  input: ListTestsInput,
  deps: ListTestsDeps
): Promise<ListTestsResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;

  const params = {
    ownerId,
    search: input.search,
    category: input.category,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  };

  const [tests, total] = await Promise.all([
    deps.tests.list({ ...params, skip: (page - 1) * limit, take: limit }),
    deps.tests.count(params),
  ]);

  return { tests, total, page, limit };
}
