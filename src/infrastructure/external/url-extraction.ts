// Загрузка статьи по ссылке.
//
// Основной способ — Fetch API DeepSeek: он возвращает уже очищенный текст
// в Markdown. Если ключа нет или сервис недоступен, используется обычная
// загрузка страницы и простое извлечение текста из HTML.

import { config } from "@/config";

export interface UrlContent {
  title: string;
  text: string;
}

/** Адрес Fetch API DeepSeek (базовый адрес может быть указан с /v1). */
function buildFetchEndpoint(): string {
  const base = config.ai.baseUrl.replace(/\/v1$/, "");
  return `${base}/v1/tools/fetch`;
}

/**
 * Проверяет ссылку: разрешены только http/https и только публичные адреса.
 * Это защита от запросов к внутренним сервисам (SSRF).
 */
export function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Некорректная ссылка");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Поддерживаются только ссылки http и https");
  }

  const host = url.hostname.toLowerCase();
  const isLocalhost = host === "localhost" || host.endsWith(".localhost");
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (isLocalhost || isIpAddress) {
    throw new Error("Ссылки на локальные адреса запрещены");
  }

  return url;
}

/** Убирает из HTML служебные блоки и превращает разметку в текст. */
function htmlToText(html: string): { title: string; text: string } {
  const withoutServiceBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const titleMatch = withoutServiceBlocks.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  // Основной текст обычно лежит в <article> или <main>, иначе берём всё тело.
  const body =
    withoutServiceBlocks.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    withoutServiceBlocks.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    withoutServiceBlocks.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    withoutServiceBlocks;

  const text = body
    .replace(/<\/(p|div|section|h[1-6]|li|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  return { title, text: decodeEntities(text) };
}

/** Заменяет основные HTML-сущности на символы. */
function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/** Скачивает страницу обычным запросом и вытаскивает текст из HTML. */
async function fetchWithHtmlParsing(url: URL): Promise<UrlContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        // Некоторые сайты отдают разметку только браузерным клиентам.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "ru,en;q=0.9",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Сайт вернул ошибку ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/pdf")) {
      throw new Error("Ссылка ведёт на PDF. Скачайте файл и загрузите его как материал.");
    }

    const html = await response.text();
    return htmlToText(html);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Загружает статью по ссылке.
 * Сначала пробуем Fetch API DeepSeek (он отдаёт чистый Markdown),
 * затем — обычную загрузку страницы.
 */
export async function fetchUrlContent(rawUrl: string): Promise<UrlContent> {
  const url = validateUrl(rawUrl);

  if (config.ai.apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetch(buildFetchEndpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.ai.apiKey}`,
          },
          body: JSON.stringify({ url: url.toString() }),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as { title?: string; content?: string };
          const text = (data.content ?? "").trim();
          if (text.length > 0) {
            return { title: (data.title ?? "").trim(), text };
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Если сервис не ответил — переходим к обычной загрузке страницы.
    }
  }

  return fetchWithHtmlParsing(url);
}
