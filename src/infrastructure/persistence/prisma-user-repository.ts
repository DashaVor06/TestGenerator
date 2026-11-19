// Реализация порта UserRepository на Prisma (инфраструктура).

import { prisma } from "./prisma";
import { mapUser } from "./mappers";
import type { CreateUserInput, UserRepository } from "@/application/ports";
import type { TestLanguage, User } from "@/domain/entities";

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? mapUser(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
      },
    });
    return mapUser(user);
  }

  async updateLanguage(id: string, language: TestLanguage): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { language },
    });
    return mapUser(user);
  }
}

export const userRepository = new PrismaUserRepository();
