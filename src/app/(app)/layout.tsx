import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="min-h-screen pl-[4.5rem] md:pl-56">{children}</div>
    </div>
  );
}
