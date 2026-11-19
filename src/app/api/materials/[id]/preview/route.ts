// /api/materials/[id]/preview — материал в том виде, в каком его можно показать.
//
// Для каждого формата свой способ отображения:
//   PDF   — встроенная программа просмотра браузера (отдаём сам файл);
//   DOCX  — mammoth превращает документ в HTML с заголовками, списками и таблицами;
//   PPTX  — текст по слайдам (в браузере нет готового просмотрщика презентаций);
//   MD    — исходный текст разметки, который рисуется на клиенте;
//   TXT   — как есть, с сохранением переносов строк;
//   URL   — текст статьи, полученный при импорте.

import type { NextRequest } from "next/server";
import mammoth from "mammoth";
import { getMaterial } from "@/application/use-cases/materials/get-material";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import { extractPptxSlides } from "@/infrastructure/external/text-extraction";
import { readMaterialFile } from "@/infrastructure/storage/file-storage";
import { getDocumentPdf } from "@/infrastructure/storage/office-converter";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string };
}

/** Убирает из HTML документа потенциально опасные вставки. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const material = await getMaterial(params.id, user.id, {
      materials: materialRepository,
    });

    // Материал, добавленный ссылкой: показываем текст статьи.
    if (material.source === "URL") {
      return ok({
        preview: {
          kind: "markdown",
          text: material.content ?? "",
          sourceUrl: material.sourceUrl,
        },
        hasFile: false,
      });
    }

    const extension = material.fileType;
    const buffer = extension ? await readMaterialFile(material.id, extension) : null;

    // Старые материалы без сохранённого оригинала показываем как текст.
    if (!extension || !buffer) {
      return ok({
        preview: {
          kind: extension === "md" ? "markdown" : "text",
          text: material.content ?? "",
        },
        hasFile: false,
      });
    }

    if (extension === "pdf") {
      return ok({
        preview: {
          kind: "pdf",
          url: `/api/materials/${material.id}/file`,
          converted: false,
        },
        hasFile: true,
      });
    }

    // Word и PowerPoint показываем страницами: конвертируем в PDF.
    if (extension === "docx" || extension === "pptx") {
      const pdfPath = await getDocumentPdf(material.id, extension);

      if (pdfPath) {
        return ok({
          preview: {
            kind: "pdf",
            url: `/api/materials/${material.id}/file?as=pdf`,
            converted: true,
          },
          hasFile: true,
        });
      }

      // LibreOffice не установлен — показываем хотя бы текст документа.
      if (extension === "docx") {
        const result = await mammoth.convertToHtml({ buffer });
        return ok({
          preview: { kind: "html", html: sanitizeHtml(result.value) },
          hasFile: true,
        });
      }

      const slides = await extractPptxSlides(buffer);
      return ok({ preview: { kind: "slides", slides }, hasFile: true });
    }

    const text = buffer.toString("utf8");
    return ok({
      preview: { kind: extension === "md" ? "markdown" : "text", text },
      hasFile: true,
    });
  } catch (error) {
    return handleError(error);
  }
}
