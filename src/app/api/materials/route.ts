// /api/materials — список (GET) и создание материала (POST: JSON-текст или файл).

import type { NextRequest } from "next/server";
import { createMaterialSchema } from "@/application/validation/material";
import { createMaterial } from "@/application/use-cases/materials/create-material";
import { listMaterials } from "@/application/use-cases/materials/list-materials";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import { extractDocxText, extractPdfText } from "@/infrastructure/external/text-extraction";
import { getCurrentUser } from "@/app/api/_lib/auth";
import {
  badRequest,
  created,
  handleError,
  ok,
  unauthorized,
} from "@/app/api/_lib/http";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"];

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

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const title = (formData.get("title")?.toString() ?? "").trim();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return badRequest("Файл не найден");
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return badRequest("Поддерживаются только файлы PDF, DOCX или TXT");
      }
      if (file.size > MAX_FILE_SIZE) {
        return badRequest("Файл слишком большой (максимум 5 МБ)");
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let content = "";
      try {
        if (ext === "txt") {
          content = await file.text();
        } else if (ext === "pdf") {
          content = await extractPdfText(buffer);
        } else if (ext === "docx") {
          content = await extractDocxText(buffer);
        }
      } catch {
        return badRequest("Не удалось извлечь текст из файла");
      }

      const material = await createMaterial(
        user.id,
        {
          title: title || file.name,
          content: content || null,
          fileUrl: file.name,
          fileType: ext,
        },
        { materials: materialRepository }
      );

      return created({ material });
    }

    const body = await request.json().catch(() => null);
    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const material = await createMaterial(user.id, parsed.data, {
      materials: materialRepository,
    });
    return created({ material });
  } catch (error) {
    return handleError(error);
  }
}
