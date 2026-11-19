// Реализация порта TestRepository на Prisma (инфраструктура).

import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { mapTest } from "./mappers";
import type {
  CreateTestInput,
  ListTestsParams,
  TestRepository,
  UpdateTestInput,
} from "@/application/ports";
import type { Test, Visibility } from "@/domain/entities";

export class PrismaTestRepository implements TestRepository {
  /** Собирает условие WHERE по параметрам поиска и фильтрации. */
  private buildWhere(params: ListTestsParams): Prisma.TestWhereInput {
    const where: Prisma.TestWhereInput = {};

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }
    if (params.visibility) {
      where.visibility = params.visibility;
    }
    if (params.category) {
      where.category = params.category;
    }
    if (params.search) {
      // Поиск по названию и описанию без учёта регистра.
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  async findById(id: string): Promise<Test | null> {
    const test = await prisma.test.findUnique({ where: { id } });
    return test ? mapTest(test) : null;
  }

  async findByShareToken(token: string): Promise<Test | null> {
    const test = await prisma.test.findUnique({ where: { shareToken: token } });
    return test ? mapTest(test) : null;
  }

  async list(params: ListTestsParams): Promise<Test[]> {
    const orderBy: Prisma.TestOrderByWithRelationInput =
      params.sortBy === "title"
        ? { title: params.sortOrder ?? "asc" }
        : { createdAt: params.sortOrder ?? "desc" };

    const tests = await prisma.test.findMany({
      where: this.buildWhere(params),
      orderBy,
      skip: params.skip ?? 0,
      take: params.take ?? 50,
    });

    return tests.map(mapTest);
  }

  async count(params: ListTestsParams): Promise<number> {
    return prisma.test.count({ where: this.buildWhere(params) });
  }

  /** Уникальные категории тестов — используются в фильтре. */
  async listCategories(params: {
    ownerId?: string;
    visibility?: Visibility;
  }): Promise<string[]> {
    const where: Prisma.TestWhereInput = { category: { not: null } };

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }
    if (params.visibility) {
      where.visibility = params.visibility;
    }

    const rows = await prisma.test.findMany({
      where,
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return rows
      .map((row) => row.category)
      .filter((category): category is string => Boolean(category));
  }

  async create(input: CreateTestInput): Promise<Test> {
    const test = await prisma.test.create({
      data: {
        ownerId: input.ownerId,
        title: input.title,
        category: input.category ?? null,
        description: input.description ?? null,
        language: input.language ?? "RU",
        visibility: input.visibility ?? "PRIVATE",
        materialId: input.materialId ?? null,
      },
    });
    return mapTest(test);
  }

  async update(id: string, input: UpdateTestInput): Promise<Test> {
    // UncheckedUpdateInput позволяет менять скалярный materialId напрямую.
    const data: Prisma.TestUncheckedUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.shareToken !== undefined ? { shareToken: input.shareToken } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.materialId !== undefined ? { materialId: input.materialId } : {}),
      ...(input.settings !== undefined
        ? {
            settings:
              input.settings === null
                ? Prisma.DbNull
                : (input.settings as unknown as Prisma.InputJsonValue),
          }
        : {}),
    };

    const test = await prisma.test.update({ where: { id }, data });
    return mapTest(test);
  }

  async delete(id: string): Promise<void> {
    await prisma.test.delete({ where: { id } });
  }
}

export const testRepository = new PrismaTestRepository();
