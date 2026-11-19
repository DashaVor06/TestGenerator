// Простое ограничение частоты запросов (rate limit).
// Хранится в памяти процесса: этого достаточно для одного сервера
// и защищает от случайного перерасхода денег на ИИ.

/** Время жизни одного «окна» — 1 час. */
const WINDOW_MS = 60 * 60 * 1000;

/** Максимум ключей в памяти, чтобы не «текла» память. */
const MAX_KEYS = 10_000;

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Через сколько секунд можно повторить попытку. */
  retryAfterSeconds: number;
}

/**
 * Проверяет, не превышен ли лимит для ключа.
 * Ключ — например, `generate:<userId>` или `login:<ip>`.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Периодическая уборка, чтобы словарь не разрастался.
  if (buckets.size > MAX_KEYS) {
    for (const [storedKey, storedTimestamps] of buckets) {
      if (storedTimestamps.every((time) => now - time >= windowMs)) {
        buckets.delete(storedKey);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
