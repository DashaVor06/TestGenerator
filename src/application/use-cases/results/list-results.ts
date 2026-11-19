// Use case: список результатов пользователя вместе с названиями тестов.

import type { ResultWithTest, TestResultRepository } from "@/application/ports";

export interface ListResultsDeps {
  results: TestResultRepository;
}

export async function listResults(
  userId: string,
  deps: ListResultsDeps
): Promise<ResultWithTest[]> {
  return deps.results.listByUserWithTest(userId);
}
