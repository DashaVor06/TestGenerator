// Хранение оригиналов загруженных файлов.
// Файл лежит на диске под именем <id материала>.<расширение>,
// поэтому путь всегда можно восстановить по данным из базы.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Папка для загруженных файлов (можно переопределить переменной окружения). */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/** Полный путь к файлу материала. */
export function materialFilePath(materialId: string, extension: string): string {
  return path.join(UPLOAD_DIR, `${materialId}.${extension.toLowerCase()}`);
}

/** Сохраняет оригинал файла на диск. */
export async function saveMaterialFile(
  materialId: string,
  extension: string,
  buffer: Buffer
): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(materialFilePath(materialId, extension), buffer);
}

/** Читает оригинал файла; null — если файла нет. */
export async function readMaterialFile(
  materialId: string,
  extension: string
): Promise<Buffer | null> {
  try {
    return await readFile(materialFilePath(materialId, extension));
  } catch {
    return null;
  }
}

/** Проверяет, сохранён ли оригинал файла. */
export async function materialFileExists(
  materialId: string,
  extension: string
): Promise<boolean> {
  try {
    const info = await stat(materialFilePath(materialId, extension));
    return info.isFile();
  } catch {
    return false;
  }
}

/** Тип содержимого по расширению — нужен для отдачи файла в браузер. */
export function contentTypeFor(extension: string): string {
  switch (extension.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "md":
      return "text/markdown; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}
