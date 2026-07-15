import type { WebSocket } from "ws";
import type { RealtimeMessage } from "@/lib/realtime-protocol";

type HubGlobal = typeof globalThis & {
  __bloomRealtimeHub?: RealtimeHub;
};

export class RealtimeHub {
  private sockets = new Map<string, Set<WebSocket>>();

  add(userId: string, socket: WebSocket) {
    let set = this.sockets.get(userId);
    if (!set) {
      set = new Set();
      this.sockets.set(userId, set);
    }
    set.add(socket);
  }

  remove(userId: string, socket: WebSocket) {
    const set = this.sockets.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.sockets.delete(userId);
  }

  sendTo(userId: string, message: RealtimeMessage) {
    const set = this.sockets.get(userId);
    if (!set || set.size === 0) return;
    const raw = JSON.stringify(message);
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) {
        socket.send(raw);
      }
    }
  }

  sendToMany(userIds: Iterable<string>, message: RealtimeMessage) {
    const seen = new Set<string>();
    for (const userId of userIds) {
      if (seen.has(userId)) continue;
      seen.add(userId);
      this.sendTo(userId, message);
    }
  }
}

export function getRealtimeHub() {
  const g = globalThis as HubGlobal;
  if (!g.__bloomRealtimeHub) {
    g.__bloomRealtimeHub = new RealtimeHub();
  }
  return g.__bloomRealtimeHub;
}
