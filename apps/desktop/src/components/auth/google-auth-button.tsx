"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.8 2.2 2.5 6.5 2.5 11.7S6.8 21.2 12 21.2c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.8H12z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ label }: { label: string }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"idle" | "starting">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={phase !== "idle"}
        className="w-full gap-2 border-rose-200/70 bg-white/80 hover:bg-white"
        onClick={async () => {
          setPhase("starting");
          setError(null);
          const result = await authClient.signIn.social();
          setPhase("idle");
          if (result.error) {
            setError(result.error.message);
          } else {
            navigate("/");
          }
        }}
      >
        <GoogleMark className="size-4" />
        {phase === "starting" ? "Opening browser…" : label}
      </Button>
      {phase === "starting" ? (
        <p className="text-center text-xs text-stone-400">
          Complete sign-in in the browser, then return here.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
