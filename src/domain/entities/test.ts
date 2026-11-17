import type { ProcessingStatus } from "./enums";

/** Сгенерированный тест. */
export interface Test {
  id: string;
  ownerId: string;
  title: string;
  category: string | null;
  description: string | null;
  status: ProcessingStatus;
  createdAt: Date;
}
