// Демонстрационные данные для проверки работы приложения.
// Скрипт можно запускать повторно: прежние данные демо-пользователя удаляются.

import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

/** Пароль демо-пользователя. */
const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Демо-пользователь
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { passwordHash },
    create: {
      username: "demo",
      email: "demo@example.com",
      passwordHash,
      role: "USER",
      language: "RU",
    },
  });

  // Чистим прошлые демо-данные, чтобы seed можно было запускать много раз.
  await prisma.test.deleteMany({ where: { ownerId: user.id } });
  await prisma.material.deleteMany({ where: { ownerId: user.id } });

  // Демо-материал
  const material = await prisma.material.create({
    data: {
      ownerId: user.id,
      title: "Основы JavaScript",
      content:
        "JavaScript — мультипарадигменный язык программирования. " +
        "Переменные объявляются с помощью let и const. " +
        "Для строгого сравнения используется оператор ===. " +
        "Массивы хранят упорядоченный набор значений и начинаются с индекса 0.",
      source: "TEXT",
      status: "READY",
    },
  });

  // Демо-тест с вопросами и вариантами ответов
  const test = await prisma.test.create({
    data: {
      ownerId: user.id,
      materialId: material.id,
      title: "Тест по основам JavaScript",
      category: "Программирование",
      description: "Демонстрационный тест: вопросы на знание и на размышление.",
      language: "RU",
      visibility: "PUBLIC",
      shareToken: "demo-javascript",
      status: "READY",
      settings: {
        questionCount: 3,
        typeCounts: { SINGLE_CHOICE: 2, SHORT_ANSWER: 1 },
        thinkingCount: 1,
        difficulty: "EASY",
        materialId: material.id,
      },
      questions: {
        create: [
          {
            type: "SINGLE_CHOICE",
            text: "Какой оператор используется для строгого сравнения?",
            difficulty: "EASY",
            cognitiveLevel: "REMEMBER",
            explanation: "Оператор === сравнивает и значение, и тип.",
            sourceQuote: "Для строгого сравнения используется оператор ===.",
            points: 1,
            order: 1,
            options: {
              create: [
                { text: "=", isCorrect: false, order: 0 },
                { text: "==", isCorrect: false, order: 1 },
                { text: "===", isCorrect: true, order: 2 },
                { text: "!=", isCorrect: false, order: 3 },
              ],
            },
          },
          {
            type: "TRUE_FALSE",
            text: "JavaScript — компилируемый язык программирования.",
            difficulty: "EASY",
            cognitiveLevel: "UNDERSTAND",
            explanation: "JavaScript — интерпретируемый язык.",
            sourceQuote: "JavaScript — мультипарадигменный язык программирования.",
            points: 1,
            order: 2,
            options: {
              create: [
                { text: "Верно", isCorrect: false, order: 0 },
                { text: "Неверно", isCorrect: true, order: 1 },
              ],
            },
          },
          {
            type: "SHORT_ANSWER",
            text: "С какого индекса начинается массив в JavaScript?",
            difficulty: "MEDIUM",
            cognitiveLevel: "APPLY",
            explanation: "Индексация массивов начинается с нуля.",
            sourceQuote: "Массивы хранят упорядоченный набор значений и начинаются с индекса 0.",
            expectedAnswer: "0|ноль|с нуля",
            points: 1,
            order: 3,
          },
        ],
      },
    },
  });

  console.log("Seed завершён:", {
    user: user.email,
    password: DEMO_PASSWORD,
    material: material.title,
    test: test.title,
    publicLink: `/t/${test.shareToken}`,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
