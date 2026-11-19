import { describe, expect, it } from "vitest";
import {
  canAutoGrade,
  gradeAttempt,
  gradeQuestion,
  normalizeAnswerText,
  type ScorableQuestion,
} from "@/domain/scoring";

function choice(
  type: ScorableQuestion["type"],
  correctIds: string[],
  points = 1
): ScorableQuestion {
  const allIds = ["o1", "o2", "o3", "o4"];

  return {
    id: "q1",
    type,
    points,
    expectedAnswer: null,
    options: allIds.map((id) => ({ id, isCorrect: correctIds.includes(id) })),
  };
}

describe("normalizeAnswerText", () => {
  it("приводит регистр, лишние пробелы и ё к одному виду", () => {
    expect(normalizeAnswerText("  БАЗА   данных ")).toBe("база данных");
    expect(normalizeAnswerText("Ёлка")).toBe("елка");
  });

  it("убирает знаки препинания и нормализует десятичную запятую", () => {
    expect(normalizeAnswerText("2,5 кг.")).toBe("2.5 кг");
  });
});

describe("canAutoGrade", () => {
  it("развёрнутый ответ проверяется вручную", () => {
    expect(canAutoGrade(choice("OPEN", []))).toBe(false);
  });

  it("вопрос без вариантов нельзя проверить автоматически", () => {
    expect(
      canAutoGrade({ id: "q", type: "SINGLE_CHOICE", points: 1, expectedAnswer: null, options: [] })
    ).toBe(false);
  });

  it("короткий ответ проверяется, если есть эталон", () => {
    expect(
      canAutoGrade({
        id: "q",
        type: "SHORT_ANSWER",
        points: 1,
        expectedAnswer: "БД",
        options: [],
      })
    ).toBe(true);
  });
});

describe("gradeQuestion", () => {
  it("засчитывает верный выбор одного варианта", () => {
    const result = gradeQuestion(choice("SINGLE_CHOICE", ["o2"]), {
      questionId: "q1",
      optionIds: ["o2"],
    });

    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(1);
  });

  it("не засчитывает частичный выбор при нескольких верных", () => {
    const result = gradeQuestion(choice("MULTIPLE_CHOICE", ["o1", "o3"]), {
      questionId: "q1",
      optionIds: ["o1"],
    });

    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });

  it("засчитывает короткий ответ с допустимым вариантом", () => {
    const result = gradeQuestion(
      {
        id: "q1",
        type: "SHORT_ANSWER",
        points: 1,
        expectedAnswer: "БД|база данных",
        options: [],
      },
      { questionId: "q1", optionIds: [], text: "  База  данных " }
    );

    expect(result.isCorrect).toBe(true);
  });

  it("не засчитывает неверный короткий ответ", () => {
    const result = gradeQuestion(
      { id: "q1", type: "SHORT_ANSWER", points: 1, expectedAnswer: "БД", options: [] },
      { questionId: "q1", optionIds: [], text: "файл" }
    );

    expect(result.isCorrect).toBe(false);
  });

  it("начисляет баллы с учётом веса вопроса", () => {
    const result = gradeQuestion(choice("SINGLE_CHOICE", ["o1"], 3), {
      questionId: "q1",
      optionIds: ["o1"],
    });

    expect(result.pointsAwarded).toBe(3);
  });

  it("помечает развёрнутый ответ как непроверяемый автоматически", () => {
    const result = gradeQuestion(choice("OPEN", []), {
      questionId: "q1",
      optionIds: [],
      text: "Развёрнутое рассуждение",
    });

    expect(result.autoGraded).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });
});

describe("gradeAttempt", () => {
  it("считает сумму баллов и процент", () => {
    const questions: ScorableQuestion[] = [
      choice("SINGLE_CHOICE", ["o1"], 2),
      choice("TRUE_FALSE", ["o3"], 1),
    ];

    const result = gradeAttempt(questions, [
      { questionId: "q1", optionIds: ["o1"] },
    ]);

    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(3);
    expect(result.percentCorrect).toBe(67);
  });

  it("исключает развёрнутые ответы из максимума баллов", () => {
    const questions: ScorableQuestion[] = [
      choice("SINGLE_CHOICE", ["o1"], 1),
      { id: "q2", type: "OPEN", points: 5, expectedAnswer: null, options: [] },
    ];

    const result = gradeAttempt(questions, []);

    expect(result.maxScore).toBe(1);
    expect(result.answers).toHaveLength(2);
  });
});
