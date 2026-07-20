import { LoginForm } from "@/components/auth/login-form";

export function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <LoginForm />
    </div>
  );
}
