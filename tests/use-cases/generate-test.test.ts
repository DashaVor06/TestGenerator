import { describe, expect, it, vi } from "vitest";
import {
  generateTest,
  splitTypeCounts,
  toTypeCounts,
} from "@/application/use-cases/tests/generate-test";
import type {
  CreateQuestionInput,
  GenerateQuestionsParams,
  GenerationResult,
  QuestionGenerator,
  UpdateTestInput,
} from "@/application/ports";
import { ForbiddenError } from "@/domain/errors/domain-error";
import {
  makeGenerationRepo,
  makeMaterial,
  makeMaterialRepo,
  makeNotifier,
  makeQuestionRepo,
  makeTest,
  makeTestRepo,
} from "../helpers/fakes";

/** Генератор-заглушка: возвращает ровно столько вопросов, сколько попросили. */
function makeGenerator(): QuestionGenerator {
  return {
    generate: vi.fn(async (params: GenerateQuestionsParams): Promise<GenerationResult> => {
      const questions = [];

      for (const item of params.typeCounts) {
        for (let index = 0; index < item.count; index += 1) {
          questions.push({
            type: item.type,
            text: `Вопрос ${questions.length + 1}`,
            difficulty: "MEDIUM" as const,
            cognitiveLevel: params.thinking ? ("APPLY" as const) : ("REMEMBER" as const),
            explanation: "Пояснение",
            sourceQuote: "Цитата из материала",
            expectedAnswer: item.type === "SHORT_ANSWER" ? "ответ" : null,
            options:
              item.type === "SHORT_ANSWER" || item.type === "OPEN"
                ? []
                : [
                    { text: "Верный", isCorrect: true },
                    { text: "Неверный", isCorrect: false },
                  ],
          });
        }
      }

      return {
        questions,
        usage: {
          model: "deepseek-flash",
          effort: params.thinking ? "high" : "low",
          inputTokens: 1000,
          outputTokens: 500,
          cacheHitTokens: 0,
          costUsd: 0.001,
          durationMs: 120,
        },
      };
    }),
  };
}

function deps() {
  const { repo: tests, tests: testList } = makeTestRepo([makeTest({ status: "PENDING" })]);
  const { repo: materials } = makeMaterialRepo([makeMaterial()]);
  const { repo: questions, questions: questionList } = makeQuestionRepo();
  const generations = makeGenerationRepo();
  const notifier = makeNotifier();
  const generator = makeGenerator();

  return {
    tests,
    testList,
    materials,
    questions,
    questionList,
    generations,
    notifier,
    generator,
  };
}

describe("toTypeCounts и splitTypeCounts", () => {
  it("убирает нулевые типы и сохраняет порядок", () => {
    const counts = toTypeCounts({ TRUE_FALSE: 2, SINGLE_CHOICE: 3, OPEN: 0 });

    expect(counts).toEqual([
      { type: "SINGLE_CHOICE", count: 3 },
      { type: "TRUE_FALSE", count: 2 },
    ]);
  });

  it("делит вопросы на обычные и «на размышление» без потерь", () => {
    const { basic, thinking } = splitTypeCounts(
      [
        { type: "SINGLE_CHOICE", count: 5 },
        { type: "TRUE_FALSE", count: 5 },
      ],
      3
    );

    const thinkingTotal = thinking.reduce((sum, item) => sum + item.count, 0);
    const basicTotal = basic.reduce((sum, item) => sum + item.count, 0);

    expect(thinkingTotal).toBe(3);
    expect(basicTotal).toBe(7);
  });

  it("при нуле все вопросы обычные", () => {
    const { basic, thinking } = splitTypeCounts([{ type: "SINGLE_CHOICE", count: 4 }], 0);

    expect(basic).toHaveLength(1);
    expect(thinking).toHaveLength(0);
  });

  it("если «на размышление» запрошены все — обычных не остаётся", () => {
    const { basic, thinking } = splitTypeCounts([{ type: "SINGLE_CHOICE", count: 4 }], 4);

    expect(basic).toHaveLength(0);
    expect(thinking[0].count).toBe(4);
  });
});

describe("generateTest", () => {
  it("делает два запроса к ИИ: дешёвый и дорогой, и сохраняет вопросы", async () => {
    const d = deps();

    const result = await generateTest(
      "t1",
      "user-1",
      {
        materialId: "m1",
        typeCounts: { SINGLE_CHOICE: 3, TRUE_FALSE: 1 },
        difficulty: "MEDIUM",
        thinkingCount: 1,
      },
      {
        tests: d.tests,
        materials: d.materials,
        questions: d.questions,
        generator: d.generator,
        notifier: d.notifier,
        generations: d.generations,
      }
    );

    expect(result.questionCount).toBe(4);
    expect(d.generator.generate).toHaveBeenCalledTimes(2);

    const calls = vi.mocked(d.generator.generate).mock.calls;
    expect(calls[0][0].thinking).toBe(false);
    expect(calls[0][0].totalCount).toBe(3);
    expect(calls[1][0].thinking).toBe(true);
    expect(calls[1][0].totalCount).toBe(1);

    // Старые вопросы удаляются, чтобы не было дублей.
    expect(d.questions.deleteByTest).toHaveBeenCalledWith("t1");
    expect(d.questions.createMany).toHaveBeenCalledTimes(1);

    const [, saved] = vi.mocked(d.questions.createMany).mock.calls[0];
    expect(saved.map((question: CreateQuestionInput) => question.order)).toEqual([1, 2, 3, 4]);

    expect(d.tests.update).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ status: "READY", materialId: "m1" })
    );
  });

  it("сохраняет настройки последней генерации", async () => {
    const d = deps();

    await generateTest(
      "t1",
      "user-1",
      {
        materialId: "m1",
        typeCounts: { SINGLE_CHOICE: 2 },
        difficulty: "HARD",
        thinkingCount: 2,
      },
      {
        tests: d.tests,
        materials: d.materials,
        questions: d.questions,
        generator: d.generator,
        notifier: d.notifier,
        generations: d.generations,
      }
    );

    const updateCall = vi
      .mocked(d.tests.update)
      .mock.calls.find(
        (call: [string, UpdateTestInput]) => call[1].settings !== undefined
      );

    expect(updateCall?.[1].settings).toMatchObject({
      questionCount: 2,
      thinkingCount: 2,
      difficulty: "HARD",
      materialId: "m1",
    });
  });

  it("переводит тест в статус ERROR, если ИИ вернул ошибку", async () => {
    const d = deps();
    d.generator.generate = vi.fn(async () => {
      throw new Error("Сервис недоступен");
    });

    await expect(
      generateTest(
        "t1",
        "user-1",
        {
          materialId: "m1",
          typeCounts: { SINGLE_CHOICE: 2 },
          difficulty: null,
          thinkingCount: 0,
        },
        {
          tests: d.tests,
          materials: d.materials,
          questions: d.questions,
          generator: d.generator,
          notifier: d.notifier,
          generations: d.generations,
        }
      )
    ).rejects.toThrow("Сервис недоступен");

    expect(d.tests.update).toHaveBeenCalledWith("t1", { status: "ERROR" });
  });

  it("не даёт генерировать вопросы в чужой тест", async () => {
    const d = deps();
    d.tests.findById = async () => makeTest({ ownerId: "other-user" });

    await expect(
      generateTest(
        "t1",
        "user-1",
        {
          materialId: "m1",
          typeCounts: { SINGLE_CHOICE: 1 },
          difficulty: null,
          thinkingCount: 0,
        },
        {
          tests: d.tests,
          materials: d.materials,
          questions: d.questions,
          generator: d.generator,
          notifier: d.notifier,
          generations: d.generations,
        }
      )
    ).rejects.toThrow(ForbiddenError);
  });
});
