// Реализация порта QuestionRepository на Prisma (инфраструктура).

import { prisma } from "./prisma";
import { mapOption, mapQuestion } from "./mappers";
import type {
  CreateQuestionInput,
  QuestionRepository,
  QuestionWithOptions,
  UpdateQuestionInput,
} from "@/application/ports";
import type { Question } from "@/domain/entities";

/** Данные варианта ответа для вложенной записи в Prisma. */
function optionsToCreate(options: CreateQuestionInput["options"]) {
  return options.map((option, index) => ({
    text: option.text,
    isCorrect: option.isCorrect,
    order: option.order ?? index,
  }));
}

export class PrismaQuestionRepository implements QuestionRepository {
  async findById(id: string): Promise<Question | null> {
    const question = await prisma.question.findUnique({ where: { id } });
    return question ? mapQuestion(question) : null;
  }

  async listByTest(testId: string): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: { order: "asc" },
    });
    return questions.map(mapQuestion);
  }

  async listByTestWithOptions(testId: string): Promise<QuestionWithOptions[]> {
    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    });

    return questions.map((question) => ({
      ...mapQuestion(question),
      options: question.options.map(mapOption),
    }));
  }

  /** Сохраняет все вопросы одной транзакцией: либо все, либо ни одного. */
  async createMany(testId: string, questions: CreateQuestionInput[]): Promise<void> {
    if (questions.length === 0) {
      return;
    }

    await prisma.$transaction(
      questions.map((question) =>
        prisma.question.create({
          data: {
            testId,
            type: question.type,
            text: question.text,
            difficulty: question.difficulty,
            cognitiveLevel: question.cognitiveLevel,
            explanation: question.explanation,
            sourceQuote: question.sourceQuote,
            expectedAnswer: question.expectedAnswer,
            points: question.points,
            order: question.order,
            options: { create: optionsToCreate(question.options) },
          },
        })
      )
    );
  }

  async create(testId: string, question: CreateQuestionInput): Promise<Question> {
    const created = await prisma.question.create({
      data: {
        testId,
        type: question.type,
        text: question.text,
        difficulty: question.difficulty,
        cognitiveLevel: question.cognitiveLevel,
        explanation: question.explanation,
        sourceQuote: question.sourceQuote,
        expectedAnswer: question.expectedAnswer,
        points: question.points,
        order: question.order,
        options: { create: optionsToCreate(question.options) },
      },
    });
    return mapQuestion(created);
  }

  async update(id: string, input: UpdateQuestionInput): Promise<Question> {
    const updated = await prisma.question.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.text !== undefined ? { text: input.text } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
        ...(input.cognitiveLevel !== undefined
          ? { cognitiveLevel: input.cognitiveLevel }
          : {}),
        ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
        ...(input.sourceQuote !== undefined ? { sourceQuote: input.sourceQuote } : {}),
        ...(input.expectedAnswer !== undefined
          ? { expectedAnswer: input.expectedAnswer }
          : {}),
        ...(input.points !== undefined ? { points: input.points } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        // Если варианты переданы — полностью заменяем старые.
        ...(input.options !== undefined
          ? {
              options: {
                deleteMany: {},
                create: optionsToCreate(input.options),
              },
            }
          : {}),
      },
    });
    return mapQuestion(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.question.delete({ where: { id } });
  }

  async deleteByTest(testId: string): Promise<void> {
    await prisma.question.deleteMany({ where: { testId } });
  }
}

export const questionRepository = new PrismaQuestionRepository();
