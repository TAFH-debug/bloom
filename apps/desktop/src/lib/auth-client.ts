import { api, setToken } from "@/lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type AuthResult = { user: AuthUser; token: string };

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}) {
  const result = await api<AuthResult>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(result.token);
  return result.user;
}

export async function signIn(input: { email: string; password: string }) {
  const result = await api<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(result.token);
  return result.user;
}

export async function signOut() {
  try {
    await api<void>("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

export async function getMe() {
  return api<AuthUser>("/auth/me");
}

/** Compatibility shim for old better-auth client call sites. */
export const authClient = {
  signUp: {
    email: async (input: {
      name: string;
      email: string;
      password: string;
    }) => {
      try {
        await signUp(input);
        return { error: null };
      } catch (error) {
        return {
          error: {
            message:
              error instanceof Error ? error.message : "Could not sign up",
          },
        };
      }
    },
  },
  signIn: {
    email: async (input: { email: string; password: string }) => {
      try {
        await signIn(input);
        return { error: null };
      } catch (error) {
        return {
          error: {
            message:
              error instanceof Error ? error.message : "Could not sign in",
          },
        };
      }
    },
    social: async () => ({
      error: {
        message: "Google sign-in is not available in the desktop API yet",
      },
    }),
  },
  signOut: async () => {
    try {
      await signOut();
      return { error: null };
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : "Could not sign out",
        },
      };
    }
  },
};
