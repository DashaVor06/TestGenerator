// Use case: публичный каталог тестов (видны только тесты с приватностью PUBLIC).

import type { TestRepository } from "@/application/ports";
import type { Test } from "@/domain/entities";

export interface ListPublicTestsInput {
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListPublicTestsResult {
  tests: Test[];
  total: number;
  page: number;
  limit: number;
}

export interface ListPublicTestsDeps {
  tests: TestRepository;
}

export async function listPublicTests(
  input: ListPublicTestsInput,
  deps: ListPublicTestsDeps
): Promise<ListPublicTestsResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 12;

  const params = {
    visibility: "PUBLIC" as const,
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
