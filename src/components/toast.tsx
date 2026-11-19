"use client";

// Всплывающие уведомления, которые приходят по WebSocket.

import { useApp } from "./providers";

export function Toast() {
  const { notifications } = useApp();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {notifications.map((notification) => (
        <div key={notification.timestamp} className="toast">
          {notification.message}
        </div>
      ))}
    </div>
  );
}
