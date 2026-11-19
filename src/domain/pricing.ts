// Стоимость генерации на DeepSeek. Цены взяты из официального прайса
// https://api-docs.deepseek.com/quick_start/pricing (проверено 19.11.2026),
// единица измерения — доллары за 1 миллион токенов.
//
// Пиковые часы: 01:00–04:00 и 06:00–10:00 UTC по будням. Всё остальное время
// (и все выходные) цена вдвое ниже. Reasoning-токены (режим «thinking»)
// тарифицируются как выходные.

import type { QuestionType } from "./entities/enums";

/** Цены одной модели по тарифам «пик» и «не пик». */
export interface ModelPrice {
  inputCacheHit: number;
  inputCacheMiss: number;
  output: number;
}

const DEEPSEEK_FLASH: { peak: ModelPrice; offPeak: ModelPrice } = {
  peak: { inputCacheHit: 0.006, inputCacheMiss: 0.3, output: 1.2 },
  offPeak: { inputCacheHit: 0.003, inputCacheMiss: 0.15, output: 0.6 },
};

/** Курс для перевода долларов в белорусские рубли (для подсказки в интерфейсе). */
export const USD_TO_BYN = 2.995;

/** Возвращает тариф модели на указанный момент времени. */
export function getModelPrice(model: string, at: Date = new Date()): ModelPrice {
  // Пока поддерживается одна модель, остальные считаем по её тарифу.
  const prices = DEEPSEEK_FLASH;
  return isPeakHour(at) ? prices.peak : prices.offPeak;
}

/** Пиковый ли сейчас час (по UTC). */
export function isPeakHour(at: Date = new Date()): boolean {
  const day = at.getUTCDay(); // 0 — воскресенье, 6 — суббота
  if (day === 0 || day === 6) {
    return false;
  }
  const hour = at.getUTCHours();
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}

export interface CostInput {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Сколько входных токенов попало в кэш (считаются дешевле в 50 раз). */
  cacheHitTokens?: number;
  at?: Date;
}

/** Считает стоимость одного обращения к модели в долларах. */
export function calculateCost(input: CostInput): number {
  const price = getModelPrice(input.model, input.at);
  const cacheHit = Math.min(input.cacheHitTokens ?? 0, input.inputTokens);
  const cacheMiss = Math.max(input.inputTokens - cacheHit, 0);

  const inputCost =
    (cacheHit / 1_000_000) * price.inputCacheHit +
    (cacheMiss / 1_000_000) * price.inputCacheMiss;
  const outputCost = (input.outputTokens / 1_000_000) * price.output;

  return inputCost + outputCost;
}

/** Грубая оценка числа токенов по длине текста (русский текст ≈ 2,7 символа на токен). */
export function estimateTokens(characters: number): number {
  return Math.ceil(characters / 2.7);
}

/** Сколько выходных токенов в среднем уходит на один вопрос. */
const CONTENT_TOKENS_PER_QUESTION = 180;
/** Дополнительные reasoning-токены на вопрос в дешёвом режиме. */
const LOW_EFFORT_TOKENS_PER_QUESTION = 40;
/** Дополнительные reasoning-токены на вопрос в режиме «на размышление». */
const HIGH_EFFORT_TOKENS_PER_QUESTION = 150;

export interface EstimateInput {
  characters: number;
  questions: number;
  /** Сколько из них — вопросы «на размышление» (дорогой режим). */
  thinkingQuestions?: number;
  model?: string;
  at?: Date;
}

/**
 * Предварительная оценка стоимости генерации — показывается пользователю
 * до запуска, чтобы он понимал расход.
 */
export function estimateGenerationCost(input: EstimateInput): {
  usd: number;
  byn: number;
  inputTokens: number;
  outputTokens: number;
} {
  const thinking = Math.min(input.thinkingQuestions ?? 0, input.questions);
  const basic = Math.max(input.questions - thinking, 0);

  const inputTokens = estimateTokens(input.characters);
  const outputTokens =
    input.questions * CONTENT_TOKENS_PER_QUESTION +
    basic * LOW_EFFORT_TOKENS_PER_QUESTION +
    thinking * HIGH_EFFORT_TOKENS_PER_QUESTION;

  const usd = calculateCost({
    model: input.model ?? "deepseek-flash",
    inputTokens,
    outputTokens,
    at: input.at,
  });

  return { usd, byn: usd * USD_TO_BYN, inputTokens, outputTokens };
}

/** Форматирует стоимость в долларах для интерфейса. */
export function formatUsd(value: number): string {
  if (value === 0) {
    return "$0";
  }
  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(3)}`;
}

/** Форматирует стоимость в белорусских рублях для интерфейса. */
export function formatByn(value: number): string {
  if (value < 0.01) {
    return `${(value * 100).toFixed(1)} коп.`;
  }
  return `${value.toFixed(2)} BYN`;
}

/** Сумма вопросов по типам — удобно для отображения настроек генерации. */
export function sumTypeCounts(counts: Partial<Record<QuestionType, number>>): number {
  return Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
}
