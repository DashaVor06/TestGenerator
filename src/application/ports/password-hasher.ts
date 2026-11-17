// Порт хеширования паролей.
// Реализация — в infrastructure/security (bcrypt).

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
