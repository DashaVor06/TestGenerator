import type { Role, TestLanguage } from "./enums";

/** Учётная запись пользователя. */
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  /** Язык интерфейса, выбранный пользователем. */
  language: TestLanguage;
  createdAt: Date;
}
