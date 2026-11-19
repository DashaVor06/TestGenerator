// /api/notifications — история уведомлений пользователя.

import { notificationRepository } from "@/infrastructure/persistence/prisma-notification-repository";
import { getCurrentUser } from "@/app/api/_lib/auth";
import { handleError, ok, unauthorized } from "@/app/api/_lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const notifications = await notificationRepository.listByUser(user.id);
    return ok({ notifications });
  } catch (error) {
    return handleError(error);
  }
}
