// Use case: список результатов пользователя.

import type { TestResultRepository } from "@/application/ports";
import type { TestResult } from "@/domain/entities";

export interface ListResultsDeps {
  results: TestResultRepository;
}

export async function listResults(
  userId: string,
  deps: ListResultsDeps
): Promise<TestResult[]> {
  return deps.results.listByUser(userId);
}
