// Порт отправки уведомлений в реальном времени.
// Реализация — в infrastructure/realtime (WebSocket).

export interface NotificationPayload {
  userId: string;
  type: string;
  message: string;
}

export interface Notifier {
  notify(payload: NotificationPayload): Promise<void>;
}
