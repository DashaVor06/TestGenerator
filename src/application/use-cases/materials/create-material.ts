// Use case: создание материала (текст или загруженный файл).

import type { MaterialRepository } from "@/application/ports";
import type { Material } from "@/domain/entities";

export interface CreateMaterialInput {
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
}

export interface CreateMaterialDeps {
  materials: MaterialRepository;
}

export async function createMaterial(
  ownerId: string,
  input: CreateMaterialInput,
  deps: CreateMaterialDeps
): Promise<Material> {
  return deps.materials.create({
    ownerId,
    title: input.title,
    content: input.content ?? null,
    fileUrl: input.fileUrl ?? null,
    fileType: input.fileType ?? null,
  });
}
