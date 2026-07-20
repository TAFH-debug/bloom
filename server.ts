import { createServer, type IncomingMessage } from "node:http";
import next from "next";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "dotenv";

config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);
const WS_PATH = "/api/ws";
const HEARTBEAT_MS = 30_000;

/** Node's raw header bag → a fetch `Headers` Better Auth can read. */
function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

async function main() {
  const app = next({ dev, hostname, port });
  await app.prepare();
  const handle = app.getRequestHandler();
  // Next owns its own upgrades (dev HMR at /_next/webpack-hmr, etc.); we must
  // hand those back to it instead of destroying the socket, or HMR/React
  // Refresh dies and the client never finishes hydrating.
  const upgrade = app.getUpgradeHandler();

  // Imported after prepare() so these modules initialize with .env.local loaded.
  const { auth } = await import("./src/lib/auth");
  const {
    getActivityTrackingEnabled,
    ingestActivitySegmentsForUser,
  } = await import("./src/lib/activity-ingest");
  const { decodeClientMessage } = await import("./src/lib/realtime/protocol");
  const { getRealtimeHub } = await import("./src/lib/realtime/hub");
  const hub = getRealtimeHub();

  const server = createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });

  // Liveness per socket, tracked off-band so we don't augment the ws type.
  const alive = new WeakMap<WebSocket, boolean>();

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url ?? "/", `http://${hostname}`).pathname;
    if (pathname !== WS_PATH) {
      void upgrade(request, socket, head);
      return;
    }

    void (async () => {
      try {
        const session = await auth.api.getSession({
          headers: toHeaders(request),
        });
        const userId = session?.user?.id;
        if (!userId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          alive.set(ws, true);
          hub.register(userId, ws);
          ws.on("pong", () => alive.set(ws, true));
          ws.on("close", () => hub.unregister(userId, ws));
          ws.on("error", () => hub.unregister(userId, ws));
          ws.on("message", (raw) => {
            const text =
              typeof raw === "string"
                ? raw
                : Buffer.isBuffer(raw)
                  ? raw.toString("utf8")
                  : Array.isArray(raw)
                    ? Buffer.concat(raw).toString("utf8")
                    : "";
            const message = decodeClientMessage(text);
            if (!message) return;
            void (async () => {
              try {
                const { inserted, updated } =
                  await ingestActivitySegmentsForUser(
                    userId,
                    message.data.segments,
                  );
                hub.send(ws, {
                  type: "activity-ingested",
                  data: { inserted: inserted + updated },
                });
              } catch (error) {
                console.error("activity-ingest failed", error);
              }
            })();
          });
          hub.send(ws, { type: "hello", data: { userId } });
          void getActivityTrackingEnabled(userId).then((enabled) => {
            hub.send(ws, {
              type: "preferences",
              data: { activityTrackingEnabled: enabled },
            });
          });
        });
      } catch {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    })();
  });

  // Drop sockets that miss a ping/pong round so the hub never fans out to
  // half-open connections (common when a laptop sleeps or a tunnel dies).
  const heartbeat = setInterval(() => {
    for (const ws of hub.allSockets()) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);

  server.listen(port, hostname, () => {
    console.log(`> Bloom ready on http://${hostname}:${port}`);
    console.log(`> WebSocket at ws://${hostname}:${port}${WS_PATH}`);
  });

  const shutdown = () => {
    clearInterval(heartbeat);
    for (const ws of hub.allSockets()) ws.close(1001, "server shutting down");
    wss.close();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
