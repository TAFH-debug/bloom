import { AppSidebar } from "@/components/app-sidebar";
import { GardenInviteBell } from "@/components/garden/garden-invite-bell";
import { GardenStatusBar } from "@/components/garden/garden-status-bar";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { getGardenDashboard } from "@/lib/garden";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { people, incomingInvites } = await getGardenDashboard();

  return (
    <RealtimeProvider initialIncoming={incomingInvites}>
      <div className="app-frame relative flex min-h-screen flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-end pr-[4.25rem] pt-3">
          <div className="pointer-events-auto">
            <GardenInviteBell />
          </div>
        </div>
        <AppSidebar />
        <div className="app-main scrollbar-bloom min-h-screen flex-1 overflow-y-auto overflow-x-hidden ml-[4.5rem] mr-14 md:ml-56">
          {children}
        </div>
        <GardenStatusBar people={people} />
      </div>
    </RealtimeProvider>
  );
}
