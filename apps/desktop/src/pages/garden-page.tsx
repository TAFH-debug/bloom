import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { GardenClient } from "@/components/garden/garden-client";
import { getGardenDashboard } from "@/lib/garden";
import type { GardenInvitationView, GardenPerson } from "@/lib/garden-types";
import { onRefresh } from "@/lib/refresh";

export function GardenPage() {
  const ctx = useOutletContext<{ people: GardenPerson[] }>();
  const [dash, setDash] = useState<{
    people: GardenPerson[];
    incomingInvites: GardenInvitationView[];
    outgoingInvites: GardenInvitationView[];
    capacity: number;
  } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => onRefresh(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    void getGardenDashboard().then((next) => {
      if (!cancelled) {
        setDash({
          people: next.people,
          incomingInvites: next.incomingInvites,
          outgoingInvites: next.outgoingInvites ?? [],
          capacity: 5,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tick, ctx.people]);

  if (!dash) {
    return (
      <main className="flex min-h-screen items-center justify-center text-stone-500">
        Loading garden…
      </main>
    );
  }

  const guestCount = dash.people.filter((p) => !p.isSelf).length;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GardenClient
        people={dash.people}
        guestCount={guestCount}
        maxGuests={dash.capacity}
        capacity={dash.capacity}
        incomingInvites={dash.incomingInvites}
        outgoingInvites={dash.outgoingInvites}
      />
    </main>
  );
}
