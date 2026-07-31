export type BillingInterval = "monthly" | "yearly";
export type SubscriptionPlanId = "essentiel" | "premium" | "famille";
export type LocalPaymentProviderId = "wave" | "orange_money" | "free_money" | "paydunya";
export type LocalPaymentChannel = "subscription" | "pharmacy_order" | "provider_service";
export type LocalPaymentStatus = "pending" | "awaiting_provider" | "paid" | "failed" | "cancelled";

export const PLAN_PRICES: Record<SubscriptionPlanId, Record<BillingInterval, number>> = {
  essentiel: { monthly: 3000, yearly: 30000 },
  premium: { monthly: 9000, yearly: 90000 },
  famille: { monthly: 15000, yearly: 150000 },
};

export const LOCAL_PAYMENT_METHODS: {
  id: LocalPaymentProviderId;
  label: string;
  hint: string;
}[] = [
  { id: "wave", label: "Wave", hint: "Numéro Wave actif au Sénégal" },
  { id: "orange_money", label: "Orange Money", hint: "Compte Orange Money du payeur" },
  { id: "free_money", label: "Free Money", hint: "Compte Free Money ou numéro associé" },
  { id: "paydunya", label: "PayDunya", hint: "Paiement local via agrégateur" },
];

export function formatFCFA(amount: number) {
  return `${new Intl.NumberFormat("fr-SN").format(amount)} F`;
}

export function getPlanAmount(planId: SubscriptionPlanId, interval: BillingInterval) {
  return PLAN_PRICES[planId][interval];
}

export function getPaymentProviderLabel(provider: LocalPaymentProviderId) {
  return LOCAL_PAYMENT_METHODS.find((method) => method.id === provider)?.label ?? "Paiement local";
}

export function getPaymentChannelLabel(channel: LocalPaymentChannel) {
  const labels: Record<LocalPaymentChannel, string> = {
    subscription: "Abonnement",
    pharmacy_order: "Pharmacie",
    provider_service: "Service de santé",
  };
  return labels[channel];
}

export function getPaymentStatusLabel(status: LocalPaymentStatus) {
  const labels: Record<LocalPaymentStatus, string> = {
    pending: "A valider",
    awaiting_provider: "En cours",
    paid: "Paye",
    failed: "A reprendre",
    cancelled: "Annule",
  };
  return labels[status];
}

export function normalizePaymentPhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export function isValidPaymentPhone(value: string) {
  const phone = normalizePaymentPhone(value);
  return phone.length >= 9 && phone.length <= 16;
}
