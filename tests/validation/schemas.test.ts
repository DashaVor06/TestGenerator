import { describe, expect, it } from "vitest";
import { generateSchema } from "@/application/validation/generation";
import { publicSubmitSchema, submitAnswersSchema } from "@/application/validation/submit";
import { createQuestionSchema } from "@/application/validation/question";
import { createTestSchema } from "@/application/validation/test";

describe("generateSchema", () => {
  it("принимает корректные параметры генерации", () => {
    const result = generateSchema.safeParse({
      materialId: "11111111-1111-4111-8111-111111111111",
      typeCounts: { SINGLE_CHOICE: 3, TRUE_FALSE: 2 },
      difficulty: "MEDIUM",
      thinkingCount: 1,
    });

    expect(result.success).toBe(true);
  });

  it("не принимает пустой набор вопросов", () => {
    const result = generateSchema.safeParse({
      materialId: "11111111-1111-4111-8111-111111111111",
      typeCounts: {},
      thinkingCount: 0,
    });

    expect(result.success).toBe(false);
  });

  it("не принимает больше 50 вопросов", () => {
    const result = generateSchema.safeParse({
      materialId: "11111111-1111-4111-8111-111111111111",
      typeCounts: { SINGLE_CHOICE: 50, TRUE_FALSE: 5 },
      thinkingCount: 0,
    });

    expect(result.success).toBe(false);
  });

  it("не принимает «на размышление» больше общего количества", () => {
    const result = generateSchema.safeParse({
      materialId: "11111111-1111-4111-8111-111111111111",
      typeCounts: { SINGLE_CHOICE: 2 },
      thinkingCount: 3,
    });

    expect(result.success).toBe(false);
  });
});

describe("submitAnswersSchema", () => {
  it("принимает ответы с выбранными вариантами и текстом", () => {
    const result = submitAnswersSchema.safeParse({
      answers: [{ questionId: "q1", optionIds: ["o1"], text: null }],
      durationMs: 30_000,
    });

    expect(result.success).toBe(true);
  });

  it("не принимает пустой список ответов", () => {
    const result = submitAnswersSchema.safeParse({ answers: [] });
    expect(result.success).toBe(false);
  });

  it("гостевая сдача допускает имя", () => {
    const result = publicSubmitSchema.safeParse({
      guestName: "Аня",
      answers: [{ questionId: "q1", optionIds: [] }],
    });

    expect(result.success).toBe(true);
  });
});

describe("createQuestionSchema", () => {
  it("принимает вопрос с вариантами", () => {
    const result = createQuestionSchema.safeParse({
      type: "SINGLE_CHOICE",
      text: "Что такое JavaScript?",
      options: [
        { text: "Язык программирования", isCorrect: true },
        { text: "База данных", isCorrect: false },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("по умолчанию ставит балл за вопрос", () => {
    const result = createQuestionSchema.safeParse({
      type: "OPEN",
      text: "Объясните разницу",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.points).toBe(1);
      expect(result.data.options).toEqual([]);
    }
  });
});

describe("createTestSchema", () => {
  it("принимает тест с языком", () => {
    const result = createTestSchema.safeParse({ title: "Тест", language: "EN" });
    expect(result.success).toBe(true);
  });

  it("не принимает слишком короткое название", () => {
    const result = createTestSchema.safeParse({ title: "Я" });
    expect(result.success).toBe(false);
  });
});
