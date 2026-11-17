// /api/materials/[id] — получение (GET) и удаление (DELETE) материала.

import type { NextRequest } from "next/server";
import { getMaterial } from "@/application/use-cases/materials/get-material";
import { deleteMaterial } from "@/application/use-cases/materials/delete-material";
import { materialRepository } from "@/infrastructure/persistence/prisma-material-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

interface RouteContext {
  params: { id: string };
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
    return ok({ material });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }
    await deleteMaterial(params.id, user.id, { materials: materialRepository });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
