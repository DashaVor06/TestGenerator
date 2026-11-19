import { describe, expect, it } from "vitest";
import { MockQuestionGenerator } from "@/infrastructure/external/mock-question-generator";

const generator = new MockQuestionGenerator();

const content =
  "JavaScript — язык программирования. Переменные объявляются через let и const. " +
  "Функции упрощают повторное использование кода. Массивы хранят набор значений.";

describe("MockQuestionGenerator", () => {
  it("генерирует запрошенное количество вопросов", async () => {
    const result = await generator.generate({
      content,
      typeCounts: [{ type: "MULTIPLE_CHOICE", count: 3 }],
      totalCount: 3,
      difficulty: "MEDIUM",
      language: "RU",
      thinking: false,
    });

    expect(result.questions).toHaveLength(3);
    expect(result.usage.costUsd).toBe(0);
  });

  it("создаёт вопросы с вариантами и правильным ответом", async () => {
    const result = await generator.generate({
      content,
      typeCounts: [
        { type: "SINGLE_CHOICE", count: 1 },
        { type: "TRUE_FALSE", count: 1 },
      ],
      totalCount: 2,
      difficulty: null,
      language: "RU",
      thinking: false,
    });

    expect(result.questions).toHaveLength(2);

    for (const question of result.questions) {
      expect(question.text.length).toBeGreaterThan(0);
      expect(question.options.length).toBeGreaterThan(1);
      expect(question.options.some((option) => option.isCorrect)).toBe(true);
    }
  });

  it("для короткого ответа заполняет эталон", async () => {
    const result = await generator.generate({
      content,
      typeCounts: [{ type: "SHORT_ANSWER", count: 1 }],
      totalCount: 1,
      difficulty: "EASY",
      language: "RU",
      thinking: false,
    });

    expect(result.questions[0].expectedAnswer).toBeTruthy();
    expect(result.questions[0].options).toHaveLength(0);
  });

  it("помечает вопросы на размышление уровнем APPLY", async () => {
    const result = await generator.generate({
      content,
      typeCounts: [{ type: "SINGLE_CHOICE", count: 1 }],
      totalCount: 1,
      difficulty: null,
      language: "RU",
      thinking: true,
    });

    expect(result.questions[0].cognitiveLevel).toBe("APPLY");
  });

  it("возвращает пустой список при пустом материале", async () => {
    const result = await generator.generate({
      content: "",
      typeCounts: [{ type: "MULTIPLE_CHOICE", count: 5 }],
      totalCount: 5,
      difficulty: null,
      language: "RU",
      thinking: false,
    });

    expect(result.questions).toHaveLength(0);
  });
});
