// Словарь интерфейса: собирает тексты из отдельных файлов.
// Русский язык — основной: по его ключам TypeScript проверяет,
// что в английском переводе нет пропусков.

import { en as commonEn, ru as commonRu } from "./translations/common";
import { en as materialsEn, ru as materialsRu } from "./translations/materials";
import { en as testsEn, ru as testsRu } from "./translations/tests";
import { en as quizEn, ru as quizRu } from "./translations/quiz";

export type Language = "RU" | "EN";

const ru = {
  ...commonRu,
  ...materialsRu,
  ...testsRu,
  ...quizRu,
};

const en: Record<keyof typeof ru, string> = {
  ...commonEn,
  ...materialsEn,
  ...testsEn,
  ...quizEn,
};

export const translations: Record<Language, Record<keyof typeof ru, string>> = {
  RU: ru,
  EN: en,
};

/** Ключ любого текста интерфейса. */
export type TranslationKey = keyof typeof ru;

/** Язык по умолчанию. */
export const DEFAULT_LANGUAGE: Language = "RU";

/** Проверяет, что строка — известный язык интерфейса. */
export function isLanguage(value: string | undefined | null): value is Language {
  return value === "RU" || value === "EN";
}
