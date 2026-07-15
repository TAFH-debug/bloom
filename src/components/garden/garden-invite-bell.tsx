"use client";

import { useState, useTransition } from "react";
import { Bell, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { Button } from "@/components/ui/button";
import {
  acceptGardenInvitation,
  declineGardenInvitation,
} from "@/lib/garden";
import { cn } from "@/lib/utils";

export function GardenInviteBell() {
  const { incomingInvites, setIncomingInvites } = useRealtime();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const count = incomingInvites.length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={
          count > 0 ? `${count} garden invitations` : "Garden invitations"
        }
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-xl text-stone-500 transition-colors",
          "hover:bg-white/60 hover:text-stone-800",
          open && "bg-white/70 text-stone-800",
        )}
      >
        <Bell className="size-4" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-rose-200/60 bg-[#fffaf7]/95 shadow-[0_20px_50px_-28px_rgba(80,40,40,0.55)] backdrop-blur-xl">
          <div className="border-b border-rose-200/40 px-3 py-2.5">
            <p className="text-sm font-medium text-stone-800">Invitations</p>
            <p className="text-xs text-stone-500">
              Accept to join each other’s gardens
            </p>
          </div>
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-stone-400">
              No pending invites
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto p-2">
              {incomingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-xl px-2 py-2 hover:bg-white/70"
                >
                  <p className="truncate text-sm text-stone-800">
                    {invite.fromName}
                  </p>
                  <p className="truncate text-[11px] text-stone-500">
                    {invite.fromEmail}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      className="h-7 flex-1 gap-1 rounded-lg text-xs"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await acceptGardenInvitation(
                            invite.id,
                          );
                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("Gardens linked");
                          setIncomingInvites((prev) =>
                            prev.filter((item) => item.id !== invite.id),
                          );
                        });
                      }}
                    >
                      <Check className="size-3" />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      className="h-7 rounded-lg text-xs text-stone-500"
                      onClick={() => {
                        startTransition(async () => {
                          await declineGardenInvitation(invite.id);
                          setIncomingInvites((prev) =>
                            prev.filter((item) => item.id !== invite.id),
                          );
                        });
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
