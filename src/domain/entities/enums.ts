// Общие перечисляемые типы домена (ядро, ни от чего не зависит).

export type Role = "GUEST" | "USER";

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "OPEN";

export type ProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";

export type NotificationType =
  | "GENERATION_STARTED"
  | "GENERATION_COMPLETED"
  | "GENERATION_FAILED"
  | "INFO";
