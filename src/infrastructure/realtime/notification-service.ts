// Сервис уведомлений: сохраняет уведомление в БД и отправляет его по WebSocket.
// Если запись в БД не удалась, уведомление всё равно уйдёт в браузер.

import type {
  NotificationPayload,
  NotificationRepository,
  Notifier,
} from "@/application/ports";
import { notificationRepository } from "@/infrastructure/persistence/prisma-notification-repository";
import { socketNotifier } from "./socket-notifier";

export class NotificationService implements Notifier {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly sender: Notifier
  ) {}

  async notify(payload: NotificationPayload): Promise<void> {
    try {
      await this.repository.create({
        userId: payload.userId,
        type: payload.type,
        message: payload.message,
      });
    } catch (error) {
      console.error("Не удалось сохранить уведомление:", error);
    }

    await this.sender.notify(payload);
  }
}

export const notificationService = new NotificationService(
  notificationRepository,
  socketNotifier
);
