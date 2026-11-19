import { describe, expect, it } from "vitest";
import { createTest } from "@/application/use-cases/tests/create-test";
import { listTests } from "@/application/use-cases/tests/list-tests";
import { getTest } from "@/application/use-cases/tests/get-test";
import { updateTest } from "@/application/use-cases/tests/update-test";
import { deleteTest } from "@/application/use-cases/tests/delete-test";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";
import {
  makeQuestionWithOptions,
  makeQuestionRepo,
  makeTest,
  makeTestRepo,
} from "../helpers/fakes";

describe("createTest", () => {
  it("создаёт тест с владельцем, языком и приватностью по умолчанию", async () => {
    const { repo } = makeTestRepo();

    const test = await createTest(
      "user-1",
      { title: "Мой тест", category: "Программирование", language: "EN" },
      { tests: repo }
    );

    expect(test.ownerId).toBe("user-1");
    expect(test.language).toBe("EN");
    expect(test.visibility).toBe("PRIVATE");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "user-1",
        title: "Мой тест",
        category: "Программирование",
        language: "EN",
        visibility: "PRIVATE",
      })
    );
  });
});

describe("listTests", () => {
  it("передаёт поиск, сортировку и постраничный вывод в репозиторий", async () => {
    const { repo } = makeTestRepo();
    const result = await listTests(
      "user-1",
      { search: "js", sortBy: "title", sortOrder: "asc", page: 2, limit: 10 },
      { tests: repo }
    );

    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "user-1",
        search: "js",
        sortBy: "title",
        sortOrder: "asc",
        skip: 10,
        take: 10,
      })
    );
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(0);
  });
});

describe("getTest", () => {
  it("возвращает тест с вопросами", async () => {
    const { repo } = makeTestRepo([makeTest()]);
    const { repo: questions } = makeQuestionRepo([
      makeQuestionWithOptions({ id: "q1", testId: "t1" }),
    ]);

    const result = await getTest("t1", "user-1", { tests: repo, questions });

    expect(result.id).toBe("t1");
    expect(result.questions).toHaveLength(1);
  });

  it("выбрасывает NotFoundError, если тест не найден", async () => {
    const { repo } = makeTestRepo();
    const { repo: questions } = makeQuestionRepo();

    await expect(getTest("missing", "user-1", { tests: repo, questions })).rejects.toThrow(
      NotFoundError
    );
  });

  it("выбрасывает ForbiddenError для чужого теста", async () => {
    const { repo } = makeTestRepo([makeTest({ ownerId: "other-user" })]);
    const { repo: questions } = makeQuestionRepo();

    await expect(getTest("t1", "user-1", { tests: repo, questions })).rejects.toThrow(
      ForbiddenError
    );
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

    await expect(updateTest("t1", "user-1", { title: "x" }, { tests: repo })).rejects.toThrow(
      ForbiddenError
    );
  });

  it("выбрасывает NotFoundError для несуществующего теста", async () => {
    const { repo } = makeTestRepo();

    await expect(updateTest("missing", "user-1", { title: "x" }, { tests: repo })).rejects.toThrow(
      NotFoundError
    );
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
