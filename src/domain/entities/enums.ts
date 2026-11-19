// Общие перечисляемые типы домена (ядро, ни от чего не зависит).

/** Роль пользователя. */
export type Role = "GUEST" | "USER" | "ADMIN";

/** Тип вопроса. От типа зависит способ проверки ответа. */
export type QuestionType =
  | "SINGLE_CHOICE" // один вариант из нескольких
  | "MULTIPLE_CHOICE" // несколько вариантов
  | "TRUE_FALSE" // верно / неверно
  | "SHORT_ANSWER" // короткий ответ, вводится текстом
  | "OPEN"; // развёрнутый ответ, проверяется вручную

/** Сложность вопроса и теста. */
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

/**
 * Уровень мышления по таксономии Блума.
 * REMEMBER — вспомнить факт из материала,
 * APPLY и ANALYZE — «вопросы на размышление»: ответ надо вывести, а не найти в тексте.
 */
export type CognitiveLevel = "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE";

/** Статус обработки материала или теста. */
export type ProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";

/** Кто может увидеть и пройти тест. */
export type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

/** Источник учебного материала. */
export type MaterialSource = "TEXT" | "FILE" | "URL";

/** Язык интерфейса и язык генерации вопросов. */
export type TestLanguage = "RU" | "EN";

/** Типы уведомлений, которые отправляются по WebSocket. */
export type NotificationType =
  | "GENERATION_STARTED"
  | "GENERATION_COMPLETED"
  | "GENERATION_FAILED"
  | "INFO";
