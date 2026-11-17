// Реализация порта MaterialRepository на Prisma (инфраструктура).

import type { Material as PrismaMaterial } from "@/generated/prisma";
import { prisma } from "./prisma";
import type { CreateMaterialInput, MaterialRepository } from "@/application/ports";
import type { Material, ProcessingStatus } from "@/domain/entities";

export class PrismaMaterialRepository implements MaterialRepository {
  private map(m: PrismaMaterial): Material {
    return {
      id: m.id,
      ownerId: m.ownerId,
      title: m.title,
      content: m.content,
      fileUrl: m.fileUrl,
      fileType: m.fileType,
      status: m.status,
      createdAt: m.createdAt,
    };
  }

  async findById(id: string): Promise<Material | null> {
    const material = await prisma.material.findUnique({ where: { id } });
    return material ? this.map(material) : null;
  }

  async listByOwner(ownerId: string): Promise<Material[]> {
    const materials = await prisma.material.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return materials.map((m) => this.map(m));
  }

  async create(input: CreateMaterialInput): Promise<Material> {
    const material = await prisma.material.create({
      data: {
        ownerId: input.ownerId,
        title: input.title,
        content: input.content ?? null,
        fileUrl: input.fileUrl ?? null,
        fileType: input.fileType ?? null,
      },
    });
    return this.map(material);
  }

  async updateStatus(id: string, status: ProcessingStatus): Promise<Material> {
    const material = await prisma.material.update({
      where: { id },
      data: { status },
    });
    return this.map(material);
  }

  async delete(id: string): Promise<void> {
    await prisma.material.delete({ where: { id } });
  }
}

export const materialRepository = new PrismaMaterialRepository();
