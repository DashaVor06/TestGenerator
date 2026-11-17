// Реализация порта QuestionRepository на Prisma (инфраструктура).

import type {
  AnswerOption as PrismaAnswerOption,
  Question as PrismaQuestion,
} from "@prisma/client";
import { prisma } from "./prisma";
import type { QuestionRepository, QuestionWithOptions } from "@/application/ports";
import type { AnswerOption, Question } from "@/domain/entities";

export class PrismaQuestionRepository implements QuestionRepository {
  private mapQuestion(q: PrismaQuestion): Question {
    return {
      id: q.id,
      testId: q.testId,
      type: q.type,
      text: q.text,
      difficulty: q.difficulty,
      explanation: q.explanation,
      order: q.order,
    };
  }

  private mapOption(o: PrismaAnswerOption): AnswerOption {
    return {
      id: o.id,
      questionId: o.questionId,
      text: o.text,
      isCorrect: o.isCorrect,
    };
  }

  async listByTest(testId: string): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: { order: "asc" },
    });
    return questions.map((q) => this.mapQuestion(q));
  }

  async listByTestWithOptions(testId: string): Promise<QuestionWithOptions[]> {
    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: { order: "asc" },
      include: { options: true },
    });
    return questions.map((q) => ({
      ...this.mapQuestion(q),
      options: q.options.map((o) => this.mapOption(o)),
    }));
  }

  async deleteByTest(testId: string): Promise<void> {
    await prisma.question.deleteMany({ where: { testId } });
  }
}

export const questionRepository = new PrismaQuestionRepository();
