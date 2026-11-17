import type { ProcessingStatus } from "./enums";

/** Учебный материал, на основе которого формируется тест. */
export interface Material {
  id: string;
  ownerId: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  fileType: string | null;
  status: ProcessingStatus;
  createdAt: Date;
}
