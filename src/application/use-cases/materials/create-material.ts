// Use case: создание материала (текст, файл или статья по ссылке).

import type { MaterialRepository } from "@/application/ports";
import type { Material, MaterialSource } from "@/domain/entities";
import { ValidationError } from "@/domain/errors/domain-error";

/** Минимальная длина текста, из которого имеет смысл генерировать вопросы. */
const MIN_CONTENT_LENGTH = 50;

export interface CreateMaterialInput {
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  source?: MaterialSource;
  sourceUrl?: string | null;
}

export interface CreateMaterialDeps {
  materials: MaterialRepository;
}

export async function createMaterial(
  ownerId: string,
  input: CreateMaterialInput,
  deps: CreateMaterialDeps
): Promise<Material> {
  const content = (input.content ?? "").trim();

  if (content.length === 0) {
    throw new ValidationError("Материал не содержит текста");
  }

  if (content.length < MIN_CONTENT_LENGTH) {
    throw new ValidationError(
      `Текст слишком короткий: нужно минимум ${MIN_CONTENT_LENGTH} символов`
    );
  }

  return deps.materials.create({
    ownerId,
    title: input.title,
    content,
    fileUrl: input.fileUrl ?? null,
    fileType: input.fileType ?? null,
    source: input.source ?? "TEXT",
    sourceUrl: input.sourceUrl ?? null,
    status: "READY",
  });
}
