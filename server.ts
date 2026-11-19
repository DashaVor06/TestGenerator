// Кастомный сервер: Next.js + WebSocket (для уведомлений реального времени).
// Запускается через `tsx server.ts` (npm-скрипты dev/start).
//
// Подключение к WebSocket разрешено только владельцу сессии: пользователь
// определяется по JWT из cookie, а не по параметру в адресе. Иначе любой мог бы
// подписаться на чужие уведомления.

import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { notificationHub } from "./src/infrastructure/realtime/notification-hub";
import { verifyToken } from "./src/infrastructure/security/jwt";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

/** Достаёт значение cookie по имени из заголовка Cookie. */
function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

async function main() {
  const app = next({ dev });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error("Request handler error:", error);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (socket, req) => {
    const token = readCookie(req.headers.cookie, "token");
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      // Без действующей сессии соединение не нужно.
      socket.close(1008, "Требуется авторизация");
      return;
    }

    const userId = payload.userId;
    notificationHub.register(userId, socket);

    socket.on("close", () => {
      notificationHub.unregister(userId, socket);
    });
  });

  // Периодическая проверка живости соединений: «мёртвые» сокеты закрываются.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    });
  }, 30_000);

  server.on("close", () => clearInterval(heartbeat));

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
