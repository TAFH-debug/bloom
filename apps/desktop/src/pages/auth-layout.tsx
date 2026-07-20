import { Outlet } from "react-router-dom";
import { BloomLogo } from "@/components/bloom-logo";

export function AuthLayout() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_20%_0%,rgba(247,196,212,0.4),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(255,232,214,0.45),transparent_35%),linear-gradient(180deg,#f8f1ea_0%,#f3ebe3_45%,#efe6dc_100%)] bg-[length:140%_140%]" />
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <BloomLogo size={48} />
        <p className="font-[family-name:var(--font-display)] text-3xl text-stone-900">
          Bloom
        </p>
      </div>
      <div className="relative z-10 w-full">
        <Outlet />
      </div>
    </main>
  );
}
