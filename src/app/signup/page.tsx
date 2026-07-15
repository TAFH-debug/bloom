import { BloomLogo } from "@/components/bloom-logo";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_70%_15%,rgba(247,196,212,0.45),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(255,232,214,0.5),transparent_35%),linear-gradient(160deg,#f8f1ea,#efe3d8)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute right-1/4 top-20 h-52 w-52 animate-orb-delayed rounded-full bg-amber-100/45 blur-3xl" />
      <div className="relative z-10 mb-10 flex w-full max-w-lg animate-fade-up flex-col items-center text-center">
        <BloomLogo size={64} priority className="mb-4 rounded-2xl" />
        <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-stone-900">
          Bloom
        </p>
        <p className="mt-2 text-stone-500">Create your account</p>
      </div>
      <div className="relative z-10 w-full max-w-lg animate-fade-up-delayed">
        <SignupForm />
      </div>
    </main>
  );
}
