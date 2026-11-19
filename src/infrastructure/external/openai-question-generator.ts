// Реализация порта QuestionGenerator через OpenAI-совместимый API DeepSeek.
//
// Экономия денег:
// 1. Обычные вопросы генерируются в дешёвом режиме мышления (reasoning_effort=low),
//    вопросы «на размышление» — в дорогом (high). Так платим за размышление
//    только там, где оно действительно нужно.
// 2. Включён JSON-режим: модель сразу возвращает объект, поэтому нет повторных
//    запросов из-за «сломанного» ответа.
// 3. Задан max_tokens, чтобы модель не могла выдать слишком длинный ответ.
// 4. Инструкции и материал идут первыми и не меняются между запросами —
//    DeepSeek кэширует этот префикс и считает входные токены в 50 раз дешевле.

import { z } from "zod";
import { config } from "@/config";
import { calculateCost } from "@/domain/pricing";
import type {
  GenerateQuestionsParams,
  GeneratedQuestion,
  GenerationResult,
  GenerationUsage,
  QuestionGenerator,
  TypeCount,
} from "@/application/ports";
import { AiServiceError } from "@/application/ports";
import type {
  CognitiveLevel,
  Difficulty,
  QuestionType,
} from "@/domain/entities";
import { buildMaterialBlock, buildSystemPrompt, buildTaskBlock } from "./ai-prompts";

/** Схема ответа модели. Всё, что не подходит, отбрасывается. */
const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const rawQuestionSchema = z.object({
  type: z.string().optional(),
  text: z.string().min(3),
  difficulty: z.string().optional().nullable(),
  cognitiveLevel: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  sourceQuote: z.string().optional().nullable(),
  expectedAnswer: z.string().optional().nullable(),
  options: z.array(optionSchema).optional().default([]),
});

const responseSchema = z.object({
  questions: z.array(rawQuestionSchema),
});

const QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "OPEN",
];

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const COGNITIVE_LEVELS: CognitiveLevel[] = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE"];

/** Сколько максимум ждём ответа модели (в миллисекундах). */
const REQUEST_TIMEOUT_MS = 120_000;

/** Описание одного обращения к API. */
interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
}

export class OpenAiQuestionGenerator implements QuestionGenerator {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly basicEffort: string,
    private readonly thinkingEffort: string
  ) {}

  async generate(params: GenerateQuestionsParams): Promise<GenerationResult> {
    const effort = params.thinking ? this.thinkingEffort : this.basicEffort;
    const content = this.limitContent(params.content);
    const wasTruncated = content.length < params.content.length;

    const messages = [
      { role: "system", content: buildSystemPrompt(params.language) },
      {
        role: "user",
        content: `${buildMaterialBlock(content, wasTruncated)}\n\n${buildTaskBlock(params)}`,
      },
    ];

    // Первая попытка. Если ответ не разобрался — повторяем один раз
    // с дополнительным напоминанием про формат.
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptMessages =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "user",
                content:
                  "Предыдущий ответ не удалось разобрать как JSON. Верни ТОЛЬКО JSON-объект вида {\"questions\": [...]}, без пояснений.",
              },
            ];

      const { data, durationMs } = await this.request(attemptMessages, params, effort);

      const rawContent = data.choices?.[0]?.message?.content ?? "";
      const parsed = this.parseJson(rawContent);

      if (!parsed) {
        lastError = new Error("Модель вернула не JSON");
        continue;
      }

      const questions = this.normalizeQuestions(parsed.questions, params);

      if (questions.length === 0) {
        lastError = new Error("Модель не вернула ни одного корректного вопроса");
        continue;
      }

      const usage = this.buildUsage(data, effort, durationMs);
      return { questions, usage };
    }

    throw new AiServiceError(
      `Не удалось получить вопросы от ИИ-сервиса: ${
        lastError instanceof Error ? lastError.message : "неизвестная ошибка"
      }`
    );
  }

  /** Обрезает слишком длинный материал, чтобы не платить за лишние токены. */
  private limitContent(content: string): string {
    const limit = config.ai.maxMaterialChars;
    if (content.length <= limit) {
      return content;
    }
    return content.slice(0, limit);
  }

  /** Один HTTP-запрос к API. */
  private async request(
    messages: { role: string; content: string }[],
    params: GenerateQuestionsParams,
    effort: string
  ): Promise<{ data: ChatCompletionResponse; durationMs: number }> {
    const startedAt = Date.now();

    // Запас вывода: ~450 токенов на вопрос плюс немного на служебный текст.
    const maxTokens = Math.min(8000, 500 + params.totalCount * 450);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: "json_object" },
          max_tokens: maxTokens,
          // Включаем режим мышления и задаём его глубину.
          thinking: { type: "enabled" },
          reasoning_effort: effort,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new AiServiceError(
          `ИИ-сервис вернул ошибку ${response.status}${
            details ? `: ${details.slice(0, 300)}` : ""
          }`
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;
      return { data, durationMs: Date.now() - startedAt };
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw error;
      }
      throw new AiServiceError(
        `Не удалось обратиться к ИИ-сервису: ${
          error instanceof Error ? error.message : "неизвестная ошибка"
        }`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Разбирает текст ответа модели в объект. */
  private parseJson(content: string): { questions: unknown[] } | null {
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    if (!cleaned) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(cleaned);
      const result = responseSchema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      // На случай, если модель добавила текст вокруг JSON.
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        return null;
      }
      try {
        const parsed: unknown = JSON.parse(match[0]);
        const result = responseSchema.safeParse(parsed);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    }
  }

  /** Приводит вопросы модели к корректному виду и ограничивает количество. */
  private normalizeQuestions(
    rawQuestions: unknown[],
    params: GenerateQuestionsParams
  ): GeneratedQuestion[] {
    const requested = new Map<QuestionType, number>(
      params.typeCounts.map((item: TypeCount) => [item.type, item.count])
    );
    const produced = new Map<QuestionType, number>();
    const seenTexts = new Set<string>();
    const result: GeneratedQuestion[] = [];

    for (const item of rawQuestions) {
      const question = this.normalizeQuestion(item, params);
      if (!question) {
        continue;
      }

      const textKey = question.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (seenTexts.has(textKey)) {
        continue;
      }

      const limit = requested.get(question.type);
      const already = produced.get(question.type) ?? 0;
      if (limit !== undefined && already >= limit) {
        continue;
      }

      seenTexts.add(textKey);
      produced.set(question.type, already + 1);
      result.push(question);
    }

    return result;
  }

  /** Проверяет один вопрос и при необходимости исправляет его поля. */
  private normalizeQuestion(
    item: unknown,
    params: GenerateQuestionsParams
  ): GeneratedQuestion | null {
    const parsed = rawQuestionSchema.safeParse(item);
    if (!parsed.success) {
      return null;
    }

    const raw = parsed.data;
    const text = raw.text.trim();
    if (text.length < 3) {
      return null;
    }

    const type = this.resolveType(raw.type, raw.options);
    const difficulty = this.resolveDifficulty(raw.difficulty, params.difficulty);
    const cognitiveLevel = this.resolveCognitiveLevel(raw.cognitiveLevel, params.thinking);

    // Убираем пустые варианты и повторы.
    const seenOptions = new Set<string>();
    const options = raw.options
      .map((option) => ({ text: option.text.trim(), isCorrect: option.isCorrect }))
      .filter((option) => {
        if (!option.text) {
          return false;
        }
        const key = option.text.toLowerCase();
        if (seenOptions.has(key)) {
          return false;
        }
        seenOptions.add(key);
        return true;
      });

    const normalizedOptions = this.normalizeOptions(type, options);
    if (normalizedOptions === null) {
      // Вопрос нельзя использовать (например, SHORT_ANSWER без эталона).
      return null;
    }

    return {
      type,
      text,
      difficulty,
      cognitiveLevel,
      explanation: this.toText(raw.explanation),
      sourceQuote: this.toSourceQuote(raw.sourceQuote),
      expectedAnswer:
        type === "SHORT_ANSWER" ? this.toText(raw.expectedAnswer) : null,
      options: normalizedOptions,
    };
  }

  /** Определяет тип вопроса, если модель его не указала или указала неверно. */
  private resolveType(rawType: string | undefined, options: { text: string }[]): QuestionType {
    if (rawType && QUESTION_TYPES.includes(rawType as QuestionType)) {
      return rawType as QuestionType;
    }
    if (options.length === 2) {
      return "TRUE_FALSE";
    }
    if (options.length >= 3) {
      return "SINGLE_CHOICE";
    }
    return "OPEN";
  }

  private resolveDifficulty(raw: string | null | undefined, fallback: Difficulty | null): Difficulty {
    if (raw && DIFFICULTIES.includes(raw as Difficulty)) {
      return raw as Difficulty;
    }
    return fallback ?? "MEDIUM";
  }

  private resolveCognitiveLevel(
    raw: string | null | undefined,
    thinking: boolean
  ): CognitiveLevel {
    if (raw && COGNITIVE_LEVELS.includes(raw as CognitiveLevel)) {
      return raw as CognitiveLevel;
    }
    return thinking ? "APPLY" : "REMEMBER";
  }

  /**
   * Приводит варианты ответа к правилам типа вопроса.
   * Возвращает null, если вопрос использовать нельзя.
   */
  private normalizeOptions(
    type: QuestionType,
    options: { text: string; isCorrect: boolean }[]
  ): { text: string; isCorrect: boolean }[] | null {
    if (type === "OPEN") {
      return [];
    }

    if (type === "SHORT_ANSWER") {
      // У короткого ответа вариантов нет, но нужен эталон — проверяется выше.
      return [];
    }

    if (type === "TRUE_FALSE") {
      const prepared = options.slice(0, 2);
      if (prepared.length < 2) {
        return null;
      }
      // Ровно один правильный вариант.
      const correctIndex = prepared.findIndex((option) => option.isCorrect);
      return prepared.map((option, index) => ({
        text: option.text,
        isCorrect: index === (correctIndex >= 0 ? correctIndex : 0),
      }));
    }

    if (options.length < 2) {
      return null;
    }

    if (type === "SINGLE_CHOICE") {
      // Ровно один правильный вариант.
      const correctIndex = options.findIndex((option) => option.isCorrect);
      return options.map((option, index) => ({
        text: option.text,
        isCorrect: index === (correctIndex >= 0 ? correctIndex : 0),
      }));
    }

    // MULTIPLE_CHOICE: правильных должно быть хотя бы одно.
    if (!options.some((option) => option.isCorrect)) {
      return options.map((option, index) => ({
        text: option.text,
        isCorrect: index === 0,
      }));
    }

    return options;
  }

  private toText(value: string | null | undefined): string | null {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toSourceQuote(value: string | null | undefined): string | null {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) {
      return null;
    }
    return trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
  }

  /** Считает стоимость запроса по реальному расходу токенов. */
  private buildUsage(
    data: ChatCompletionResponse,
    effort: string,
    durationMs: number
  ): GenerationUsage {
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const cacheHitTokens =
      data.usage?.prompt_cache_hit_tokens ??
      Math.max(inputTokens - (data.usage?.prompt_cache_miss_tokens ?? 0), 0);

    return {
      model: this.model,
      effort,
      inputTokens,
      outputTokens,
      cacheHitTokens,
      costUsd: calculateCost({
        model: this.model,
        inputTokens,
        outputTokens,
        cacheHitTokens,
      }),
      durationMs,
    };
  }
}
