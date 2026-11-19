import { describe, expect, it } from "vitest";
import {
  calculateCost,
  estimateGenerationCost,
  formatByn,
  formatUsd,
  getModelPrice,
  isPeakHour,
} from "@/domain/pricing";

// Понедельник 02:00 UTC — пиковый час, понедельник 05:00 — нет.
const PEAK_MOMENT = new Date("2026-11-16T02:00:00Z");
const OFF_PEAK_MOMENT = new Date("2026-11-16T05:00:00Z");
const WEEKEND_MOMENT = new Date("2026-11-15T02:00:00Z");

describe("isPeakHour", () => {
  it("считает пиковыми часы 01–04 и 06–10 UTC по будням", () => {
    expect(isPeakHour(new Date("2026-11-16T02:00:00Z"))).toBe(true);
    expect(isPeakHour(new Date("2026-11-16T07:00:00Z"))).toBe(true);
  });

  it("не считает пиковыми остальные часы", () => {
    expect(isPeakHour(new Date("2026-11-16T05:00:00Z"))).toBe(false);
    expect(isPeakHour(new Date("2026-11-16T12:00:00Z"))).toBe(false);
  });

  it("выходные всегда дешевле", () => {
    expect(isPeakHour(new Date("2026-11-15T02:00:00Z"))).toBe(false);
    expect(isPeakHour(new Date("2026-11-14T07:00:00Z"))).toBe(false);
  });
});

describe("getModelPrice", () => {
  it("в пиковый час цена вдвое выше", () => {
    const peak = getModelPrice("deepseek-flash", PEAK_MOMENT);
    const offPeak = getModelPrice("deepseek-flash", OFF_PEAK_MOMENT);

    expect(peak.output).toBeCloseTo(offPeak.output * 2, 6);
    expect(peak.inputCacheMiss).toBeCloseTo(offPeak.inputCacheMiss * 2, 6);
  });
});

describe("calculateCost", () => {
  it("считает стоимость по входным и выходным токенам", () => {
    // 1 млн входных токенов по 0.3 и 1 млн выходных по 1.2 = 1.5 доллара.
    const cost = calculateCost({
      model: "deepseek-flash",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      at: PEAK_MOMENT,
    });

    expect(cost).toBeCloseTo(1.5, 4);
  });

  it("учитывает кэш входных токенов (в 50 раз дешевле)", () => {
    const withoutCache = calculateCost({
      model: "deepseek-flash",
      inputTokens: 100_000,
      outputTokens: 0,
      at: PEAK_MOMENT,
    });
    const withCache = calculateCost({
      model: "deepseek-flash",
      inputTokens: 100_000,
      outputTokens: 0,
      cacheHitTokens: 100_000,
      at: PEAK_MOMENT,
    });

    expect(withCache).toBeLessThan(withoutCache);
  });

  it("в выходные дешевле, чем в пик", () => {
    const peak = calculateCost({
      model: "deepseek-flash",
      inputTokens: 10_000,
      outputTokens: 10_000,
      at: PEAK_MOMENT,
    });
    const weekend = calculateCost({
      model: "deepseek-flash",
      inputTokens: 10_000,
      outputTokens: 10_000,
      at: WEEKEND_MOMENT,
    });

    expect(weekend).toBeCloseTo(peak / 2, 6);
  });
});

describe("estimateGenerationCost", () => {
  it("возвращает положительную оценку и токены", () => {
    const estimate = estimateGenerationCost({
      characters: 20_000,
      questions: 10,
      at: OFF_PEAK_MOMENT,
    });

    expect(estimate.usd).toBeGreaterThan(0);
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.outputTokens).toBeGreaterThan(0);
    expect(estimate.byn).toBeGreaterThan(estimate.usd);
  });

  it("вопросы на размышление дороже обычных", () => {
    const cheap = estimateGenerationCost({
      characters: 5_000,
      questions: 10,
      thinkingQuestions: 0,
      at: OFF_PEAK_MOMENT,
    });
    const expensive = estimateGenerationCost({
      characters: 5_000,
      questions: 10,
      thinkingQuestions: 10,
      at: OFF_PEAK_MOMENT,
    });

    expect(expensive.usd).toBeGreaterThan(cheap.usd);
  });

  it("длинный материал стоит дороже короткого", () => {
    const short = estimateGenerationCost({
      characters: 2_000,
      questions: 5,
      at: OFF_PEAK_MOMENT,
    });
    const long = estimateGenerationCost({
      characters: 50_000,
      questions: 5,
      at: OFF_PEAK_MOMENT,
    });

    expect(long.usd).toBeGreaterThan(short.usd);
  });
});

describe("форматирование стоимости", () => {
  it("показывает малые суммы с четырьмя знаками", () => {
    expect(formatUsd(0.0045)).toBe("$0.0045");
    expect(formatUsd(0)).toBe("$0");
  });

  it("переводит рубли в копейки для малых значений", () => {
    expect(formatByn(0.004)).toContain("коп.");
    expect(formatByn(1.5)).toContain("BYN");
  });
});
