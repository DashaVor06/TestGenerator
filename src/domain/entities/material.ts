import type { MaterialSource, ProcessingStatus } from "./enums";

/** Учебный материал, на основе которого формируется тест. */
export interface Material {
  id: string;
  ownerId: string;
  title: string;
  /** Извлечённый текст материала (по нему генерируются вопросы). */
  content: string | null;
  /** Имя загруженного файла (если материал пришёл файлом). */
  fileUrl: string | null;
  fileType: string | null;
  source: MaterialSource;
  /** Адрес статьи, если материал добавлен по ссылке. */
  sourceUrl: string | null;
  status: ProcessingStatus;
  createdAt: Date;
}
