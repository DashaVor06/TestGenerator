// Реализация порта UserRepository на Prisma (инфраструктура).

import type { User as PrismaUser } from "@/generated/prisma";
import { prisma } from "./prisma";
import type { CreateUserInput, UserRepository } from "@/application/ports";
import type { User } from "@/domain/entities";

export class PrismaUserRepository implements UserRepository {
  private map(user: PrismaUser): User {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? this.map(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.map(user) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
      },
    });
    return this.map(user);
  }
}

export const userRepository = new PrismaUserRepository();
