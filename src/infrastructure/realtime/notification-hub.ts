// Хаб WebSocket-соединений (синглтон через globalThis, чтобы делиться
// между кастомным сервером и route handlers Next.js).

import { WebSocket } from "ws";

class NotificationHub {
  private connections = new Map<string, Set<WebSocket>>();

  register(userId: string, socket: WebSocket): void {
    const set = this.connections.get(userId) ?? new Set<WebSocket>();
    set.add(socket);
    this.connections.set(userId, set);
  }

  unregister(userId: string, socket: WebSocket): void {
    const set = this.connections.get(userId);
    if (!set) {
      return;
    }
    set.delete(socket);
    if (set.size === 0) {
      this.connections.delete(userId);
    }
  }

  send(userId: string, payload: unknown): void {
    const sockets = this.connections.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }
    const message = JSON.stringify(payload);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }
}

const globalForHub = globalThis as unknown as {
  notificationHub?: NotificationHub;
};

export const notificationHub =
  globalForHub.notificationHub ?? new NotificationHub();

if (!globalForHub.notificationHub) {
  globalForHub.notificationHub = notificationHub;
}
