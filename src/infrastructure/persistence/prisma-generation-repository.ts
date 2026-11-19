// Реализация порта GenerationRepository на Prisma (инфраструктура).

import { prisma } from "./prisma";
import type { CreateGenerationInput, GenerationRepository } from "@/application/ports";
import type { Generation } from "@/domain/entities";

export class PrismaGenerationRepository implements GenerationRepository {
  async create(input: CreateGenerationInput): Promise<Generation> {
    return prisma.generation.create({ data: input });
  }

  async listByTest(testId: string): Promise<Generation[]> {
    return prisma.generation.findMany({
      where: { testId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Суммарные расходы пользователя на генерацию (в долларах). */
  async totalCostByUser(userId: string): Promise<number> {
    const aggregate = await prisma.generation.aggregate({
      where: { userId },
      _sum: { costUsd: true },
    });
    return aggregate._sum.costUsd ?? 0;
  }
}

export const generationRepository = new PrismaGenerationRepository();
