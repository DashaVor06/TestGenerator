import { describe, expect, it } from "vitest";
import { submitAnswers } from "@/application/use-cases/tests/submit-answers";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";
import {
  makeQuestionWithOptions,
  makeResultRepo,
  makeTest,
  makeTestRepo,
} from "../helpers/fakes";
import type { QuestionWithOptions } from "@/application/ports";

/** Три вопроса: несколько верных, верно/неверно и короткий ответ. */
const questions: QuestionWithOptions[] = [
  makeQuestionWithOptions({
    id: "q1",
    type: "MULTIPLE_CHOICE",
    options: [
      { id: "o1", questionId: "q1", text: "A", isCorrect: true, order: 0 },
      { id: "o2", questionId: "q1", text: "B", isCorrect: false, order: 1 },
      { id: "o3", questionId: "q1", text: "C", isCorrect: true, order: 2 },
    ],
  }),
  makeQuestionWithOptions({
    id: "q2",
    type: "TRUE_FALSE",
    order: 2,
    options: [
      { id: "o4", questionId: "q2", text: "Верно", isCorrect: true, order: 0 },
      { id: "o5", questionId: "q2", text: "Неверно", isCorrect: false, order: 1 },
    ],
  }),
  makeQuestionWithOptions({
    id: "q3",
    type: "SHORT_ANSWER",
    order: 3,
    expectedAnswer: "БД|база данных",
    options: [],
  }),
];

function deps(seedQuestions: QuestionWithOptions[] = questions) {
  const { repo: tests } = makeTestRepo([makeTest()]);
  const { repo: results, created } = makeResultRepo();

  return {
    tests,
    results,
    created,
    questions: {
      findById: async () => null,
      listByTest: async () => seedQuestions,
      listByTestWithOptions: async () => seedQuestions,
      createMany: async () => {},
      create: async () => {
        throw new Error("не используется");
      },
      update: async () => {
        throw new Error("не используется");
      },
      delete: async () => {},
      deleteByTest: async () => {},
    },
  };
}

describe("submitAnswers", () => {
  it("считает 100% при полностью верных ответах", async () => {
    const d = deps();
    const result = await submitAnswers(
      "t1",
      "user-1",
      {
        answers: [
          { questionId: "q1", optionIds: ["o1", "o3"] },
          { questionId: "q2", optionIds: ["o4"] },
          { questionId: "q3", optionIds: [], text: "база данных" },
        ],
      },
      { tests: d.tests, questions: d.questions, results: d.results }
    );

    expect(result.result.score).toBe(3);
    expect(result.result.percentCorrect).toBe(100);
    expect(d.created).toHaveLength(1);
  });

  it("не засчитывает частично выбранные варианты", async () => {
    const d = deps();
    const result = await submitAnswers(
      "t1",
      "user-1",
      {
        answers: [
          { questionId: "q1", optionIds: ["o1"] },
          { questionId: "q2", optionIds: ["o4"] },
          { questionId: "q3", optionIds: [], text: "бд" },
        ],
      },
      { tests: d.tests, questions: d.questions, results: d.results }
    );

    expect(result.result.score).toBe(2);
    expect(Math.round(result.result.percentCorrect)).toBe(67);
  });

  it("возвращает разбор с правильными ответами и пояснениями", async () => {
    const d = deps([
      makeQuestionWithOptions({
        id: "q1",
        type: "SINGLE_CHOICE",
        explanation: "Потому что так написано в материале",
        sourceQuote: "Цитата из материала",
        options: [
          { id: "o1", questionId: "q1", text: "A", isCorrect: true, order: 0 },
          { id: "o2", questionId: "q1", text: "B", isCorrect: false, order: 1 },
        ],
      }),
    ]);

    const result = await submitAnswers(
      "t1",
      "user-1",
      { answers: [{ questionId: "q1", optionIds: ["o2"] }] },
      { tests: d.tests, questions: d.questions, results: d.results }
    );

    const item = result.items[0];
    expect(item.isCorrect).toBe(false);
    expect(item.correctOptionIds).toEqual(["o1"]);
    expect(item.explanation).toBe("Потому что так написано в материале");
    expect(item.sourceQuote).toBe("Цитата из материала");
    // Правильный вариант помечен, но был выбран другой.
    expect(item.options.find((option) => option.id === "o1")?.isCorrect).toBe(true);
    expect(item.options.find((option) => option.id === "o2")?.selected).toBe(true);
  });

  it("выбрасывает NotFoundError, если тест не найден", async () => {
    const d = deps();
    d.tests.findById = async () => null;

    await expect(
      submitAnswers("missing", "user-1", { answers: [{ questionId: "q1", optionIds: [] }] }, {
        tests: d.tests,
        questions: d.questions,
        results: d.results,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("не даёт пройти чужой приватный тест", async () => {
    const d = deps();
    d.tests.findById = async () => makeTest({ ownerId: "other-user", visibility: "PRIVATE" });

    await expect(
      submitAnswers("t1", "user-1", { answers: [{ questionId: "q1", optionIds: [] }] }, {
        tests: d.tests,
        questions: d.questions,
        results: d.results,
      })
    ).rejects.toThrow(ForbiddenError);
  });
});
