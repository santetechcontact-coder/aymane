import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, HeartPulse, Loader2, Phone, ShieldCheck, Stethoscope, UsersRound, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingFAQ from "@/components/PricingFAQ";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  BillingInterval,
  LOCAL_PAYMENT_METHODS,
  LocalPaymentProviderId,
  SubscriptionPlanId,
  formatFCFA,
  getPlanAmount,
  isValidPaymentPhone,
  normalizePaymentPhone,
} from "@/lib/local-payments";
import { cn } from "@/lib/utils";

interface Plan {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  highlight?: boolean;
  icon: typeof HeartPulse;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    tagline: "Pour garder dossier, rendez-vous et ordonnances au même endroit.",
    icon: HeartPulse,
    features: ["Carnet santé mobile", "Recherche de soignants", "Ordonnances rangées", "Alertes utiles"],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Pour aller plus vite quand un souci de santé arrive.",
    highlight: true,
    icon: Stethoscope,
    features: ["Orientation prioritaire", "Téléconsultation", "Pharmacie et labo", "Suivi des traitements", "SOS renforcé"],
  },
  {
    id: "famille",
    name: "Famille",
    tagline: "Pour suivre enfants, parents et proches dans un même espace.",
    icon: UsersRound,
    features: ["Jusqu'à 5 membres", "Dossiers séparés", "Alertes proches", "Suivi enfants et seniors", "Coordination familiale"],
  },
];

type LocalPaymentRpc = {
  rpc: (
    fn: "create_local_payment_request",
    args: {
      _plan_id: SubscriptionPlanId;
      _billing_interval: BillingInterval;
      _provider: LocalPaymentProviderId;
      _payer_phone: string;
    },
  ) => Promise<{ data: string | null; error: { message?: string } | null }>;
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [interval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<LocalPaymentProviderId>("wave");
  const [paymentPhone, setPaymentPhone] = useState("+221");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Tarifs AYMANE · Santé mobile au Sénégal";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute(
      "content",
      "Des plans AYMANE simples en FCFA pour patients, familles et suivi santé mobile au Sénégal.",
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const plan = params.get("plan") as SubscriptionPlanId | null;
    const requestedInterval = params.get("interval") as BillingInterval | null;
    if (requestedInterval === "monthly" || requestedInterval === "yearly") {
      setBillingInterval(requestedInterval);
    }
    if (user && plan && PLANS.some((item) => item.id === plan)) {
      setSelectedPlan(plan);
    }
  }, [location.search, user]);

  const selectPlan = (plan: Plan) => {
    setPaymentRequestId(null);
    if (!user) {
      navigate(`/auth?plan=${plan.id}&interval=${interval}`, {
        state: { from: { pathname: "/tarifs", search: `?plan=${plan.id}&interval=${interval}` } },
      });
      return;
    }
    setSelectedPlan(plan.id);
  };

  const submitPaymentRequest = async () => {
    if (!selectedPlan) return;
    const phone = normalizePaymentPhone(paymentPhone);
    if (!isValidPaymentPhone(phone)) {
      toast({
        title: "Numéro à vérifier",
        description: "Indiquez le numéro utilisé pour le paiement mobile.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingPayment(true);
    const localPaymentClient = supabase as unknown as LocalPaymentRpc;
    const { data, error } = await localPaymentClient.rpc("create_local_payment_request", {
      _plan_id: selectedPlan,
      _billing_interval: interval,
      _provider: paymentProvider,
      _payer_phone: phone,
    });
    setSubmittingPayment(false);

    if (error) {
      toast({
        title: "Demande non enregistrée",
        description: "Vérifiez le numéro puis réessayez.",
        variant: "destructive",
      });
      return;
    }

    setPaymentRequestId(data);
    toast({
      title: "Demande de paiement enregistrée",
      description: "AYMANE garde la demande dans votre espace.",
    });
  };

  return (
    <div className="app-page-gradient min-h-[100dvh] flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 pt-24 pb-20 overflow-hidden">
        <div className="px-5 md:px-8 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr] gap-6 lg:gap-10 items-start">
            <section className="lg:sticky lg:top-28">
              <p className="label text-primary mb-4">Tarifs</p>
              <h1 className="font-display text-4xl md:text-6xl tracking-display leading-[0.96] text-ink text-balance">
                Des tarifs clairs, en FCFA, sans détour.
              </h1>
              <p className="text-[15.5px] md:text-lg text-ink-3 leading-relaxed mt-5 max-w-xl">
                Les fonctions de base restent accessibles sans abonnement. Essentiel, Premium et Famille ajoutent des services selon vos besoins.
              </p>

              <div className="mt-6 inline-grid grid-cols-2 rounded-full bg-surface-0 border border-hairline p-1 shadow-xs">
                {(["monthly", "yearly"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBillingInterval(value)}
                    className={cn(
                      "h-10 rounded-full px-4 text-[13px] font-semibold tap",
                      interval === value ? "bg-ink text-white" : "text-ink-3",
                    )}
                  >
                    {value === "monthly" ? "Mensuel" : "Annuel"}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-[1.35rem] bg-ink text-white p-5">
                <div className="flex items-start gap-3">
                  <span className="size-10 rounded-[1rem] bg-white text-ink grid place-items-center shrink-0">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.35} />
                  </span>
                  <div>
                    <p className="font-display text-xl tracking-headline">Activation avec paiement local.</p>
                    <p className="text-[13.5px] text-white/64 leading-relaxed mt-1.5">
                      Le patient choisit son plan, son moyen de paiement, puis retrouve la demande dans son espace.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {LOCAL_PAYMENT_METHODS.map((method) => (
                    <span key={method.id} className="rounded-[0.75rem] border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/76">
                      {method.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:gap-4">
              {PLANS.map((plan) => {
                const amount = getPlanAmount(plan.id, interval);
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={cn(
                      "relative rounded-[1.45rem] bg-surface-0 border border-hairline p-5 md:p-6 shadow-sm transition-shadow",
                      plan.highlight && "bg-ink text-white border-ink shadow-lg",
                    )}
                  >
                    <div className="grid md:grid-cols-[1fr_auto] gap-5 md:items-start">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <span className={cn("size-11 rounded-[1rem] grid place-items-center shrink-0", plan.highlight ? "bg-white text-ink" : "bg-primary-soft text-primary")}>
                            <Icon className="h-5 w-5" strokeWidth={2.35} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="font-display text-2xl md:text-3xl tracking-headline">{plan.name}</h2>
                              {plan.highlight && (
                                <span className="rounded-full bg-primary text-white px-2.5 py-1 text-[10.5px] font-semibold">
                                  recommandé
                                </span>
                              )}
                            </div>
                            <p className={cn("text-[14px] leading-relaxed mt-1 max-w-xl", plan.highlight ? "text-white/64" : "text-ink-3")}>
                              {plan.tagline}
                            </p>
                          </div>
                        </div>

                        <ul className="mt-5 grid sm:grid-cols-2 gap-2.5">
                          {plan.features.map((feature) => (
                            <li key={feature} className={cn("flex items-center gap-2 text-[13px]", plan.highlight ? "text-white/78" : "text-ink-2")}>
                              <Check className={cn("h-4 w-4 shrink-0", plan.highlight ? "text-primary-glow" : "text-secondary")} strokeWidth={2.6} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="md:text-right">
                        <p className="font-display text-3xl md:text-4xl tracking-headline tabular">{formatFCFA(amount)}</p>
                        <p className={cn("text-[12px] mt-1", plan.highlight ? "text-white/55" : "text-ink-3")}>
                          {interval === "monthly" ? "par mois" : "par an"}
                        </p>
                        {interval === "yearly" && (
                          <p className={cn("text-[12px] mt-1", plan.highlight ? "text-primary-glow" : "text-secondary")}>
                            {formatFCFA(Math.round(amount / 12))} / mois
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => selectPlan(plan)}
                          className={cn(
                            "mt-5 inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-[14px] font-semibold tap w-full md:w-auto",
                            plan.highlight ? "bg-white text-ink" : "bg-primary text-primary-foreground",
                          )}
                        >
                          {user ? (isSelected ? "Plan choisi" : "Choisir") : "Se connecter"}
                          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>

                    {user && isSelected ? (
                      <div className={cn("mt-5 border-t pt-5", plan.highlight ? "border-white/15" : "border-hairline")}>
                        <div className="flex items-start gap-3">
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-[0.9rem]", plan.highlight ? "bg-white/10 text-white" : "bg-primary-soft text-primary")}>
                            <Wallet className="h-4 w-4" strokeWidth={2.35} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-xl tracking-headline">Paiement mobile</p>
                            <p className={cn("mt-1 text-[12.5px] leading-relaxed", plan.highlight ? "text-white/62" : "text-ink-3")}>
                              Choisissez le moyen de paiement. La demande est enregistrée et suivie dans AYMANE.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {LOCAL_PAYMENT_METHODS.map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentProvider(method.id)}
                              className={cn(
                                "min-h-12 rounded-[0.8rem] border px-3 text-left text-[12px] font-semibold tap",
                                paymentProvider === method.id
                                  ? plan.highlight
                                    ? "border-white bg-white text-ink"
                                    : "border-primary bg-primary-soft text-primary"
                                  : plan.highlight
                                    ? "border-white/14 bg-white/5 text-white/72"
                                    : "border-hairline bg-surface-1 text-ink-3",
                              )}
                              aria-pressed={paymentProvider === method.id}
                              title={method.hint}
                            >
                              {method.label}
                            </button>
                          ))}
                        </div>

                        <label className={cn("mt-4 flex items-center gap-3 rounded-[0.85rem] border px-3 py-2.5", plan.highlight ? "border-white/14 bg-white/5" : "border-hairline bg-surface-1")}>
                          <Phone className={cn("h-4 w-4 shrink-0", plan.highlight ? "text-white/56" : "text-ink-3")} strokeWidth={2.35} />
                          <span className="sr-only">Numéro de paiement</span>
                          <input
                            type="tel"
                            inputMode="tel"
                            value={paymentPhone}
                            onChange={(event) => {
                              setPaymentPhone(event.target.value);
                              setPaymentRequestId(null);
                            }}
                            placeholder="+221 77 123 45 67"
                            className={cn("min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-4", plan.highlight ? "text-white placeholder:text-white/32" : "text-ink")}
                          />
                        </label>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className={cn("text-[12px] leading-relaxed", plan.highlight ? "text-white/58" : "text-ink-3")}>
                            Montant à enregistrer : <span className={cn("font-semibold", plan.highlight ? "text-white" : "text-ink")}>{formatFCFA(amount)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void submitPaymentRequest()}
                            disabled={submittingPayment}
                            className={cn(
                              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold tap disabled:opacity-60",
                              plan.highlight ? "bg-primary text-white" : "bg-ink text-white",
                            )}
                          >
                            {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Enregistrer
                          </button>
                        </div>

                        {paymentRequestId ? (
                          <div className={cn("mt-4 flex flex-col gap-2 rounded-[0.85rem] px-3 py-2.5 text-[12.5px] leading-relaxed sm:flex-row sm:items-center sm:justify-between", plan.highlight ? "bg-white/10 text-white/76" : "bg-secondary-soft text-secondary")}>
                            <span>Demande enregistrée. Vous pouvez la suivre dans votre espace.</span>
                            <button
                              type="button"
                              onClick={() => navigate("/dashboard/payments")}
                              className={cn("inline-flex min-h-9 items-center justify-center rounded-full px-3 text-[12px] font-semibold tap", plan.highlight ? "bg-white text-ink" : "bg-secondary text-white")}
                            >
                              Voir le suivi
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </div>
        </div>

        <div className="mt-14 md:mt-20">
          <PricingFAQ />
        </div>
      </main>
      <Footer />
    </div>
  );
}
