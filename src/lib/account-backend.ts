import type { Session } from "@supabase/supabase-js";

export type AccountEventType = "signup" | "signin" | "session";

export interface DurableAccount {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
}

interface AccountSyncResponse {
  account: DurableAccount;
  welcomeMessage: string | null;
}

/** Raised when the durable-account service is not reachable at all. */
export class AccountBackendUnavailableError extends Error {
  constructor() {
    super("Account backend unavailable");
    this.name = "AccountBackendUnavailableError";
  }
}

// The durable-account service (server/index.mjs) only runs alongside local dev,
// where Vite proxies /api to it. Static hosting has no such route: every path
// falls through to the SPA shell, so /api/account/sync answers 405 and
// /api/account/me answers 200 text/html. Probing it on every auth state change
// would fire a request that can never succeed, so the first clear "not deployed"
// answer latches this off for the rest of the page session.
let backendReachable: boolean | null = null;

const looksUndeployed = (response: Response) =>
  response.status === 404 ||
  response.status === 405 ||
  !(response.headers.get("content-type") ?? "").includes("application/json");

export const syncAccountSession = async (
  session: Session,
  eventType: AccountEventType = "session",
): Promise<AccountSyncResponse> => {
  if (backendReachable === false) throw new AccountBackendUnavailableError();

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch("/api/account/sync", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ eventType }),
      credentials: "same-origin",
      signal: controller.signal,
    });

    if (looksUndeployed(response)) {
      backendReachable = false;
      throw new AccountBackendUnavailableError();
    }
    if (!response.ok) throw new Error("Account sync failed");

    backendReachable = true;
    return await response.json() as AccountSyncResponse;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const friendlyAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirmez d'abord votre adresse email, puis réessayez.";
  }
  if (message.includes("user already registered") || message.includes("already been registered")) {
    return "Un compte existe déjà avec cette adresse email.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  if (message.includes("password")) {
    return "Le mot de passe ne respecte pas encore toutes les règles de sécurité.";
  }
  return "Impossible de terminer cette action pour le moment. Réessayez dans quelques instants.";
};
