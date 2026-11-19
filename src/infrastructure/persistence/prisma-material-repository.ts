// Реализация порта MaterialRepository на Prisma (инфраструктура).

import { prisma } from "./prisma";
import { mapMaterial } from "./mappers";
import type { CreateMaterialInput, MaterialRepository } from "@/application/ports";
import type { Material, ProcessingStatus } from "@/domain/entities";

export class PrismaMaterialRepository implements MaterialRepository {
  async findById(id: string): Promise<Material | null> {
    const material = await prisma.material.findUnique({ where: { id } });
    return material ? mapMaterial(material) : null;
  }

  async listByOwner(ownerId: string): Promise<Material[]> {
    const materials = await prisma.material.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return materials.map(mapMaterial);
  }

  async create(input: CreateMaterialInput): Promise<Material> {
    const material = await prisma.material.create({
      data: {
        ownerId: input.ownerId,
        title: input.title,
        content: input.content ?? null,
        fileUrl: input.fileUrl ?? null,
        fileType: input.fileType ?? null,
        source: input.source ?? "TEXT",
        sourceUrl: input.sourceUrl ?? null,
        status: input.status ?? "READY",
      },
    });
    return mapMaterial(material);
  }

  async updateStatus(id: string, status: ProcessingStatus): Promise<Material> {
    const material = await prisma.material.update({
      where: { id },
      data: { status },
    });
    return mapMaterial(material);
  }

  async delete(id: string): Promise<void> {
    await prisma.material.delete({ where: { id } });
  }
}

export const materialRepository = new PrismaMaterialRepository();
