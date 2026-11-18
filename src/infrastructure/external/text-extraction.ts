// Извлечение текста из PDF и DOCX (адаптеры для внешних форматов файлов).

import { extractText } from "unpdf";
import mammoth from "mammoth";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(buffer);
  return Array.isArray(text) ? text.join("\n\n") : text;
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}
