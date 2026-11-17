// Use case: удаление материала (с проверкой авторства).

import type { MaterialRepository } from "@/application/ports";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface DeleteMaterialDeps {
  materials: MaterialRepository;
}

export async function deleteMaterial(
  id: string,
  currentUserId: string,
  deps: DeleteMaterialDeps
): Promise<void> {
  const material = await deps.materials.findById(id);
  if (!material) {
    throw new NotFoundError("Материал", id);
  }
  if (material.ownerId !== currentUserId) {
    throw new ForbiddenError("Можно удалять только свои материалы");
  }
  await deps.materials.delete(id);
}
