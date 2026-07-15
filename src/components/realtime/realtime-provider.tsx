"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  GardenInvitationView,
  GardenPerson,
  GardenPersonStatus,
} from "@/lib/garden-types";
import {
  parseRealtimeMessage,
  type RealtimeMessage,
} from "@/lib/realtime-protocol";

type StatusMap = Record<string, GardenPersonStatus>;

type RealtimeContextValue = {
  connected: boolean;
  statuses: StatusMap;
  incomingInvites: GardenInvitationView[];
  setIncomingInvites: React.Dispatch<
    React.SetStateAction<GardenInvitationView[]>
  >;
  gardenEpoch: number;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function wsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws`;
}

export function RealtimeProvider({
  initialIncoming,
  children,
}: {
  initialIncoming: GardenInvitationView[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [incomingInvites, setIncomingInvites] = useState(initialIncoming);
  const [gardenEpoch, setGardenEpoch] = useState(0);
  const retryRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setIncomingInvites(initialIncoming);
  }, [initialIncoming]);

  const handleMessage = useCallback(
    (message: RealtimeMessage) => {
      switch (message.type) {
        case "status":
          setStatuses((prev) => ({
            ...prev,
            [message.payload.memberId]: {
              statusPreset: message.payload.statusPreset,
              statusNote: message.payload.statusNote,
              statusUpdatedAt: message.payload.statusUpdatedAt,
            },
          }));
          break;
        case "invite:incoming":
          setIncomingInvites((prev) => {
            if (prev.some((invite) => invite.id === message.payload.id)) {
              return prev;
            }
            return [message.payload, ...prev];
          });
          break;
        case "invite:removed":
          setIncomingInvites((prev) =>
            prev.filter((invite) => invite.id !== message.payload.invitationId),
          );
          break;
        case "garden:changed":
          if (message.payload.reason !== "connected") {
            setGardenEpoch((value) => value + 1);
            router.refresh();
          }
          break;
        default:
          break;
      }
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | undefined;

    function connect() {
      if (cancelled) return;
      const socket = new WebSocket(wsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        if (cancelled) return;
        retryRef.current = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        const message = parseRealtimeMessage(event.data);
        if (message) handleMessage(message);
      };

      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        if (cancelled) return;
        const delay = Math.min(10_000, 800 * 2 ** retryRef.current);
        retryRef.current += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [handleMessage]);

  const value = useMemo(
    () => ({
      connected,
      statuses,
      incomingInvites,
      setIncomingInvites,
      gardenEpoch,
    }),
    [connected, statuses, incomingInvites, gardenEpoch],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
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
  const { statuses, gardenEpoch } = useRealtime();
  const [people, setPeople] = useState(initialPeople);

  useEffect(() => {
    setPeople(initialPeople);
  }, [initialPeople, gardenEpoch]);

  useEffect(() => {
    if (Object.keys(statuses).length === 0) return;
    setPeople((prev) =>
      prev.map((person) => {
        const next = statuses[person.memberId];
        if (!next) return person;
        if (
          next.statusPreset === person.statusPreset &&
          next.statusNote === person.statusNote &&
          next.statusUpdatedAt === person.statusUpdatedAt
        ) {
          return person;
        }
        return { ...person, ...next };
      }),
    );
  }, [statuses]);

  return people;
}
