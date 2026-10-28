/**
 * Senegalese drug prices are regulated per presentation, but no exhaustive
 * public base publishes them: the catalogue ships most molecules without a
 * price, for each pharmacy to set its own.
 *
 * A price of 0 therefore means "not priced yet", never "free". Rendering it as
 * "0 FCFA" would invite a patient to budget around a figure that does not
 * exist, so every surface shows an explicit label instead, and an unpriced line
 * is left out of the cart total rather than counted as costing nothing.
 */

export const PRICE_UNSET_LABEL = "Prix en officine";

export const isPriceSet = (price: number | null | undefined): boolean => {
  const value = Number(price);
  return Number.isFinite(value) && value > 0;
};

/** Full label, unit included: "1 150 FCFA" or "Prix en officine". */
export const formatMedicationPrice = (
  price: number | null | undefined,
  unit = "FCFA",
): string =>
  isPriceSet(price)
    ? `${new Intl.NumberFormat("fr-SN").format(Number(price))} ${unit}`
    : PRICE_UNSET_LABEL;

/** Number only, for layouts that render the currency separately. */
export const formatMedicationAmount = (price: number | null | undefined): string =>
  new Intl.NumberFormat("fr-SN").format(Number(price) || 0);

export interface CartPricingLine {
  price: number | null | undefined;
  quantity: number;
}

export interface CartPricingSummary {
  /** Sum of the lines that actually carry a price. */
  total: number;
  /** How many units are waiting for the pharmacy to quote them. */
  unpricedUnits: number;
  /** True when the total covers only part of the basket. */
  isPartial: boolean;
}

export const summariseCartPricing = (lines: CartPricingLine[]): CartPricingSummary => {
  let total = 0;
  let unpricedUnits = 0;

  for (const line of lines) {
    if (isPriceSet(line.price)) total += Number(line.price) * line.quantity;
    else unpricedUnits += line.quantity;
  }

  return { total, unpricedUnits, isPartial: unpricedUnits > 0 };
};
