import type { Role } from "./enums";

/** Учётная запись пользователя. */
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}
