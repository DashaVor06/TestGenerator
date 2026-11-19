// Use case: список материалов пользователя с поиском и сортировкой.

import type { MaterialRepository } from "@/application/ports";
import type { Material } from "@/domain/entities";

export interface ListMaterialsInput {
  search?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface ListMaterialsDeps {
  materials: MaterialRepository;
}

export async function listMaterials(
  ownerId: string,
  input: ListMaterialsInput,
  deps: ListMaterialsDeps
): Promise<Material[]> {
  return deps.materials.listByOwner(ownerId, input);
}
