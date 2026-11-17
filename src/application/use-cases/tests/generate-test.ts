// Use case: генерация вопросов по материалу (асинхронная оркестрация).

import type {
  CreateQuestionInput,
  MaterialRepository,
  Notifier,
  QuestionGenerator,
  QuestionRepository,
  TestRepository,
} from "@/application/ports";
import type { QuestionType } from "@/domain/entities";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/domain-error";

export interface GenerateTestInput {
  count: number;
  types: QuestionType[];
  difficulty?: string;
}

export interface GenerateTestDeps {
  tests: TestRepository;
  materials: MaterialRepository;
  questions: QuestionRepository;
  generator: QuestionGenerator;
  notifier: Notifier;
}

export async function generateTest(
  testId: string,
  materialId: string,
  currentUserId: string,
  input: GenerateTestInput,
  deps: GenerateTestDeps
): Promise<void> {
  const test = await deps.tests.findById(testId);
  if (!test) {
    throw new NotFoundError("Тест", testId);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому тесту");
  }

  const material = await deps.materials.findById(materialId);
  if (!material) {
    throw new NotFoundError("Материал", materialId);
  }
  if (material.ownerId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому материалу");
  }

  const content = material.content ?? "";
  if (!content.trim()) {
    throw new ValidationError("Материал не содержит текста для генерации");
  }

  await deps.tests.update(testId, { status: "PROCESSING" });
  await deps.notifier.notify({
    userId: currentUserId,
    type: "GENERATION_STARTED",
    message: `Генерация теста «${test.title}» началась`,
  });

  try {
    const generated = await deps.generator.generate({
      content,
      count: input.count,
      types: input.types,
      difficulty: input.difficulty,
    });

    const questions: CreateQuestionInput[] = generated.map((q, index) => ({
      type: q.type,
      text: q.text,
      difficulty: q.difficulty ?? null,
      explanation: q.explanation ?? null,
      order: index + 1,
      options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    }));

    await deps.questions.createMany(testId, questions);
    await deps.tests.update(testId, { status: "READY" });
    await deps.notifier.notify({
      userId: currentUserId,
      type: "GENERATION_COMPLETED",
      message: `Тест «${test.title}» готов`,
    });
  } catch (error) {
    await deps.tests.update(testId, { status: "ERROR" });
    await deps.notifier.notify({
      userId: currentUserId,
      type: "GENERATION_FAILED",
      message: `Ошибка генерации теста «${test.title}»`,
    });
    throw error;
  }
}
