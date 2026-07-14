import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_25%_20%,rgba(247,196,212,0.45),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,232,214,0.5),transparent_35%),linear-gradient(160deg,#f8f1ea,#efe3d8)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute left-1/4 top-16 h-48 w-48 animate-orb rounded-full bg-rose-200/35 blur-3xl" />
      <div className="relative z-10 mb-10 animate-fade-up text-center">
        <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-stone-900">
          Bloom
        </p>
        <p className="mt-2 text-stone-500">Sign in to continue</p>
      </div>
      <div className="relative z-10 animate-fade-up-delayed">
        <LoginForm />
      </div>
    </main>
  );
}
