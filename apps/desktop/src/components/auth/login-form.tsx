"use client";

import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Unable to sign in");
      return;
    }

    navigate("/");
  }

  return (
    <div className="w-full max-w-lg space-y-5 rounded-3xl border border-rose-200/50 bg-white/65 p-6 shadow-[0_20px_50px_-30px_rgba(80,40,40,0.45)] backdrop-blur-md md:p-8">
      <GoogleAuthButton label="Continue with Google" />
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-stone-400">
        <span className="h-px flex-1 bg-rose-200/70" />
        or
        <span className="h-px flex-1 bg-rose-200/70" />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full gap-1.5">
          <LogIn className="size-4" />
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            to="/signup"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
