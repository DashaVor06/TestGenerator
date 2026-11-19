// Реализация порта NotificationRepository на Prisma (инфраструктура).

import { prisma } from "./prisma";
import { mapNotification } from "./mappers";
import type {
  CreateNotificationInput,
  NotificationRepository,
} from "@/application/ports";
import type { Notification } from "@/domain/entities";

export class PrismaNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = await prisma.notification.create({ data: input });
    return mapNotification(notification);
  }

  async listByUser(userId: string): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return notifications.map(mapNotification);
  }
}

export const notificationRepository = new PrismaNotificationRepository();
