// Реализация порта Notifier через WebSocket-хаб.

import type { Notifier, NotificationPayload } from "@/application/ports";
import { notificationHub } from "./notification-hub";

export class SocketNotifier implements Notifier {
  async notify(payload: NotificationPayload): Promise<void> {
    notificationHub.send(payload.userId, {
      type: payload.type,
      message: payload.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export const socketNotifier = new SocketNotifier();
