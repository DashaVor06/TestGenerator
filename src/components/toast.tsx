"use client";

import { useApp } from "./providers";

export function Toast() {
  const { notifications } = useApp();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div key={n.timestamp} className="toast">
          {n.message}
        </div>
      ))}
    </div>
  );
}
