// Use case: список материалов пользователя.

import type { MaterialRepository } from "@/application/ports";
import type { Material } from "@/domain/entities";

export interface ListMaterialsDeps {
  materials: MaterialRepository;
}

export async function listMaterials(
  ownerId: string,
  deps: ListMaterialsDeps
): Promise<Material[]> {
  return deps.materials.listByOwner(ownerId);
}
