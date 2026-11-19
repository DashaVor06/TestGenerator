import { describe, expect, it } from "vitest";
import { normalizeQuestionData } from "@/application/use-cases/tests/question-rules";
import { ValidationError } from "@/domain/errors/domain-error";

const twoOptions = [
  { text: "Верный", isCorrect: true },
  { text: "Неверный", isCorrect: false },
];

describe("normalizeQuestionData", () => {
  it("принимает вопрос с одним верным вариантом", () => {
    const result = normalizeQuestionData({
      type: "SINGLE_CHOICE",
      options: twoOptions,
      expectedAnswer: null,
    });

    expect(result.options).toHaveLength(2);
    expect(result.options[0]).toMatchObject({ text: "Верный", isCorrect: true, order: 0 });
  });

  it("требует ровно один верный вариант для одиночного выбора", () => {
    expect(() =>
      normalizeQuestionData({
        type: "SINGLE_CHOICE",
        options: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: true },
        ],
        expectedAnswer: null,
      })
    ).toThrow(ValidationError);
  });

  it("требует минимум два варианта", () => {
    expect(() =>
      normalizeQuestionData({
        type: "MULTIPLE_CHOICE",
        options: [{ text: "A", isCorrect: true }],
        expectedAnswer: null,
      })
    ).toThrow(ValidationError);
  });

  it("для «верно/неверно» требует ровно два варианта", () => {
    expect(() =>
      normalizeQuestionData({
        type: "TRUE_FALSE",
        options: [
          { text: "Верно", isCorrect: true },
          { text: "Неверно", isCorrect: false },
          { text: "Не знаю", isCorrect: false },
        ],
        expectedAnswer: null,
      })
    ).toThrow(ValidationError);
  });

  it("для короткого ответа требует эталон", () => {
    expect(() =>
      normalizeQuestionData({
        type: "SHORT_ANSWER",
        options: [],
        expectedAnswer: "   ",
      })
    ).toThrow(ValidationError);
  });

  it("для развёрнутого ответа убирает варианты", () => {
    const result = normalizeQuestionData({
      type: "OPEN",
      options: twoOptions,
      expectedAnswer: null,
    });

    expect(result.options).toHaveLength(0);
    expect(result.expectedAnswer).toBeNull();
  });
});
