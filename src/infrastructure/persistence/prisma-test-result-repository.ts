// Реализация порта TestResultRepository на Prisma (инфраструктура).

import type { TestResult as PrismaTestResult } from "@/generated/prisma";
import { prisma } from "./prisma";
import type {
  CreateTestResultInput,
  TestResultRepository,
} from "@/application/ports";
import type { TestResult } from "@/domain/entities";

export class PrismaTestResultRepository implements TestResultRepository {
  private map(r: PrismaTestResult): TestResult {
    return {
      id: r.id,
      testId: r.testId,
      userId: r.userId,
      score: r.score,
      percentCorrect: r.percentCorrect,
      completedAt: r.completedAt,
    };
  }

  async create(input: CreateTestResultInput): Promise<TestResult> {
    const result = await prisma.testResult.create({
      data: {
        testId: input.testId,
        userId: input.userId,
        score: input.score,
        percentCorrect: input.percentCorrect,
      },
    });
    return this.map(result);
  }

  async listByUser(userId: string): Promise<TestResult[]> {
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
    });
    return results.map((r) => this.map(r));
  }
}

export const testResultRepository = new PrismaTestResultRepository();
