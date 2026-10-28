import { describe, expect, it } from "vitest";
import {
  PRICE_UNSET_LABEL,
  formatMedicationPrice,
  isPriceSet,
  summariseCartPricing,
} from "./medication-pricing";

describe("medication pricing", () => {
  it("never presents an unpriced medication as free", () => {
    expect(formatMedicationPrice(0)).toBe(PRICE_UNSET_LABEL);
    expect(formatMedicationPrice(null)).toBe(PRICE_UNSET_LABEL);
    expect(formatMedicationPrice(undefined)).toBe(PRICE_UNSET_LABEL);
    expect(formatMedicationPrice(0)).not.toContain("0");
  });

  it("formats a real price with its currency", () => {
    expect(formatMedicationPrice(1150)).toMatch(/1\s?150 FCFA/);
    expect(formatMedicationPrice(495, "F")).toMatch(/495 F$/);
  });

  it("treats only a strictly positive amount as a price", () => {
    expect(isPriceSet(1)).toBe(true);
    expect(isPriceSet(0)).toBe(false);
    expect(isPriceSet(-10)).toBe(false);
    expect(isPriceSet(Number.NaN)).toBe(false);
  });

  it("totals only the lines that carry a price", () => {
    const summary = summariseCartPricing([
      { price: 1150, quantity: 2 },
      { price: 0, quantity: 3 },
      { price: 495, quantity: 1 },
    ]);

    expect(summary.total).toBe(2795);
    expect(summary.unpricedUnits).toBe(3);
    expect(summary.isPartial).toBe(true);
  });

  it("reports a complete total when every line is priced", () => {
    const summary = summariseCartPricing([{ price: 700, quantity: 2 }]);

    expect(summary.total).toBe(1400);
    expect(summary.unpricedUnits).toBe(0);
    expect(summary.isPartial).toBe(false);
  });
});
