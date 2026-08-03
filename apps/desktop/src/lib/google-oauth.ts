import { api, setToken } from "@/lib/api";
import { isTauri } from "@/lib/tauri";
import type { AuthUser } from "@/lib/auth-client";

type GoogleStart = { state: string; authorizationUrl: string };

type GoogleResult =
  | { status: "pending" }
  | { status: "done"; user: AuthUser; token: string }
  | { status: "error"; message?: string | null };

async function openInBrowser(url: string) {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Full Google sign-in for the desktop app:
 * 1. ask the API for an authorization URL (server keeps a PKCE state),
 * 2. open the consent page in the system browser,
 * 3. poll /auth/google/result until the API has exchanged the code.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  const { state, authorizationUrl } = await api<GoogleStart>(
    "/auth/google/start",
    { method: "POST" },
  );

  await openInBrowser(authorizationUrl);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const result = await api<GoogleResult>(
      `/auth/google/result?state=${encodeURIComponent(state)}`,
    );
    if (result.status === "done") {
      setToken(result.token);
      return result.user;
    }
    if (result.status === "error") {
      throw new Error(result.message || "Google sign-in did not complete");
    }
  }

  throw new Error("Google sign-in timed out. Please try again.");
}
