// Преобразование записей Prisma в доменные сущности.
// Вынесено отдельно, чтобы репозитории не дублировали одно и то же.

import type {
  AnswerOption as PrismaAnswerOption,
  Material as PrismaMaterial,
  Notification as PrismaNotification,
  Question as PrismaQuestion,
  Test as PrismaTest,
  TestResult as PrismaTestResult,
  User as PrismaUser,
} from "@/generated/prisma";
import type {
  AnswerOption,
  Material,
  Notification,
  Question,
  Test,
  TestResult,
  User,
} from "@/domain/entities";
import type { TestSettings } from "@/domain/entities/test";

export function mapUser(user: PrismaUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    language: user.language,
    createdAt: user.createdAt,
  };
}

export function mapMaterial(material: PrismaMaterial): Material {
  return {
    id: material.id,
    ownerId: material.ownerId,
    title: material.title,
    content: material.content,
    fileUrl: material.fileUrl,
    fileType: material.fileType,
    source: material.source,
    sourceUrl: material.sourceUrl,
    status: material.status,
    createdAt: material.createdAt,
  };
}

export function mapTest(test: PrismaTest): Test {
  return {
    id: test.id,
    ownerId: test.ownerId,
    materialId: test.materialId,
    title: test.title,
    category: test.category,
    description: test.description,
    language: test.language,
    visibility: test.visibility,
    shareToken: test.shareToken,
    status: test.status,
    settings: (test.settings as unknown as TestSettings | null) ?? null,
    createdAt: test.createdAt,
  };
}

export function mapOption(option: PrismaAnswerOption): AnswerOption {
  return {
    id: option.id,
    questionId: option.questionId,
    text: option.text,
    isCorrect: option.isCorrect,
    order: option.order,
  };
}

export function mapQuestion(question: PrismaQuestion): Question {
  return {
    id: question.id,
    testId: question.testId,
    type: question.type,
    text: question.text,
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitiveLevel,
    explanation: question.explanation,
    sourceQuote: question.sourceQuote,
    expectedAnswer: question.expectedAnswer,
    points: question.points,
    order: question.order,
  };
}

export function mapResult(result: PrismaTestResult): TestResult {
  return {
    id: result.id,
    testId: result.testId,
    userId: result.userId,
    guestName: result.guestName,
    score: result.score,
    maxScore: result.maxScore,
    percentCorrect: result.percentCorrect,
    durationMs: result.durationMs,
    completedAt: result.completedAt,
  };
}

export function mapNotification(notification: PrismaNotification): Notification {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type as Notification["type"],
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}
