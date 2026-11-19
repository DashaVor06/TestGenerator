// /api/materials/[id]/file — отдаёт оригинал загруженного файла.
// С параметром ?as=pdf документ Word или PowerPoint предварительно
// конвертируется в PDF, чтобы браузер показал его страницами.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMaterial } from "@/application/use-cases/materials/get-material";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import {
  contentTypeFor,
  readMaterialFile,
} from "@/infrastructure/storage/file-storage";
import { getDocumentPdf } from "@/infrastructure/storage/office-converter";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { badRequest, handleError, unauthorized } from "@/app/api/_lib/http";
import { NotFoundError } from "@/domain/errors/domain-error";

interface RouteContext {
  params: { id: string };
}

/** Отдаёт готовый PDF из папки загрузок. */
async function pdfResponse(
  materialId: string,
  fileName: string
): Promise<NextResponse | null> {
  const pdf = await readMaterialFile(materialId, "pdf");
  if (!pdf) {
    return null;
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Проверяем, что материал принадлежит пользователю.
    const material = await getMaterial(params.id, user.id, {
      materials: materialRepository,
    });

    if (!material.fileType) {
      throw new NotFoundError("Файл материала", params.id);
    }

    const asPdf = request.nextUrl.searchParams.get("as") === "pdf";
    const needsConversion = material.fileType === "docx" || material.fileType === "pptx";

    // Документ Word/PowerPoint: показываем PDF-версию.
    if (asPdf && needsConversion) {
      const pdfPath = await getDocumentPdf(material.id, material.fileType);
      if (!pdfPath) {
        return badRequest(
          "Не удалось показать документ: установите LibreOffice и укажите путь в LIBREOFFICE_PATH"
        );
      }

      const response = await pdfResponse(
        material.id,
        `${material.title}.pdf`
      );
      if (!response) {
        return badRequest("Не удалось прочитать PDF-версию документа");
      }
      return response;
    }

    const buffer = await readMaterialFile(material.id, material.fileType);
    if (!buffer) {
      throw new NotFoundError("Файл материала", params.id);
    }

    const fileName = material.fileUrl ?? `${material.id}.${material.fileType}`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeFor(material.fileType),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
