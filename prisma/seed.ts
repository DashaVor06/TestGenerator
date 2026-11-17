import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Демо-пользователь (хеш пароля — заглушка, bcrypt появится на Этапе 2)
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      username: "demo",
      email: "demo@example.com",
      passwordHash: "demo-hash",
      role: "USER",
    },
  });

  // Демо-материал
  const material = await prisma.material.create({
    data: {
      ownerId: user.id,
      title: "Основы JavaScript",
      content:
        "JavaScript — мультипарадигменный язык программирования. " +
        "Переменные объявляются с помощью let и const. " +
        "Для строгого сравнения используется оператор ===.",
      status: "READY",
    },
  });

  // Демо-тест с вопросами и вариантами ответов
  const test = await prisma.test.create({
    data: {
      ownerId: user.id,
      title: "Тест по основам JavaScript",
      category: "Программирование",
      description: "Демонстрационный тест для проверки базовых знаний.",
      status: "READY",
      questions: {
        create: [
          {
            type: "MULTIPLE_CHOICE",
            text: "Какой оператор используется для строгого сравнения?",
            difficulty: "easy",
            explanation: "=== сравнивает и значение, и тип.",
            order: 1,
            options: {
              create: [
                { text: "=", isCorrect: false },
                { text: "==", isCorrect: false },
                { text: "===", isCorrect: true },
                { text: "!=", isCorrect: false },
              ],
            },
          },
          {
            type: "TRUE_FALSE",
            text: "JavaScript — компилируемый язык программирования.",
            difficulty: "easy",
            explanation: "JavaScript — интерпретируемый язык.",
            order: 2,
            options: {
              create: [
                { text: "Верно", isCorrect: false },
                { text: "Неверно", isCorrect: true },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seed завершён:", {
    user: user.email,
    material: material.title,
    test: test.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
