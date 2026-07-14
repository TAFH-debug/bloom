"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Home } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/habits", label: "Habits", icon: Leaf },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[4.5rem] flex-col border-r border-rose-200/40 bg-[linear-gradient(180deg,rgba(255,248,243,0.92)_0%,rgba(247,230,220,0.88)_45%,rgba(243,214,208,0.9)_100%)] backdrop-blur-xl md:w-56">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-8 top-10 h-32 w-32 animate-orb rounded-full bg-rose-200/40 blur-2xl" />
        <div className="absolute -right-10 bottom-20 h-40 w-40 animate-orb-delayed rounded-full bg-amber-100/50 blur-2xl" />
      </div>

      <div className="relative flex h-full flex-col px-3 py-6 md:px-4">
        <Link
          href="/"
          className="group mb-10 flex items-center gap-3 px-2 transition-transform duration-300 hover:translate-x-0.5"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-300 via-rose-200 to-amber-100 shadow-[0_8px_24px_-12px_rgba(190,100,120,0.55)] transition-shadow duration-300 group-hover:shadow-[0_12px_28px_-10px_rgba(190,100,120,0.65)]">
            <Leaf className="size-4 text-rose-800/80" />
          </span>
          <span className="hidden font-[family-name:var(--font-display)] text-2xl tracking-tight text-stone-900 md:block">
            Bloom
          </span>
        </Link>

        <nav className="relative flex flex-1 flex-col gap-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-all duration-300",
                  active
                    ? "bg-white/70 text-stone-900 shadow-[0_8px_24px_-16px_rgba(80,50,40,0.45)]"
                    : "text-stone-500 hover:bg-white/45 hover:text-stone-800",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-rose-400 to-amber-300 animate-grow-y" />
                ) : null}
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-300",
                    active ? "text-rose-700" : "text-stone-400 group-hover:scale-110",
                  )}
                />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-rose-200/40 pt-4">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
