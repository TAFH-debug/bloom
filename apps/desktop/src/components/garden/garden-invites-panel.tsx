"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  acceptGardenInvitation,
  cancelGardenInvitation,
  declineGardenInvitation,
} from "@/lib/garden";
import type { GardenInvitationView } from "@/lib/garden-types";
import { cn } from "@/lib/utils";

export function GardenInvitesPanel({
  incoming,
  outgoing,
}: {
  incoming: GardenInvitationView[];
  outgoing: GardenInvitationView[];
}) {
  const [pending, startTransition] = useTransition();

  if (incoming.length === 0 && outgoing.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 space-y-4">
      {incoming.length > 0 ? (
        <div className="rounded-3xl border border-rose-200/50 bg-white/55 p-4 shadow-[0_16px_40px_-32px_rgba(80,40,40,0.45)] backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Invitations
          </p>
          <ul className="mt-3 space-y-2">
            {incoming.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/65 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">
                    {invite.fromName}
                  </p>
                  <p className="truncate text-xs text-stone-500">
                    {invite.fromEmail} wants to share gardens
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    className="gap-1 rounded-xl"
                    onClick={() => {
                      startTransition(async () => {
                        const result = await acceptGardenInvitation(invite.id);
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("You are in each other’s gardens");
                      });
                    }}
                  >
                    <Check className="size-3.5" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    className="rounded-xl text-stone-500"
                    onClick={() => {
                      startTransition(async () => {
                        await declineGardenInvitation(invite.id);
                        toast.message("Invitation declined");
                      });
                    }}
                  >
                    <X className="size-3.5" />
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {outgoing.length > 0 ? (
        <div className="rounded-3xl border border-dashed border-rose-200/60 bg-white/40 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Pending sent
          </p>
          <ul className="mt-2 space-y-1.5">
            {outgoing.map((invite) => (
              <li
                key={invite.id}
                className={cn(
                  "flex items-center justify-between gap-3 text-sm text-stone-600",
                )}
              >
                <span className="truncate">
                  Waiting on {invite.toName}{" "}
                  <span className="text-stone-400">({invite.toEmail})</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  className="shrink-0 rounded-xl text-stone-400"
                  onClick={() => {
                    startTransition(async () => {
                      await cancelGardenInvitation(invite.id);
                      toast.message("Invitation cancelled");
                    });
                  }}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
