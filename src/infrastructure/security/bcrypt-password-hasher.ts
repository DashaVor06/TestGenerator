// Реализация порта PasswordHasher на основе bcrypt (инфраструктура).

import bcrypt from "bcryptjs";
import type { PasswordHasher } from "@/application/ports";

const SALT_ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const passwordHasher = new BcryptPasswordHasher();
