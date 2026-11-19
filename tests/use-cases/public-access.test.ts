import { describe, expect, it } from "vitest";
import { getPublicTest } from "@/application/use-cases/public/get-public-test";
import { submitPublicAttempt } from "@/application/use-cases/public/submit-public-attempt";
import { NotFoundError } from "@/domain/errors/domain-error";
import {
  makeQuestionWithOptions,
  makeQuestionRepo,
  makeResultRepo,
  makeTest,
  makeTestRepo,
} from "../helpers/fakes";

const questions = [
  makeQuestionWithOptions({
    id: "q1",
    type: "SINGLE_CHOICE",
    options: [
      { id: "o1", questionId: "q1", text: "Верный", isCorrect: true, order: 0 },
      { id: "o2", questionId: "q1", text: "Неверный", isCorrect: false, order: 1 },
    ],
  }),
];

function deps(visibility: "PRIVATE" | "UNLISTED" | "PUBLIC", token = "abc") {
  const { repo: tests } = makeTestRepo([
    makeTest({ visibility, shareToken: token, status: "READY" }),
  ]);
  const { repo: questionRepo } = makeQuestionRepo(questions);
  const { repo: results, created } = makeResultRepo();

  return { tests, questions: questionRepo, results, created };
}

describe("getPublicTest", () => {
  it("отдаёт тест по ссылке без правильных ответов", async () => {
    const d = deps("UNLISTED");
    const attempt = await getPublicTest("abc", { tests: d.tests, questions: d.questions });

    expect(attempt.questionCount).toBe(1);
    expect(attempt.questions[0].options).toHaveLength(2);
    // В вариантах не должно быть признака правильного ответа.
    expect("isCorrect" in attempt.questions[0].options[0]).toBe(false);
  });

  it("не отдаёт приватный тест по ссылке", async () => {
    const d = deps("PRIVATE");
    await expect(
      getPublicTest("abc", { tests: d.tests, questions: d.questions })
    ).rejects.toThrow(NotFoundError);
  });

  it("не отдаёт тест с неверной ссылкой", async () => {
    const d = deps("PUBLIC");
    await expect(
      getPublicTest("wrong-token", { tests: d.tests, questions: d.questions })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("submitPublicAttempt", () => {
  it("сохраняет гостевой результат без пользователя", async () => {
    const d = deps("UNLISTED");

    const result = await submitPublicAttempt(
      "abc",
      null,
      {
        guestName: "Аня",
        answers: [{ questionId: "q1", optionIds: ["o1"] }],
      },
      { tests: d.tests, questions: d.questions, results: d.results }
    );

    expect(result.result.userId).toBeNull();
    expect(result.result.guestName).toBe("Аня");
    expect(result.result.percentCorrect).toBe(100);
    expect(d.created).toHaveLength(1);
  });

  it("подставляет имя «Гость», если имя не указано", async () => {
    const d = deps("PUBLIC");

    const result = await submitPublicAttempt(
      "abc",
      null,
      { answers: [{ questionId: "q1", optionIds: ["o2"] }] },
      { tests: d.tests, questions: d.questions, results: d.results }
    );

    expect(result.result.guestName).toBe("Гость");
    expect(result.result.score).toBe(0);
  });

  it("сохраняет результат авторизованному пользователю", async () => {
    const d = deps("PUBLIC");

    const result = await submitPublicAttempt(
      "abc",
      "user-1",
      { answers: [{ questionId: "q1", optionIds: ["o1"] }] },
      { tests: d.tests, questions: d.questions, results: d.results }
    );

    expect(result.result.userId).toBe("user-1");
    expect(result.result.guestName).toBeNull();
  });

  it("не даёт сдать приватный тест по ссылке", async () => {
    const d = deps("PRIVATE");

    await expect(
      submitPublicAttempt(
        "abc",
        null,
        { answers: [{ questionId: "q1", optionIds: ["o1"] }] },
        { tests: d.tests, questions: d.questions, results: d.results }
      )
    ).rejects.toThrow(NotFoundError);
  });
});
