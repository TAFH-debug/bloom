import type { WebSocket } from "ws";
import type { ServerMessage } from "@/lib/realtime/protocol";

type HubGlobal = typeof globalThis & { __bloomHub?: RealtimeHub };

/**
 * In-process registry of open sockets keyed by user. Lives on `globalThis`
 * so the custom server and the Next.js server bundle share one instance.
 */
export class RealtimeHub {
  private byUser = new Map<string, Set<WebSocket>>();

  register(userId: string, socket: WebSocket) {
    let set = this.byUser.get(userId);
    if (!set) {
      set = new Set();
      this.byUser.set(userId, set);
    }
    set.add(socket);
  }

  unregister(userId: string, socket: WebSocket) {
    const set = this.byUser.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.byUser.delete(userId);
  }

  send(socket: WebSocket, message: ServerMessage) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  publish(userId: string, message: ServerMessage) {
    const set = this.byUser.get(userId);
    if (!set || set.size === 0) return;
    const raw = JSON.stringify(message);
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) socket.send(raw);
    }
  }

  publishAll(userIds: Iterable<string>, message: ServerMessage) {
    const seen = new Set<string>();
    for (const userId of userIds) {
      if (seen.has(userId)) continue;
      seen.add(userId);
      this.publish(userId, message);
    }
  }

  /** Every open socket across all users — used by the heartbeat sweep. */
  *allSockets(): Generator<WebSocket> {
    for (const set of this.byUser.values()) {
      for (const socket of set) yield socket;
    }
  }
}

export function getRealtimeHub(): RealtimeHub {
  const g = globalThis as HubGlobal;
  if (!g.__bloomHub) g.__bloomHub = new RealtimeHub();
  return g.__bloomHub;
}
