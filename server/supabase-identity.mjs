export class IdentityError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const createIdentityVerifier = ({ supabaseUrl, publishableKey }) => {
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase server configuration is missing");
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;

  return async (accessToken) => {
    if (!accessToken || accessToken.length < 32) {
      throw new IdentityError(401, "Authentication required");
    }

    const response = await fetch(endpoint, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new IdentityError(401, "Session is invalid or expired");
    }

    const user = await response.json();
    if (!user?.id || !user?.email) {
      throw new IdentityError(401, "Verified identity is incomplete");
    }
    return user;
  };
};
