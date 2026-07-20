import { SignupForm } from "@/components/auth/signup-form";

export function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <SignupForm />
    </div>
  );
}
