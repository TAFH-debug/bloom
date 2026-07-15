import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { config } from "dotenv";

config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const { auth } = await import("./src/lib/auth");
  const { getRealtimeHub } = await import("./src/lib/realtime-hub");

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });
  const hub = getRealtimeHub();

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);
    if (pathname !== "/api/ws") {
      socket.destroy();
      return;
    }

    void (async () => {
      try {
        const headerBag = new Headers();
        for (const [key, value] of Object.entries(request.headers)) {
          if (!value) continue;
          headerBag.set(key, Array.isArray(value) ? value.join(",") : value);
        }

        const session = await auth.api.getSession({ headers: headerBag });
        if (!session?.user?.id) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          const userId = session.user.id;
          hub.add(userId, ws);

          ws.on("close", () => {
            hub.remove(userId, ws);
          });

          ws.on("error", () => {
            hub.remove(userId, ws);
          });

          ws.send(JSON.stringify({ type: "garden:changed", payload: { reason: "connected" } }));
        });
      } catch {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    })();
  });

  server.listen(port, hostname, () => {
    console.log(`> Bloom ready on http://${hostname}:${port}`);
    console.log(`> WebSocket at ws://${hostname}:${port}/api/ws`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
