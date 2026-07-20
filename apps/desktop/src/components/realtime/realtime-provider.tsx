"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  GardenInvitationView,
  GardenPerson,
  GardenPersonStatus,
} from "@/lib/garden-types";
import { wsUrl } from "@/lib/api";
import { requestActivityRefresh, requestRefresh } from "@/lib/refresh";
import {
  decodeServerMessage,
  type ClientMessage,
  type ServerMessage,
} from "@/lib/realtime/protocol";

type StatusMap = Record<string, GardenPersonStatus>;

type RealtimeValue = {
  connected: boolean;
  userId: string | null;
  statuses: StatusMap;
  incomingInvites: GardenInvitationView[];
  setIncomingInvites: Dispatch<SetStateAction<GardenInvitationView[]>>;
  activityTrackingEnabled: boolean | null;
  send: (message: ClientMessage) => boolean;
};

const RealtimeContext = createContext<RealtimeValue | null>(null);

export function RealtimeProvider({
  initialIncoming,
  children,
}: {
  initialIncoming: GardenInvitationView[];
  children: ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [incomingInvites, setIncomingInvites] = useState(initialIncoming);
  const [activityTrackingEnabled, setActivityTrackingEnabled] = useState<
    boolean | null
  >(null);
  const socketRef = useRef<WebSocket | null>(null);

  const [seededFrom, setSeededFrom] = useState(initialIncoming);
  if (seededFrom !== initialIncoming) {
    setSeededFrom(initialIncoming);
    setIncomingInvites(initialIncoming);
  }

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let attempts = 0;
    let closed = false;

    function apply(message: ServerMessage) {
      switch (message.type) {
        case "status":
          setStatuses((prev) => ({
            ...prev,
            [message.data.memberId]: {
              statusPreset: message.data.statusPreset,
              statusNote: message.data.statusNote,
              statusUpdatedAt: message.data.statusUpdatedAt,
            },
          }));
          break;
        case "invite-added":
          setIncomingInvites((prev) =>
            prev.some((invite) => invite.id === message.data.id)
              ? prev
              : [message.data, ...prev],
          );
          break;
        case "invite-removed":
          setIncomingInvites((prev) =>
            prev.filter((invite) => invite.id !== message.data.invitationId),
          );
          break;
        case "garden-changed":
          requestRefresh();
          break;
        case "preferences":
          setActivityTrackingEnabled(message.data.activityTrackingEnabled);
          break;
        case "activity-ingested":
          if (message.data.inserted > 0 || message.data.updated > 0) {
            requestActivityRefresh();
          }
          break;
        case "hello":
          setUserId(message.data.userId);
          break;
        default:
          break;
      }
    }

    function connect() {
      if (closed) return;
      const ws = new WebSocket(wsUrl());
      socket = ws;
      socketRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
      };
      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        const message = decodeServerMessage(event.data);
        if (message) apply(message);
      };
      ws.onclose = () => {
        setConnected(false);
        if (socket === ws) {
          socket = null;
          socketRef.current = null;
        }
        if (closed) return;
        const delay = Math.min(10_000, 1_000 * 2 ** attempts);
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    }

    function onVisible() {
      if (document.visibilityState !== "visible" || socket || closed) return;
      window.clearTimeout(reconnectTimer);
      attempts = 0;
      connect();
    }

    connect();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(reconnectTimer);
      socket?.close();
      socketRef.current = null;
    };
  }, []);

  const value = useMemo<RealtimeValue>(
    () => ({
      connected,
      userId,
      statuses,
      incomingInvites,
      setIncomingInvites,
      activityTrackingEnabled,
      send,
    }),
    [
      connected,
      userId,
      statuses,
      incomingInvites,
      activityTrackingEnabled,
      send,
    ],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return ctx;
}

export function useGardenStatusesLive(initialPeople: GardenPerson[]) {
  const { statuses } = useRealtime();
  return useMemo(
    () =>
      initialPeople.map((person) => {
        const next = statuses[person.memberId];
        return next ? { ...person, ...next } : person;
      }),
    [initialPeople, statuses],
  );
}
