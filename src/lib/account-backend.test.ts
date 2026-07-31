import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "./account-backend";

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
