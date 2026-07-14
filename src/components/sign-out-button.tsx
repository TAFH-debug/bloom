"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-center gap-2 text-stone-500 transition-colors duration-300 hover:bg-white/50 hover:text-stone-800 md:justify-start"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="size-4 shrink-0" />
      <span className="hidden md:inline">Sign out</span>
    </Button>
  );
}
