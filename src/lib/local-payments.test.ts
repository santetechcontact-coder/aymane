import { describe, expect, it } from "vitest";
import {
  LOCAL_PAYMENT_METHODS,
  formatFCFA,
  getPaymentChannelLabel,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  getPlanAmount,
  isValidPaymentPhone,
  normalizePaymentPhone,
} from "./local-payments";

describe("local payments", () => {
  it("keeps Senegal subscription prices explicit", () => {
    expect(getPlanAmount("essentiel", "monthly")).toBe(3000);
    expect(getPlanAmount("premium", "monthly")).toBe(9000);
    expect(getPlanAmount("famille", "yearly")).toBe(150000);
    expect(formatFCFA(15000)).toBe("15 000 F");
  });

  it("exposes the expected local payment methods", () => {
    expect(LOCAL_PAYMENT_METHODS.map((method) => method.id)).toEqual([
      "wave",
      "orange_money",
      "free_money",
      "paydunya",
    ]);
  });

  it("normalizes and validates mobile money phone numbers", () => {
    expect(normalizePaymentPhone("+221 77 123 45 67")).toBe("+221771234567");
    expect(isValidPaymentPhone("+221 77 123 45 67")).toBe(true);
    expect(isValidPaymentPhone("77")).toBe(false);
  });

  it("keeps patient-facing payment labels centralized", () => {
    expect(getPaymentProviderLabel("orange_money")).toBe("Orange Money");
    expect(getPaymentChannelLabel("pharmacy_order")).toBe("Pharmacie");
    expect(getPaymentStatusLabel("awaiting_provider")).toBe("En cours");
  });
});
