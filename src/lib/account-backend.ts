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

export const syncAccountSession = async (
  session: Session,
  eventType: AccountEventType = "session",
): Promise<AccountSyncResponse> => {
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

    if (!response.ok) throw new Error("Account sync failed");
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
