// /api/materials/[id]/file — отдаёт оригинал загруженного файла.
// Используется для показа PDF в браузере и для скачивания документа.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMaterial } from "@/application/use-cases/materials/get-material";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import {
  contentTypeFor,
  readMaterialFile,
} from "@/infrastructure/storage/file-storage";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, unauthorized } from "@/app/api/_lib/http";
import { NotFoundError } from "@/domain/errors/domain-error";

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
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
