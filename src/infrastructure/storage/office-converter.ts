// Преобразование DOCX и PPTX в PDF через LibreOffice.
//
// Браузер умеет показывать только PDF, поэтому, чтобы документ открывался
// страницами с исходными картинками и разметкой, его нужно сначала
// конвертировать. LibreOffice запускается в фоновом режиме и кладёт рядом
// с оригиналом файл <id>.pdf, который затем показывается во встроенном
// просмотрщике браузера.

import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { materialFilePath } from "./file-storage";

const run = promisify(execFile);

/**
 * Где искать LibreOffice. Путь можно задать переменной окружения,
 * остальные варианты — стандартные места установки.
 */
const SEARCH_PATHS = [
  process.env.LIBREOFFICE_PATH,
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/libreoffice",
  "/usr/bin/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
].filter((value): value is string => Boolean(value && value.trim()));

/** Проверяет, существует ли файл. */
async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** Ищет исполняемый файл LibreOffice; null — если не найден. */
export async function findLibreOffice(): Promise<string | null> {
  for (const candidate of SEARCH_PATHS) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  // Последняя попытка: программа установлена и доступна по имени.
  try {
    await run("soffice", ["--version"], { timeout: 10_000 });
    return "soffice";
  } catch {
    return null;
  }
}

/**
 * Возвращает путь к PDF-версии документа, создавая её при необходимости.
 * null — если файла нет или LibreOffice не установлен.
 */
export async function getDocumentPdf(
  materialId: string,
  extension: string
): Promise<string | null> {
  const pdfPath = materialFilePath(materialId, "pdf");
  if (await exists(pdfPath)) {
    return pdfPath;
  }

  const sourcePath = materialFilePath(materialId, extension);
  if (!(await exists(sourcePath))) {
    return null;
  }

  const binary = await findLibreOffice();
  if (!binary) {
    return null;
  }

  try {
    await mkdir(path.dirname(pdfPath), { recursive: true });

    // Отдельный профиль пользователя: иначе LibreOffice не запустится,
    // если у пользователя уже открыт Writer или Impress.
    const profileDir = path.join(os.tmpdir(), `lo-profile-${materialId}`);

    await run(
      binary,
      [
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        "--headless",
        "--norestore",
        "--convert-to",
        "pdf",
        "--outdir",
        path.dirname(pdfPath),
        sourcePath,
      ],
      { timeout: 120_000 }
    );
  } catch {
    return null;
  }

  return (await exists(pdfPath)) ? pdfPath : null;
}
