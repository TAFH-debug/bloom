"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.8 2.2 2.5 6.5 2.5 11.7S6.8 21.2 12 21.2c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.8H12z"
      />
      <path
        fill="#34A853"
        d="M3.9 7.5l3.2 2.4C8 8.2 9.9 6.9 12 6.9c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 8.3 2.2 5.1 4.3 3.9 7.5z"
      />
      <path
        fill="#4A90E2"
        d="M12 21.2c2.6 0 4.8-.9 6.4-2.4l-3-2.5c-.8.6-1.9 1-3.4 1-2.8 0-5.2-1.9-6-4.4l-3.2 2.5c1.5 3 4.5 4.8 9.2 4.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.9 13c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7L2.7 7c-.6 1.2-.9 2.5-.9 3.9s.3 2.7.9 3.9l3.2-1.8z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        className="w-full gap-2 border-rose-200/70 bg-white/80 hover:bg-white"
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/",
          });
          if (result.error) {
            setPending(false);
            setError(
              result.error.message ??
                "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
            );
          }
        }}
      >
        <GoogleMark className="size-4" />
        {pending ? "Redirecting…" : label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
