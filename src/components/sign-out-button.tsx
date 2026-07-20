"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full cursor-pointer gap-2 text-stone-500 transition-colors duration-300 hover:bg-white/50 hover:text-stone-800",
        collapsed ? "justify-center" : "justify-center md:justify-start",
      )}
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="size-4 shrink-0" />
      {!collapsed ? (
        <span className="hidden md:inline">Sign out</span>
      ) : null}
    </Button>
  );
}
