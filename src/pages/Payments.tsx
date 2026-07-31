import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LOCAL_PAYMENT_METHODS,
  LocalPaymentChannel,
  LocalPaymentProviderId,
  LocalPaymentStatus,
  formatFCFA,
  getPaymentChannelLabel,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
} from "@/lib/local-payments";
import { cn } from "@/lib/utils";

type LocalPaymentRequest = {
  id: string;
  channel: LocalPaymentChannel;
  plan_id: string | null;
  billing_interval: "monthly" | "yearly" | null;
  order_id: string | null;
  provider: LocalPaymentProviderId;
  payer_phone: string;
  amount: number;
  currency: string;
  status: LocalPaymentStatus;
  reference: string;
  created_at: string;
};

type LocalPaymentTableClient = {
  from: (table: "local_payment_requests") => {
    select: (columns: string) => {
      order: (
        column: "created_at",
        options: { ascending: boolean },
      ) => {
        limit: (count: number) => Promise<{
          data: LocalPaymentRequest[] | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

const statusTone: Record<LocalPaymentStatus, {
  icon: typeof Clock3;
  className: string;
  dot: string;
  detail: string;
}> = {
  pending: {
    icon: Clock3,
    className: "bg-warning-soft text-warning",
    dot: "bg-warning",
    detail: "La demande est prête pour validation.",
  },
  awaiting_provider: {
    icon: RefreshCw,
    className: "bg-primary-soft text-primary",
    dot: "bg-primary",
    detail: "Le paiement est en cours de confirmation.",
  },
  paid: {
    icon: CheckCircle2,
    className: "bg-secondary-soft text-secondary",
    dot: "bg-secondary",
    detail: "Le paiement a bien été confirmé.",
  },
  failed: {
    icon: XCircle,
    className: "bg-accent-soft text-accent",
    dot: "bg-accent",
    detail: "Vous pouvez relancer avec le bon numéro.",
  },
  cancelled: {
    icon: XCircle,
    className: "bg-surface-2 text-ink-3",
    dot: "bg-ink-3",
    detail: "Cette demande n'est plus active.",
  },
};

const maskPhone = (phone: string) => {
  const compact = phone.replace(/\s+/g, "");
  if (compact.length <= 7) return compact;
  return `${compact.slice(0, 4)}...${compact.slice(-3)}`;
};

const paymentDate = (value: string) =>
  new Date(value).toLocaleString("fr-SN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const planLabel = (planId: string | null) => {
  if (!planId) return null;
  return planId.charAt(0).toUpperCase() + planId.slice(1);
};

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<LocalPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "Paiements AYMANE";
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(false);

    const client = supabase as unknown as LocalPaymentTableClient;
    client
      .from("local_payment_requests")
      .select("id, channel, plan_id, billing_interval, order_id, provider, payer_phone, amount, currency, status, reference, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error: requestError }) => {
        if (!active) return;
        if (requestError) {
          setError(true);
          setPayments([]);
        } else {
          setPayments(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const summary = useMemo(() => {
    const open = payments.filter((payment) => ["pending", "awaiting_provider"].includes(payment.status)).length;
    const paid = payments.filter((payment) => payment.status === "paid").length;
    const latest = payments[0];
    return { open, paid, latest };
  }, [payments]);

  return (
    <DashboardLayout title="Paiements" back>
      <PageHeader
        eyebrow="Suivi"
        title="Vos paiements"
        italic="locaux."
        description="Retrouvez vos demandes Wave, Orange Money, Free Money et PayDunya sans chercher dans plusieurs messages."
        actions={
          <Link
            to="/dashboard/pharmacy"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white tap"
          >
            Pharmacie
            <ArrowRight className="h-4 w-4" strokeWidth={2.35} />
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
        <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <SummaryTile
            icon={Wallet}
            label="A traiter"
            value={summary.open.toString()}
            detail="Demandes encore ouvertes"
          />
          <SummaryTile
            icon={CheckCircle2}
            label="Confirmés"
            value={summary.paid.toString()}
            detail="Paiements validés"
          />
          <SummaryTile
            icon={CreditCard}
            label="Moyens"
            value={LOCAL_PAYMENT_METHODS.length.toString()}
            detail="Wave, Orange Money et plus"
          />
        </aside>

        <section className="min-w-0">
          {loading ? (
            <PaymentSkeleton />
          ) : error ? (
            <div className="state-panel">
              <p className="font-semibold text-ink">Le suivi ne peut pas être chargé.</p>
              <p className="mt-1 text-[13px] text-ink-3">Vérifiez la connexion puis réessayez.</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="state-panel">
              <span className="mx-auto grid size-11 place-items-center rounded-[0.85rem] bg-primary-soft text-primary">
                <Wallet className="h-4 w-4" strokeWidth={2.35} />
              </span>
              <p className="mt-4 font-display text-2xl text-ink">Aucun paiement pour le moment.</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-3">
                Une commande pharmacie ou un abonnement payé localement apparaîtra ici.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link to="/dashboard/pharmacy" className="btn-pill h-11 bg-primary px-4 text-[13px] font-semibold text-white">
                  Commander en pharmacie
                </Link>
                <Link to="/tarifs" className="btn-pill h-11 border border-hairline bg-surface-0 px-4 text-[13px] font-semibold text-ink">
                  Voir les tarifs
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-hairline border-y border-hairline">
              {payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

const SummaryTile = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="rounded-[1rem] border border-hairline bg-surface-0 p-4 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-primary-soft text-primary">
        <Icon className="h-4 w-4" strokeWidth={2.35} />
      </span>
      <span className="font-display text-3xl tabular-nums text-ink">{value}</span>
    </div>
    <p className="mt-4 text-[12px] font-mono uppercase tracking-[0.14em] text-ink-4">{label}</p>
    <p className="mt-1 text-[12.5px] text-ink-3">{detail}</p>
  </div>
);

const PaymentRow = ({ payment }: { payment: LocalPaymentRequest }) => {
  const tone = statusTone[payment.status];
  const Icon = tone.icon;
  const extraLabel =
    payment.channel === "subscription"
      ? planLabel(payment.plan_id)
      : payment.order_id
        ? "Commande pharmacie"
        : null;

  return (
    <article className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-[0.8rem]", tone.className)}>
            <Icon className="h-4 w-4" strokeWidth={2.35} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="font-display text-xl leading-tight text-ink">
                {getPaymentChannelLabel(payment.channel)}
              </h2>
              <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-4">
                {payment.reference}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              {getPaymentProviderLabel(payment.provider)} sur {maskPhone(payment.payer_phone)}
              {extraLabel ? ` · ${extraLabel}` : ""}
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">{tone.detail}</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
        <div>
          <p className="font-display text-2xl tabular-nums text-ink">{formatFCFA(payment.amount)}</p>
          <p className="mt-1 text-[11px] text-ink-4">{paymentDate(payment.created_at)}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", tone.className)}>
          <span className={cn("size-1.5 rounded-full", tone.dot)} />
          {getPaymentStatusLabel(payment.status)}
        </span>
      </div>
    </article>
  );
};

const PaymentSkeleton = () => (
  <div className="divide-y divide-hairline border-y border-hairline">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex items-center gap-3 py-4">
        <div className="size-10 animate-pulse rounded-[0.8rem] bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-surface-1" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-full bg-surface-2" />
      </div>
    ))}
  </div>
);

export default Payments;
