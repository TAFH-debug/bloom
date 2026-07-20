import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AppFrame } from "@/components/app-frame";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { getMe } from "@/lib/auth-client";
import { getGardenDashboard } from "@/lib/garden";
import type { GardenInvitationView, GardenPerson } from "@/lib/garden-types";
import { onRefresh } from "@/lib/refresh";
import { ApiError } from "@/lib/api";

export function RequireAuth() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "anon" }
    | {
        status: "ready";
        people: GardenPerson[];
        incomingInvites: GardenInvitationView[];
      }
  >({ status: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => onRefresh(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await getMe();
        const dash = await getGardenDashboard();
        if (!cancelled) {
          setState({
            status: "ready",
            people: dash.people,
            incomingInvites: dash.incomingInvites,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: error instanceof ApiError && error.status === 401
              ? "anon"
              : "anon",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f1ea] text-stone-500">
        Loading Bloom…
      </div>
    );
  }

  if (state.status === "anon") {
    return <Navigate to="/login" replace />;
  }

  return (
    <RealtimeProvider initialIncoming={state.incomingInvites}>
      <AppFrame people={state.people}>
        <Outlet context={{ people: state.people, refreshKey: tick }} />
      </AppFrame>
    </RealtimeProvider>
  );
}
