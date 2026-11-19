// Use case: генерация вопросов по материалу.
//
// Вопросы создаются двумя запросами:
// 1) обычные вопросы — в дешёвом режиме мышления (reasoning_effort=low);
// 2) вопросы «на размышление» — в дорогом режиме (high).
// При повторной генерации по тому же материалу второй запрос попадает
// в кэш DeepSeek, поэтому входные токены стоят почти ничего.

import type {
  CreateQuestionInput,
  GenerationRepository,
  GeneratedQuestion,
  MaterialRepository,
  Notifier,
  QuestionGenerator,
  QuestionRepository,
  TestRepository,
  TypeCount,
} from "@/application/ports";
import type { Difficulty, QuestionType, TestLanguage } from "@/domain/entities";
import type { TestSettings } from "@/domain/entities/test";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/domain-error";

/** Порядок типов фиксирован, чтобы результат был предсказуемым. */
const TYPE_ORDER: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "OPEN",
];

export interface GenerateTestInput {
  materialId: string;
  /** Сколько вопросов каждого типа нужно. */
  typeCounts: Partial<Record<QuestionType, number>>;
  difficulty: Difficulty | null;
  /** Сколько вопросов сделать «на размышление». */
  thinkingCount: number;
  /** Язык вопросов (по умолчанию — язык теста). */
  language?: TestLanguage;
}

export interface GenerateTestDeps {
  tests: TestRepository;
  materials: MaterialRepository;
  questions: QuestionRepository;
  generator: QuestionGenerator;
  notifier: Notifier;
  generations: GenerationRepository;
}

export interface GenerateTestResult {
  questionCount: number;
  /** Сколько стоили обращения к ИИ (в долларах). */
  costUsd: number;
  durationMs: number;
  basicCount: number;
  thinkingCount: number;
}

/** Преобразует сгенерированный вопрос в данные для сохранения в БД. */
function toCreateInput(question: GeneratedQuestion): CreateQuestionInput {
  return {
    type: question.type,
    text: question.text,
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitiveLevel,
    explanation: question.explanation,
    sourceQuote: question.sourceQuote,
    expectedAnswer: question.expectedAnswer,
    points: 1,
    order: 0,
    options: question.options.map((option, index) => ({
      text: option.text,
      isCorrect: option.isCorrect,
      order: index,
    })),
  };
}

/** Превращает объект «тип → количество» в массив, убирая нулевые значения. */
export function toTypeCounts(
  counts: Partial<Record<QuestionType, number>>
): TypeCount[] {
  return TYPE_ORDER.filter((type) => (counts[type] ?? 0) > 0).map((type) => ({
    type,
    count: counts[type] ?? 0,
  }));
}

/**
 * Делит вопросы на две группы: обычные и «на размышление».
 * Пропорции по типам сохраняются.
 */
export function splitTypeCounts(
  counts: TypeCount[],
  thinkingCount: number
): { basic: TypeCount[]; thinking: TypeCount[] } {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  if (thinkingCount <= 0 || total === 0) {
    return { basic: counts, thinking: [] };
  }
  if (thinkingCount >= total) {
    return { basic: [], thinking: counts };
  }

  const thinking = counts.map((item) => ({
    type: item.type,
    count: Math.floor((item.count * thinkingCount) / total),
  }));

  // Добираем вопросы, потерянные при округлении вниз.
  let assigned = thinking.reduce((sum, item) => sum + item.count, 0);
  let index = 0;
  while (assigned < thinkingCount && index < counts.length * thinkingCount) {
    const position = index % counts.length;
    if (thinking[position].count < counts[position].count) {
      thinking[position].count += 1;
      assigned += 1;
    }
    index += 1;
  }

  const basic = counts.map((item, position) => ({
    type: item.type,
    count: item.count - thinking[position].count,
  }));

  return { basic, thinking };
}

export async function generateTest(
  testId: string,
  currentUserId: string,
  input: GenerateTestInput,
  deps: GenerateTestDeps
): Promise<GenerateTestResult> {
  const test = await deps.tests.findById(testId);
  if (!test) {
    throw new NotFoundError("Тест", testId);
  }
  if (test.ownerId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому тесту");
  }

  const material = await deps.materials.findById(input.materialId);
  if (!material) {
    throw new NotFoundError("Материал", input.materialId);
  }
  if (material.ownerId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому материалу");
  }

  const content = (material.content ?? "").trim();
  if (content.length < 50) {
    throw new ValidationError("Материал не содержит текста для генерации");
  }

  const typeCounts = toTypeCounts(input.typeCounts);
  const totalCount = typeCounts.reduce((sum, item) => sum + item.count, 0);
  if (totalCount === 0) {
    throw new ValidationError("Не указано количество вопросов");
  }

  const thinkingCount = Math.min(input.thinkingCount, totalCount);
  const { basic, thinking } = splitTypeCounts(typeCounts, thinkingCount);
  const language = input.language ?? test.language;

  const startedAt = Date.now();

  await deps.tests.update(testId, { status: "PROCESSING", materialId: material.id });
  await deps.notifier.notify({
    userId: currentUserId,
    type: "GENERATION_STARTED",
    message: `Генерация теста «${test.title}» началась`,
  });

  try {
    // Старые вопросы удаляем, чтобы повторная генерация не создавала дубли.
    await deps.questions.deleteByTest(testId);

    const generated: CreateQuestionInput[] = [];
    let costUsd = 0;
    let basicGenerated = 0;
    let thinkingGenerated = 0;

    if (basic.length > 0) {
      const result = await deps.generator.generate({
        content,
        typeCounts: basic,
        totalCount: basic.reduce((sum, item) => sum + item.count, 0),
        difficulty: input.difficulty,
        language,
        thinking: false,
      });

      basicGenerated = result.questions.length;
      costUsd += result.usage.costUsd;
      generated.push(...result.questions.map(toCreateInput));
      await deps.generations.create({
        testId,
        userId: currentUserId,
        model: result.usage.model,
        effort: result.usage.effort,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.usage.costUsd,
        durationMs: result.usage.durationMs,
        questionsCount: result.questions.length,
      });
    }

    if (thinking.length > 0) {
      const result = await deps.generator.generate({
        content,
        typeCounts: thinking,
        totalCount: thinking.reduce((sum, item) => sum + item.count, 0),
        difficulty: input.difficulty,
        language,
        thinking: true,
        existingQuestions: generated.map((question) => question.text),
      });

      thinkingGenerated = result.questions.length;
      costUsd += result.usage.costUsd;
      generated.push(...result.questions.map(toCreateInput));
      await deps.generations.create({
        testId,
        userId: currentUserId,
        model: result.usage.model,
        effort: result.usage.effort,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.usage.costUsd,
        durationMs: result.usage.durationMs,
        questionsCount: result.questions.length,
      });
    }

    if (generated.length === 0) {
      throw new ValidationError(
        "ИИ-сервис не вернул ни одного корректного вопроса. Попробуйте другой материал."
      );
    }

    // Нумеруем вопросы по порядку.
    const withOrder = generated.map((question, index) => ({
      ...question,
      order: index + 1,
    }));

    await deps.questions.createMany(testId, withOrder);

    const settings: TestSettings = {
      questionCount: withOrder.length,
      typeCounts: input.typeCounts,
      thinkingCount: thinkingGenerated,
      difficulty: input.difficulty,
      materialId: material.id,
    };

    await deps.tests.update(testId, {
      status: "READY",
      language,
      materialId: material.id,
      settings,
    });

    await deps.notifier.notify({
      userId: currentUserId,
      type: "GENERATION_COMPLETED",
      message: `Тест «${test.title}» готов: ${withOrder.length} вопросов`,
    });

    return {
      questionCount: withOrder.length,
      costUsd,
      durationMs: Date.now() - startedAt,
      basicCount: basicGenerated,
      thinkingCount: thinkingGenerated,
    };
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
