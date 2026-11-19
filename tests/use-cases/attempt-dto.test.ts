import { describe, expect, it } from "vitest";
import {
  buildAttemptDto,
  buildReviewItems,
} from "@/application/use-cases/tests/attempt-dto";
import { makeQuestionWithOptions, makeTest } from "../helpers/fakes";

const questions = [
  makeQuestionWithOptions({
    id: "q1",
    type: "SINGLE_CHOICE",
    explanation: "Потому что так в материале",
    sourceQuote: "Цитата",
    options: [
      { id: "o1", questionId: "q1", text: "Верный", isCorrect: true, order: 0 },
      { id: "o2", questionId: "q1", text: "Неверный", isCorrect: false, order: 1 },
    ],
  }),
];

describe("buildAttemptDto", () => {
  it("не раскрывает правильные ответы до сдачи", () => {
    const attempt = buildAttemptDto(makeTest(), questions);

    expect(attempt.questions[0].options).toHaveLength(2);
    expect("isCorrect" in attempt.questions[0].options[0]).toBe(false);
  });

  it("считает сумму баллов без вопросов на ручную проверку", () => {
    const attempt = buildAttemptDto(makeTest(), [
      ...questions,
      makeQuestionWithOptions({
        id: "q2",
        type: "OPEN",
        points: 5,
        options: [],
      }),
    ]);

    expect(attempt.totalPoints).toBe(1);
    expect(attempt.questionCount).toBe(2);
  });
});

describe("buildReviewItems", () => {
  it("отмечает выбранные и правильные варианты", () => {
    const items = buildReviewItems(
      questions,
      new Map([
        ["q1", { optionIds: ["o2"], text: null, isCorrect: false }],
      ])
    );

    const item = items[0];
    expect(item.options.find((option) => option.id === "o1")?.isCorrect).toBe(true);
    expect(item.options.find((option) => option.id === "o2")?.selected).toBe(true);
    expect(item.isCorrect).toBe(false);
    expect(item.explanation).toBe("Потому что так в материале");
    expect(item.sourceQuote).toBe("Цитата");
  });

  it("помечает развёрнутый ответ как проверяемый вручную", () => {
    const items = buildReviewItems(
      [makeQuestionWithOptions({ id: "q2", type: "OPEN", options: [] })],
      new Map([["q2", { optionIds: [], text: "Мой ответ", isCorrect: false }]])
    );

    expect(items[0].autoGraded).toBe(false);
    expect(items[0].yourText).toBe("Мой ответ");
  });
});
