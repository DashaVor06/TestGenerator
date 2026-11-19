// Извлечение текста из загруженных файлов: PDF, DOCX, PPTX, TXT, MD.
// Для PPTX используется JSZip: файл .pptx — это ZIP-архив с XML внутри.

import { extractText } from "unpdf";
import mammoth from "mammoth";
import JSZip from "jszip";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(buffer);
  return Array.isArray(text) ? text.join("\n\n") : text;
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

/** Достаёт текст из XML-файла слайда: все элементы <a:t> — это текстовые блоки. */
function extractTextFromSlideXml(xml: string): string {
  const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
  return matches
    .map((fragment) => fragment.replace(/<[^>]+>/g, ""))
    .map(decodeXmlEntities)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Заменяет основные XML-сущности на обычные символы. */
function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/**
 * Извлекает текст презентации PowerPoint.
 * Слайды читаются по порядку номеров, каждый слайд отделяется пустой строкой.
 */
export async function extractPptxText(buffer: Buffer): Promise<string> {
  const archive = await JSZip.loadAsync(buffer);

  const slideNames = Object.keys(archive.files)
    .map((name) => {
      const match = name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      return match ? { name, number: Number(match[1]) } : null;
    })
    .filter((item): item is { name: string; number: number } => item !== null)
    .sort((a, b) => a.number - b.number);

  const slides: string[] = [];

  for (const slide of slideNames) {
    const xml = await archive.files[slide.name].async("string");
    const text = extractTextFromSlideXml(xml);
    if (text.length > 0) {
      slides.push(`Слайд ${slide.number}. ${text}`);
    }
  }

  return slides.join("\n\n");
}

/** Читает простой текст (TXT, MD) в кодировке UTF-8. */
export function extractPlainText(buffer: Buffer): string {
  return buffer.toString("utf8");
}

/**
 * Извлекает текст из файла по его расширению.
 * Бросает ошибку, если формат не поддерживается или текст не найден.
 */
export async function extractFileText(buffer: Buffer, extension: string): Promise<string> {
  const ext = extension.toLowerCase();

  switch (ext) {
    case "txt":
    case "md":
      return extractPlainText(buffer);
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "pptx":
      return extractPptxText(buffer);
    default:
      throw new Error(`Формат .${ext} не поддерживается`);
  }
}
