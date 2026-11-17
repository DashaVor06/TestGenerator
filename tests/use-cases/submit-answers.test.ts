import { describe, expect, it, vi } from "vitest";
import { submitAnswers } from "@/application/use-cases/tests/submit-answers";
import type {
  QuestionRepository,
  QuestionWithOptions,
  TestRepository,
  TestResultRepository,
} from "@/application/ports";
import type { Test, TestResult } from "@/domain/entities";
import { NotFoundError } from "@/domain/errors/domain-error";

const questions: QuestionWithOptions[] = [
  {
    id: "q1",
    testId: "t1",
    type: "MULTIPLE_CHOICE",
    text: "Вопрос 1",
    difficulty: null,
    explanation: null,
    order: 1,
    options: [
      { id: "o1", questionId: "q1", text: "A", isCorrect: true },
      { id: "o2", questionId: "q1", text: "B", isCorrect: false },
      { id: "o3", questionId: "q1", text: "C", isCorrect: true },
    ],
  },
  {
    id: "q2",
    testId: "t1",
    type: "TRUE_FALSE",
    text: "Вопрос 2",
    difficulty: null,
    explanation: null,
    order: 2,
    options: [
      { id: "o4", questionId: "q2", text: "Верно", isCorrect: true },
      { id: "o5", questionId: "q2", text: "Неверно", isCorrect: false },
    ],
  },
];

const test: Test = {
  id: "t1",
  ownerId: "user-1",
  title: "Тест",
  category: null,
  description: null,
  status: "READY",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function makeTestRepo(): TestRepository {
  return {
    findById: vi.fn(async () => test),
    list: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function makeQuestionRepo(): QuestionRepository {
  return {
    listByTest: vi.fn(async () => []),
    listByTestWithOptions: vi.fn(async () => questions),
    createMany: vi.fn(),
    deleteByTest: vi.fn(),
  };
}

function makeResultRepo() {
  const created: TestResult[] = [];
  const repo: TestResultRepository = {
    create: vi.fn(async (input) => {
      const result: TestResult = {
        id: `r-${created.length + 1}`,
        testId: input.testId,
        userId: input.userId,
        score: input.score,
        percentCorrect: input.percentCorrect,
        completedAt: new Date(),
      };
      created.push(result);
      return result;
    }),
    listByUser: vi.fn(async () => []),
  };
  return { repo, created };
}

describe("submitAnswers", () => {
  it("считает 100% при полностью верных ответах", async () => {
    const { repo, created } = makeResultRepo();
    const result = await submitAnswers(
      "t1",
      "user-1",
      {
        answers: [
          { questionId: "q1", optionIds: ["o1", "o3"] },
          { questionId: "q2", optionIds: ["o4"] },
        ],
      },
      { tests: makeTestRepo(), questions: makeQuestionRepo(), results: repo }
    );

    expect(result.score).toBe(2);
    expect(result.percentCorrect).toBe(100);
    expect(created).toHaveLength(1);
  });

  it("считает 0 при неверных ответах", async () => {
    const { repo } = makeResultRepo();
    const result = await submitAnswers(
      "t1",
      "user-1",
      {
        answers: [
          { questionId: "q1", optionIds: ["o2"] },
          { questionId: "q2", optionIds: ["o5"] },
        ],
      },
      { tests: makeTestRepo(), questions: makeQuestionRepo(), results: repo }
    );

    expect(result.score).toBe(0);
    expect(result.percentCorrect).toBe(0);
  });

  it("считает частичный результат", async () => {
    const { repo } = makeResultRepo();
    const result = await submitAnswers(
      "t1",
      "user-1",
      {
        answers: [
          { questionId: "q1", optionIds: ["o1", "o3"] },
          { questionId: "q2", optionIds: ["o5"] },
        ],
      },
      { tests: makeTestRepo(), questions: makeQuestionRepo(), results: repo }
    );

    expect(result.score).toBe(1);
    expect(result.percentCorrect).toBe(50);
  });

  it("выбрасывает NotFoundError, если тест не найден", async () => {
    const repo = makeTestRepo();
    repo.findById = vi.fn(async () => null);

    await expect(
      submitAnswers("missing", "user-1", { answers: [] }, {
        tests: repo,
        questions: makeQuestionRepo(),
        results: makeResultRepo().repo,
      })
    ).rejects.toThrow(NotFoundError);
  });
});
