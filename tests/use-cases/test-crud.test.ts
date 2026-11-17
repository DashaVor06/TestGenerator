import { describe, expect, it, vi } from "vitest";
import { createTest } from "@/application/use-cases/tests/create-test";
import { listTests } from "@/application/use-cases/tests/list-tests";
import { getTest } from "@/application/use-cases/tests/get-test";
import { updateTest } from "@/application/use-cases/tests/update-test";
import { deleteTest } from "@/application/use-cases/tests/delete-test";
import type {
  CreateTestInput,
  ListTestsParams,
  QuestionRepository,
  QuestionWithOptions,
  TestRepository,
  UpdateTestInput,
} from "@/application/ports";
import type { Test } from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

function makeTest(overrides: Partial<Test> = {}): Test {
  return {
    id: "t1",
    ownerId: "user-1",
    title: "Тест",
    category: null,
    description: null,
    status: "PENDING",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeTestRepo(seed: Test[] = []) {
  const tests = [...seed];
  const repo: TestRepository = {
    findById: vi.fn(async (id: string) => tests.find((t) => t.id === id) ?? null),
    list: vi.fn(async (_params: ListTestsParams) => tests),
    create: vi.fn(async (input: CreateTestInput) => {
      const test: Test = {
        id: `id-${tests.length + 1}`,
        ownerId: input.ownerId,
        title: input.title,
        category: input.category ?? null,
        description: input.description ?? null,
        status: "PENDING",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
      tests.push(test);
      return test;
    }),
    update: vi.fn(async (id: string, input: UpdateTestInput) => {
      const test = tests.find((t) => t.id === id);
      if (!test) throw new Error("not found");
      Object.assign(test, input);
      return test;
    }),
    delete: vi.fn(async (id: string) => {
      const idx = tests.findIndex((t) => t.id === id);
      if (idx >= 0) tests.splice(idx, 1);
    }),
  };
  return { repo, tests };
}

function makeQuestionRepo(questions: QuestionWithOptions[] = []): QuestionRepository {
  return {
    listByTest: vi.fn(async () => []),
    listByTestWithOptions: vi.fn(async (testId: string) =>
      questions.filter((q) => q.testId === testId)
    ),
    createMany: vi.fn(async () => {}),
    deleteByTest: vi.fn(async () => {}),
  };
}

describe("createTest", () => {
  it("создаёт тест с ownerId текущего пользователя", async () => {
    const { repo, tests } = makeTestRepo();
    const test = await createTest(
      "user-1",
      { title: "Мой тест", category: "Программирование" },
      { tests: repo }
    );

    expect(test.ownerId).toBe("user-1");
    expect(test.title).toBe("Мой тест");
    expect(tests).toHaveLength(1);
    expect(repo.create).toHaveBeenCalledWith({
      ownerId: "user-1",
      title: "Мой тест",
      category: "Программирование",
      description: null,
    });
  });
});

describe("listTests", () => {
  it("передаёт ownerId и параметры поиска/сортировки в репозиторий", async () => {
    const { repo } = makeTestRepo();
    await listTests(
      "user-1",
      { search: "js", sortBy: "title", sortOrder: "asc" },
      { tests: repo }
    );

    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "user-1",
        search: "js",
        sortBy: "title",
        sortOrder: "asc",
      })
    );
  });
});

describe("getTest", () => {
  it("возвращает тест с вопросами", async () => {
    const { repo } = makeTestRepo([makeTest()]);
    const questions: QuestionWithOptions[] = [
      {
        id: "q1",
        testId: "t1",
        type: "MULTIPLE_CHOICE",
        text: "Вопрос?",
        difficulty: null,
        explanation: null,
        order: 1,
        options: [],
      },
    ];

    const result = await getTest("t1", "user-1", {
      tests: repo,
      questions: makeQuestionRepo(questions),
    });

    expect(result.id).toBe("t1");
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].id).toBe("q1");
  });

  it("выбрасывает NotFoundError, если тест не найден", async () => {
    const { repo } = makeTestRepo();
    await expect(
      getTest("missing", "user-1", { tests: repo, questions: makeQuestionRepo() })
    ).rejects.toThrow(NotFoundError);
  });

  it("выбрасывает ForbiddenError для чужого теста", async () => {
    const { repo } = makeTestRepo([makeTest({ ownerId: "other-user" })]);
    await expect(
      getTest("t1", "user-1", { tests: repo, questions: makeQuestionRepo() })
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("updateTest", () => {
  it("обновляет тест", async () => {
    const { repo } = makeTestRepo([makeTest()]);
    const updated = await updateTest("t1", "user-1", { title: "Новое название" }, { tests: repo });
    expect(updated.title).toBe("Новое название");
  });

  it("выбрасывает ForbiddenError для чужого теста", async () => {
    const { repo } = makeTestRepo([makeTest({ ownerId: "other-user" })]);
    await expect(
      updateTest("t1", "user-1", { title: "x" }, { tests: repo })
    ).rejects.toThrow(ForbiddenError);
  });

  it("выбрасывает NotFoundError для несуществующего теста", async () => {
    const { repo } = makeTestRepo();
    await expect(
      updateTest("missing", "user-1", { title: "x" }, { tests: repo })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteTest", () => {
  it("удаляет тест", async () => {
    const { repo, tests } = makeTestRepo([makeTest()]);
    await deleteTest("t1", "user-1", { tests: repo });
    expect(tests).toHaveLength(0);
  });

  it("выбрасывает ForbiddenError для чужого теста", async () => {
    const { repo } = makeTestRepo([makeTest({ ownerId: "other-user" })]);
    await expect(deleteTest("t1", "user-1", { tests: repo })).rejects.toThrow(ForbiddenError);
  });
});
