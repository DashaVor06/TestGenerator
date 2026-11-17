/** Базовый класс доменных ошибок. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Сущность не найдена. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` с id "${id}"` : ""} не найден`);
    this.name = "NotFoundError";
  }
}

/** Некорректные входные данные. */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Конфликт: ресурс уже существует. */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** Недостаточно прав для выполнения операции. */
export class UnauthorizedError extends DomainError {
  constructor(message = "Доступ запрещён") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Пользователь авторизован, но не имеет прав на действие. */
export class ForbiddenError extends DomainError {
  constructor(message = "Доступ запрещён") {
    super(message);
    this.name = "ForbiddenError";
  }
}
