// Настройки приложения, которые берутся из переменных окружения.
// Значения по умолчанию подобраны так, чтобы приложение работало без .env.

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Адрес ИИ-сервиса без завершающего слэша. */
function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export const config = {
  /** Параметры генерации вопросов через внешний ИИ-сервис. */
  ai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: normalizeBaseUrl(process.env.OPENAI_BASE_URL ?? "https://api.deepseek.com"),
    model: process.env.OPENAI_MODEL ?? "deepseek-flash",
    /** Дешёвый режим для обычных вопросов. */
    basicEffort: process.env.AI_BASIC_EFFORT ?? "low",
    /** Дорогой режим для вопросов «на размышление». */
    thinkingEffort: process.env.AI_THINKING_EFFORT ?? "high",
    /** Сколько символов материала максимум отправлять в модель. */
    maxMaterialChars: toNumber(process.env.AI_MAX_MATERIAL_CHARS, 30_000),
  },
  /** Ограничения загружаемых файлов. */
  upload: {
    maxSizeMb: toNumber(process.env.MAX_UPLOAD_MB, 25),
  },
  /** Защита от перерасхода: сколько генераций в час разрешено пользователю. */
  limits: {
    generationsPerHour: toNumber(process.env.MAX_GENERATIONS_PER_HOUR, 20),
  },
};
