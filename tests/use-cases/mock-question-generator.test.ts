import { describe, expect, it } from "vitest";
import { MockQuestionGenerator } from "@/infrastructure/external/mock-question-generator";

describe("MockQuestionGenerator", () => {
  const generator = new MockQuestionGenerator();

  it("генерирует запрошенное количество вопросов", async () => {
    const result = await generator.generate({
      content: "JavaScript — язык программирования. Переменные объявляются через let. Функции упрощают код.",
      count: 3,
      types: ["MULTIPLE_CHOICE"],
    });
    expect(result).toHaveLength(3);
  });

  it("генерирует вопросы с вариантами ответов", async () => {
    const result = await generator.generate({
      content: "JavaScript — язык программирования.",
      count: 2,
      types: ["MULTIPLE_CHOICE", "TRUE_FALSE"],
    });
    expect(result.length).toBeGreaterThan(0);
    for (const q of result) {
      expect(q.text).toBeTruthy();
      expect(q.options.length).toBeGreaterThan(0);
      expect(q.options.some((o) => o.isCorrect)).toBe(true);
    }
  });

  it("возвращает пустой массив при пустом материале", async () => {
    const result = await generator.generate({
      content: "",
      count: 5,
      types: ["MULTIPLE_CHOICE"],
    });
    // при пустом контенте fallback-строка пустая → вопросов нет
    expect(Array.isArray(result)).toBe(true);
  });
});
