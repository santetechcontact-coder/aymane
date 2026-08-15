import { afterEach, describe, expect, it, vi } from "vitest";
import { friendlyAuthError } from "./account-backend";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Static hosting answers /api/* with the SPA shell instead of the service.
const spaShellResponse = (status: number) =>
  new Response("<!doctype html><html></html>", { status, headers: { "content-type": "text/html" } });

const fakeSession = { access_token: "token" } as never;

// Each case needs a fresh module: the unreachable flag is module-level state.
const loadModule = async () => {
  vi.resetModules();
  return import("./account-backend");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncAccountSession", () => {
  it("reports the backend as unavailable when the SPA shell answers instead", async () => {
    const { syncAccountSession, AccountBackendUnavailableError } = await loadModule();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(spaShellResponse(405)));

    await expect(syncAccountSession(fakeSession, "signup"))
      .rejects.toBeInstanceOf(AccountBackendUnavailableError);
  });

  it("stops calling an undeployed backend after the first attempt", async () => {
    const { syncAccountSession } = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue(spaShellResponse(405));
    vi.stubGlobal("fetch", fetchMock);

    await syncAccountSession(fakeSession).catch(() => null);
    await syncAccountSession(fakeSession).catch(() => null);
    await syncAccountSession(fakeSession).catch(() => null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the account when the service is actually running", async () => {
    const { syncAccountSession } = await loadModule();
    const payload = { account: { id: "u1", fullName: "Awa Diop" }, welcomeMessage: "Bon retour" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(payload)));

    await expect(syncAccountSession(fakeSession, "signin")).resolves.toEqual(payload);
  });
});

describe("friendlyAuthError", () => {
  it("does not expose raw invalid credential messages", () => {
    expect(friendlyAuthError(new Error("Invalid login credentials")))
      .toBe("Email ou mot de passe incorrect.");
  });

  it("explains email confirmation in plain French", () => {
    expect(friendlyAuthError(new Error("Email not confirmed")))
      .toBe("Confirmez d'abord votre adresse email, puis réessayez.");
  });

  it("uses a neutral fallback for unknown server errors", () => {
    expect(friendlyAuthError(new Error("internal database detail")))
      .toBe("Impossible de terminer cette action pour le moment. Réessayez dans quelques instants.");
  });
});
