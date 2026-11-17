import type { NotificationType } from "./enums";

/** Системное уведомление, передаваемое в реальном времени. */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
