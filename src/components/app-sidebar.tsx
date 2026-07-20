"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  Home,
  Flower2,
  Settings,
  Timer,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { BloomLogo } from "@/components/bloom-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarStatus } from "@/components/status/sidebar-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/habits", label: "Habits", icon: Leaf },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/garden", label: "Garden", icon: Flower2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const showLabels = !collapsed;

  return (
    <aside
      className={cn(
        "app-chrome fixed inset-y-0 left-0 z-30 flex flex-col border-r border-rose-200/40 bg-[linear-gradient(180deg,rgba(255,248,243,0.92)_0%,rgba(247,230,220,0.88)_45%,rgba(243,214,208,0.9)_100%)] backdrop-blur-xl transition-[width] duration-300",
        collapsed ? "w-[4.5rem]" : "w-[4.5rem] md:w-56",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-8 top-10 h-32 w-32 animate-orb rounded-full bg-rose-200/40 blur-2xl" />
        <div className="absolute -right-10 bottom-20 h-40 w-40 animate-orb-delayed rounded-full bg-amber-100/50 blur-2xl" />
      </div>

      <div
        className={cn(
          "relative flex h-full flex-col py-6",
          collapsed ? "px-3" : "px-3 md:px-4",
        )}
      >
        <div
          className={cn(
            "mb-10 flex items-center gap-2",
            showLabels ? "justify-between" : "flex-col gap-3",
          )}
        >
          <Link
            href="/"
            className={cn(
              "group flex items-center gap-3 px-2 transition-transform duration-300 hover:translate-x-0.5",
              showLabels ? "min-w-0 flex-1" : "justify-center px-0",
            )}
          >
            <BloomLogo
              size={36}
              className="shrink-0 transition-shadow duration-300 group-hover:shadow-[0_12px_28px_-10px_rgba(190,100,120,0.65)]"
            />
            {showLabels ? (
              <span className="hidden truncate font-[family-name:var(--font-display)] text-2xl tracking-tight text-stone-900 md:block">
                Bloom
              </span>
            ) : null}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
            aria-pressed={collapsed}
            className="hidden size-8 shrink-0 cursor-pointer text-stone-400 hover:bg-white/50 hover:text-stone-800 md:inline-flex"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        <nav className="relative flex flex-1 flex-col gap-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "group relative flex items-center rounded-xl px-2.5 py-2.5 text-sm transition-all duration-300",
                  showLabels ? "gap-3" : "justify-center",
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
                    active
                      ? "text-rose-700"
                      : "text-stone-400 group-hover:scale-110",
                  )}
                />
                {showLabels ? (
                  <span className="hidden md:inline">{label}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="relative space-y-3 border-t border-rose-200/40 pt-4">
          <SidebarStatus collapsed={collapsed} />
          <SignOutButton collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
