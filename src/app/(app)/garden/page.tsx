import { GardenClient } from "@/components/garden/garden-client";
import { getGardenDashboard } from "@/lib/garden";

export default async function GardenPage() {
  const data = await getGardenDashboard();

  return (
    <main className="relative min-h-full overflow-hidden">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_15%_10%,rgba(247,196,212,0.4),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(255,232,214,0.45),transparent_32%),linear-gradient(180deg,#f8f1ea_0%,#f3ebe3_45%,#efe6dc_100%)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute right-1/4 top-10 h-56 w-56 animate-orb rounded-full bg-rose-200/25 blur-3xl" />
      <div className="relative z-10">
        <GardenClient
          people={data.people}
          guestCount={data.guestCount}
          maxGuests={data.maxGuests}
          capacity={data.capacity}
          incomingInvites={data.incomingInvites}
          outgoingInvites={data.outgoingInvites}
        />
      </div>
    </main>
  );
}
