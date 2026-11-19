// Общие «заглушки» репозиториев для unit-тестов.
// Позволяют проверять use cases без реальной базы данных.

import { vi } from "vitest";
import type {
  GenerationRepository,
  MaterialRepository,
  Notifier,
  QuestionRepository,
  QuestionWithOptions,
  TestRepository,
  TestResultRepository,
} from "@/application/ports";
import type {
  AnswerOption,
  Material,
  Question,
  Test,
  TestAnswer,
  TestResult,
} from "@/domain/entities";

export function makeTest(overrides: Partial<Test> = {}): Test {
  return {
    id: "t1",
    ownerId: "user-1",
    materialId: "m1",
    title: "Тест",
    category: null,
    description: null,
    language: "RU",
    visibility: "PRIVATE",
    shareToken: null,
    status: "READY",
    settings: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function makeAnswerOption(overrides: Partial<AnswerOption> = {}): AnswerOption {
  return {
    id: "o1",
    questionId: "q1",
    text: "Вариант",
    isCorrect: false,
    order: 0,
    ...overrides,
  };
}

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    testId: "t1",
    type: "SINGLE_CHOICE",
    text: "Вопрос?",
    difficulty: "MEDIUM",
    cognitiveLevel: "REMEMBER",
    explanation: null,
    sourceQuote: null,
    expectedAnswer: null,
    points: 1,
    order: 1,
    ...overrides,
  };
}

export function makeQuestionWithOptions(
  overrides: Partial<QuestionWithOptions> = {}
): QuestionWithOptions {
  return {
    ...makeQuestion(overrides),
    options: [],
    ...overrides,
  };
}

export function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: "m1",
    ownerId: "user-1",
    title: "Материал",
    content: "Достаточно длинный текст материала для генерации вопросов.",
    fileUrl: null,
    fileType: null,
    source: "TEXT",
    sourceUrl: null,
    status: "READY",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function makeTestRepo(seed: Test[] = []) {
  const tests = [...seed];

  const repo: TestRepository = {
    findById: vi.fn(async (id: string) => tests.find((test) => test.id === id) ?? null),
    findByShareToken: vi.fn(
      async (token: string) => tests.find((test) => test.shareToken === token) ?? null
    ),
    list: vi.fn(async () => tests),
    count: vi.fn(async () => tests.length),
    listCategories: vi.fn(async () => []),
    create: vi.fn(async (input) => {
      const test = makeTest({
        id: `t-${tests.length + 1}`,
        ownerId: input.ownerId,
        title: input.title,
        category: input.category ?? null,
        description: input.description ?? null,
        language: input.language ?? "RU",
        visibility: input.visibility ?? "PRIVATE",
        materialId: input.materialId ?? null,
        status: "PENDING",
      });
      tests.push(test);
      return test;
    }),
    update: vi.fn(async (id: string, input) => {
      const test = tests.find((item) => item.id === id);
      if (!test) {
        throw new Error("Тест не найден");
      }
      Object.assign(test, input);
      return test;
    }),
    delete: vi.fn(async (id: string) => {
      const index = tests.findIndex((test) => test.id === id);
      if (index >= 0) {
        tests.splice(index, 1);
      }
    }),
  };

  return { repo, tests };
}

export function makeQuestionRepo(seed: QuestionWithOptions[] = []) {
  const questions = [...seed];

  const repo: QuestionRepository = {
    findById: vi.fn(async (id: string) => questions.find((question) => question.id === id) ?? null),
    listByTest: vi.fn(async (testId: string) =>
      questions.filter((question) => question.testId === testId)
    ),
    listByTestWithOptions: vi.fn(async (testId: string) =>
      questions.filter((question) => question.testId === testId)
    ),
    createMany: vi.fn(async (_testId: string, created) => {
      for (const question of created) {
        questions.push({ ...question, id: `q-${questions.length + 1}`, testId: _testId, options: [] });
      }
    }),
    create: vi.fn(async (testId: string, question) => {
      const created = {
        ...makeQuestion({ testId, type: question.type, text: question.text }),
        id: `q-${questions.length + 1}`,
      };
      return created;
    }),
    update: vi.fn(async (id: string) => makeQuestion({ id })),
    delete: vi.fn(async (id: string) => {
      const index = questions.findIndex((question) => question.id === id);
      if (index >= 0) {
        questions.splice(index, 1);
      }
    }),
    deleteByTest: vi.fn(async (testId: string) => {
      for (let index = questions.length - 1; index >= 0; index -= 1) {
        if (questions[index].testId === testId) {
          questions.splice(index, 1);
        }
      }
    }),
  };

  return { repo, questions };
}

export function makeResultRepo() {
  const created: TestResult[] = [];

  const repo: TestResultRepository = {
    create: vi.fn(async (input) => {
      const result: TestResult = {
        id: `r-${created.length + 1}`,
        testId: input.testId,
        userId: input.userId,
        guestName: input.guestName,
        score: input.score,
        maxScore: input.maxScore,
        percentCorrect: input.percentCorrect,
        durationMs: input.durationMs,
        completedAt: new Date("2026-01-01T00:00:00Z"),
      };
      created.push(result);
      return result;
    }),
    findById: vi.fn(async (id: string) => created.find((result) => result.id === id) ?? null),
    findDetailed: vi.fn(async () => null),
    listByUser: vi.fn(async () => created),
    listByUserWithTest: vi.fn(async () => []),
    listByTest: vi.fn(async () => created),
  };

  return { repo, created };
}

export function makeMaterialRepo(seed: Material[] = []) {
  const materials = [...seed];

  const repo: MaterialRepository = {
    findById: vi.fn(async (id: string) => materials.find((item) => item.id === id) ?? null),
    listByOwner: vi.fn(async (ownerId: string) =>
      materials.filter((item) => item.ownerId === ownerId)
    ),
    create: vi.fn(async (input) => {
      const material = makeMaterial({
        id: `m-${materials.length + 1}`,
        ownerId: input.ownerId,
        title: input.title,
        content: input.content ?? null,
        source: input.source ?? "TEXT",
        sourceUrl: input.sourceUrl ?? null,
        status: input.status ?? "READY",
      });
      materials.push(material);
      return material;
    }),
    updateStatus: vi.fn(async (id: string, status) => {
      const material = materials.find((item) => item.id === id);
      if (!material) {
        throw new Error("Материал не найден");
      }
      material.status = status;
      return material;
    }),
    delete: vi.fn(async (id: string) => {
      const index = materials.findIndex((item) => item.id === id);
      if (index >= 0) {
        materials.splice(index, 1);
      }
    }),
  };

  return { repo, materials };
}

export function makeGenerationRepo(): GenerationRepository {
  return {
    create: vi.fn(async (input) => ({
      id: "g1",
      ...input,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    })),
    listByTest: vi.fn(async () => []),
    totalCostByUser: vi.fn(async () => 0),
  };
}

export function makeNotifier(): Notifier {
  return { notify: vi.fn(async () => {}) };
}

/** Ответ, который вернул бы сервер после сдачи теста. */
export function makeTestAnswer(overrides: Partial<TestAnswer> = {}): TestAnswer {
  return {
    id: "a1",
    resultId: "r1",
    questionId: "q1",
    selectedOptionIds: [],
    textAnswer: null,
    isCorrect: false,
    pointsAwarded: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}
