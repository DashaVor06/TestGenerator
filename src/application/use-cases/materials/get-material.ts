// Use case: получение материала (с проверкой авторства).

import type { MaterialRepository } from "@/application/ports";
import type { Material } from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";

export interface GetMaterialDeps {
  materials: MaterialRepository;
}

export async function getMaterial(
  id: string,
  currentUserId: string,
  deps: GetMaterialDeps
): Promise<Material> {
  const material = await deps.materials.findById(id);
  if (!material) {
    throw new NotFoundError("Материал", id);
  }
  if (material.ownerId !== currentUserId) {
    throw new ForbiddenError("Нет доступа к этому материалу");
  }
  return material;
}
