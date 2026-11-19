// /api/materials — список материалов (GET) и создание нового (POST).
//
// Материал можно добавить тремя способами:
//   1) обычным текстом (JSON);
//   2) файлом PDF / DOCX / PPTX / TXT / MD (multipart/form-data);
//   3) ссылкой на статью (JSON с полем sourceUrl).

import type { NextRequest } from "next/server";
import {
  createMaterialSchema,
  createUrlMaterialSchema,
} from "@/application/validation/material";
import { createMaterial } from "@/application/use-cases/materials/create-material";
import { listMaterials } from "@/application/use-cases/materials/list-materials";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import { extractFileText } from "@/infrastructure/external/text-extraction";
import { fetchUrlContent } from "@/infrastructure/external/url-extraction";
import { config } from "@/config";
import { getCurrentUser } from "@/app/api/_lib/auth";
import {
  badRequest,
  created,
  handleError,
  ok,
  unauthorized,
} from "@/app/api/_lib/http";

/** Разрешённые расширения файлов. */
const ALLOWED_EXTENSIONS = ["pdf", "docx", "pptx", "txt", "md"];
const MAX_FILE_SIZE = config.upload.maxSizeMb * 1024 * 1024;

/**
 * Проверяет реальный тип файла по «сигнатуре» в начале данных,
 * а не только по расширению.
 */
function checkFileSignature(buffer: Buffer, extension: string): boolean {
  const isPdf = buffer.subarray(0, 4).toString("latin1") === "%PDF";
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK" — DOCX и PPTX

  if (extension === "pdf") {
    return isPdf;
  }
  if (extension === "docx" || extension === "pptx") {
    return isZip;
  }
  return true;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const materials = await listMaterials(user.id, {
      materials: materialRepository,
    });
    return ok({ materials });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const contentType = request.headers.get("content-type") ?? "";

    // --- Вариант 1: загрузка файла -------------------------------------
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const title = (formData.get("title")?.toString() ?? "").trim();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return badRequest("Файл не найден");
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return badRequest("Поддерживаются файлы PDF, DOCX, PPTX, TXT и MD");
      }
      if (file.size > MAX_FILE_SIZE) {
        return badRequest(
          `Файл слишком большой (максимум ${config.upload.maxSizeMb} МБ)`
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (!checkFileSignature(buffer, extension)) {
        return badRequest("Содержимое файла не совпадает с его расширением");
      }

      let content = "";
      try {
        content = await extractFileText(buffer, extension);
      } catch {
        return badRequest("Не удалось извлечь текст из файла");
      }

      const material = await createMaterial(
        user.id,
        {
          title: title || file.name,
          content,
          fileUrl: file.name,
          fileType: extension,
          source: "FILE",
        },
        { materials: materialRepository }
      );

      return created({ material });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return badRequest("Некорректный запрос");
    }

    // --- Вариант 2: статья по ссылке -----------------------------------
    if (typeof body.sourceUrl === "string" && body.sourceUrl.trim().length > 0) {
      const parsedUrl = createUrlMaterialSchema.safeParse(body);
      if (!parsedUrl.success) {
        return badRequest(
          parsedUrl.error.issues.map((issue) => issue.message).join("; ")
        );
      }

      let article;
      try {
        article = await fetchUrlContent(parsedUrl.data.sourceUrl);
      } catch (error) {
        return badRequest(
          error instanceof Error ? error.message : "Не удалось загрузить страницу"
        );
      }

      const material = await createMaterial(
        user.id,
        {
          title: parsedUrl.data.title || article.title || parsedUrl.data.sourceUrl,
          content: article.text,
          source: "URL",
          sourceUrl: parsedUrl.data.sourceUrl,
        },
        { materials: materialRepository }
      );

      return created({ material });
    }

    // --- Вариант 3: обычный текст --------------------------------------
    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
    }

    const material = await createMaterial(
      user.id,
      {
        title: parsed.data.title,
        content: parsed.data.content ?? "",
        source: "TEXT",
      },
      { materials: materialRepository }
    );

    return created({ material });
  } catch (error) {
    return handleError(error);
  }
}
