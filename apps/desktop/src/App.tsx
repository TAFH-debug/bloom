import { Navigate, Route, Routes } from "react-router-dom";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { Toaster } from "@/components/ui/sonner";
import { toDateKey } from "@/lib/consistency";
import { AuthLayout } from "@/pages/auth-layout";
import { CalendarPage } from "@/pages/calendar-page";
import { FocusPage } from "@/pages/focus-page";
import { GardenPage } from "@/pages/garden-page";
import { HabitsPage } from "@/pages/habits-page";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";
import { RequireAuth } from "@/pages/require-auth";
import { SettingsPage } from "@/pages/settings-page";
import { SignupPage } from "@/pages/signup-page";

export function App() {
  return (
    <DesktopShell>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/garden" element={<GardenPage />} />
          <Route
            path="/calendar"
            element={<Navigate to={`/calendar/${toDateKey()}`} replace />}
          />
          <Route path="/calendar/:day" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </DesktopShell>
  );
}
