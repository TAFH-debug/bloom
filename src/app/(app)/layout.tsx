import { AppFrame } from "@/components/app-frame";
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
      <AppFrame people={people}>{children}</AppFrame>
    </RealtimeProvider>
  );
}
