// Реализация порта TestRepository на Prisma (инфраструктура).

import type { Prisma, Test as PrismaTest } from "@/generated/prisma";
import { prisma } from "./prisma";
import type {
  CreateTestInput,
  ListTestsParams,
  TestRepository,
  UpdateTestInput,
} from "@/application/ports";
import type { Test } from "@/domain/entities";

export class PrismaTestRepository implements TestRepository {
  private map(t: PrismaTest): Test {
    return {
      id: t.id,
      ownerId: t.ownerId,
      title: t.title,
      category: t.category,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    };
  }

  async findById(id: string): Promise<Test | null> {
    const test = await prisma.test.findUnique({ where: { id } });
    return test ? this.map(test) : null;
  }

  async list(params: ListTestsParams): Promise<Test[]> {
    const where: Prisma.TestWhereInput = {};

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }
    if (params.category) {
      where.category = params.category;
    }
    if (params.search) {
      where.title = { contains: params.search, mode: "insensitive" };
    }

    const orderBy: Prisma.TestOrderByWithRelationInput =
      params.sortBy === "title"
        ? { title: params.sortOrder ?? "asc" }
        : { createdAt: params.sortOrder ?? "desc" };

    const tests = await prisma.test.findMany({ where, orderBy });
    return tests.map((t) => this.map(t));
  }

  async create(input: CreateTestInput): Promise<Test> {
    const test = await prisma.test.create({
      data: {
        ownerId: input.ownerId,
        title: input.title,
        category: input.category ?? null,
        description: input.description ?? null,
      },
    });
    return this.map(test);
  }

  async update(id: string, input: UpdateTestInput): Promise<Test> {
    const test = await prisma.test.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return this.map(test);
  }

  async delete(id: string): Promise<void> {
    await prisma.test.delete({ where: { id } });
  }
}

export const testRepository = new PrismaTestRepository();
