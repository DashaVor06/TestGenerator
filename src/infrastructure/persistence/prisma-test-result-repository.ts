// Реализация порта TestResultRepository на Prisma (инфраструктура).

import { prisma } from "./prisma";
import { mapOption, mapQuestion, mapResult, mapTest } from "./mappers";
import type {
  CreateTestResultInput,
  ResultDetails,
  ResultWithTest,
  TestResultRepository,
} from "@/application/ports";
import type { TestAnswer, TestResult } from "@/domain/entities";
import type { TestAnswer as PrismaTestAnswer } from "@/generated/prisma";

function mapAnswer(answer: PrismaTestAnswer): TestAnswer {
  return {
    id: answer.id,
    resultId: answer.resultId,
    questionId: answer.questionId,
    selectedOptionIds: answer.selectedOptionIds,
    textAnswer: answer.textAnswer,
    isCorrect: answer.isCorrect,
    pointsAwarded: answer.pointsAwarded,
    createdAt: answer.createdAt,
  };
}

export class PrismaTestResultRepository implements TestResultRepository {
  /**
   * Сохраняет результат вместе с ответами по каждому вопросу.
   * Вложенная запись выполняется одной транзакцией.
   */
  async create(input: CreateTestResultInput): Promise<TestResult> {
    const result = await prisma.testResult.create({
      data: {
        testId: input.testId,
        userId: input.userId,
        guestName: input.guestName,
        score: input.score,
        maxScore: input.maxScore,
        percentCorrect: input.percentCorrect,
        durationMs: input.durationMs,
        answers: {
          create: input.answers.map((answer) => ({
            questionId: answer.questionId,
            selectedOptionIds: answer.selectedOptionIds,
            textAnswer: answer.textAnswer,
            isCorrect: answer.isCorrect,
            pointsAwarded: answer.pointsAwarded,
          })),
        },
      },
    });

    return mapResult(result);
  }

  async findById(id: string): Promise<TestResult | null> {
    const result = await prisma.testResult.findUnique({ where: { id } });
    return result ? mapResult(result) : null;
  }

  /** Результат вместе с тестом, вопросами и ответами — для разбора ошибок. */
  async findDetailed(id: string): Promise<ResultDetails | null> {
    const result = await prisma.testResult.findUnique({
      where: { id },
      include: { test: true, answers: true },
    });

    if (!result) {
      return null;
    }

    const questions = await prisma.question.findMany({
      where: { testId: result.testId },
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    });

    return {
      result: mapResult(result),
      test: mapTest(result.test),
      answers: result.answers.map(mapAnswer),
      questions: questions.map((question) => ({
        ...mapQuestion(question),
        options: question.options.map(mapOption),
      })),
    };
  }

  async listByUser(userId: string): Promise<TestResult[]> {
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
    });
    return results.map(mapResult);
  }

  /** Результаты пользователя вместе с названием теста. */
  async listByUserWithTest(userId: string): Promise<ResultWithTest[]> {
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      include: { test: true },
      take: 100,
    });

    return results.map((result) => ({
      result: mapResult(result),
      test: mapTest(result.test),
    }));
  }

  async listByTest(testId: string): Promise<TestResult[]> {
    const results = await prisma.testResult.findMany({
      where: { testId },
      orderBy: { completedAt: "desc" },
    });
    return results.map(mapResult);
  }
}

export const testResultRepository = new PrismaTestResultRepository();
