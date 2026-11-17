// Кастомный сервер: Next.js + WebSocket (для уведомлений реального времени).
// Запускается через `tsx server.ts` (npm-скрипты dev/start).

import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { notificationHub } from "./src/infrastructure/realtime/notification-hub";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

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
  const { searchParams } = new URL(req.url ?? "/", "http://localhost");
  const userId = searchParams.get("userId");
  if (userId) {
    notificationHub.register(userId, socket);
  }
  socket.on("close", () => {
    if (userId) {
      notificationHub.unregister(userId, socket);
    }
  });
});

server.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
