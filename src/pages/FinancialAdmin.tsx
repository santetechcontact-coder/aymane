import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BadgeCheck,
  Banknote,
  Check,
  Clock3,
  ExternalLink,
  FileCheck2,
  ReceiptText,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AdminView = "payments" | "withdrawals" | "kyc" | "audit";

type LocalPayment = {
  id: string;
  user_id: string;
  channel: string;
  provider: string;
  payer_phone: string;
  amount: number;
  status: string;
  reference: string;
  created_at: string;
};

type Withdrawal = {
  id: string;
  wallet_id: string;
  gross_amount_fcfa: number;
  commission_amount_fcfa: number;
  net_amount_fcfa: number;
  status: string;
  review_reason: string | null;
  requested_at: string;
  wallets: { provider_id: string } | null;
  payout_accounts: {
    method: string;
    account_name: string;
    account_reference: string;
  } | null;
};

type KycDocument = {
  id: string;
  provider_id: string;
  document_type: string;
  file_path: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; phone: string | null; city: string | null };

const money = (value: number) => new Intl.NumberFormat("fr-SN").format(value);
const formatDate = (value: string) =>
  new Date(value).toLocaleString("fr-SN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const statusLabels: Record<string, string> = {
  under_review: "À étudier",
  approved: "Validé",
  rejected: "Refusé",
  paid: "Payé",
  pending: "À étudier",
  reviewing: "En étude",
  awaiting_provider: "En confirmation",
  failed: "Échec",
  cancelled: "Annulé",
};

const FinancialAdmin = () => {
  const { roles } = useAuth();
  const db: SupabaseClient = supabase;
  const isAdmin = roles.includes("admin");
  const isReviewer = roles.includes("application_reviewer");
  const [view, setView] = useState<AdminView>(isAdmin ? "withdrawals" : "kyc");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(null);

  const load = async () => {
    if (!isAdmin && !isReviewer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const withdrawalPromise = isAdmin
      ? db.from("withdrawals").select("*, wallets(provider_id), payout_accounts(method, account_name, account_reference)").order("requested_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] });
    const auditPromise = isAdmin
      ? db.from("financial_audits").select("*").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] });
    const paymentPromise = isAdmin
      ? db.from("local_payment_requests").select("id, user_id, channel, provider, payer_phone, amount, status, reference, created_at").order("created_at", { ascending: false }).limit(150)
      : Promise.resolve({ data: [] });
    const [paymentResult, withdrawalResult, kycResult, auditResult] = await Promise.all([
      paymentPromise,
      withdrawalPromise,
      db.from("kyc_documents").select("*").order("created_at", { ascending: false }).limit(200),
      auditPromise,
    ]);
    const nextPayments = (paymentResult.data ?? []) as LocalPayment[];
    const nextWithdrawals = (withdrawalResult.data ?? []) as Withdrawal[];
    const nextKyc = (kycResult.data ?? []) as KycDocument[];
    setPayments(nextPayments);
    setWithdrawals(nextWithdrawals);
    setKycDocuments(nextKyc);
    setAudits((auditResult.data ?? []) as AuditRow[]);

    const ids = Array.from(new Set([
      ...nextWithdrawals.map((item) => item.wallets?.provider_id).filter(Boolean),
      ...nextKyc.map((item) => item.provider_id),
      ...nextPayments.map((item) => item.user_id),
    ])) as string[];
    if (ids.length) {
      const { data } = await db.from("profiles").select("id, full_name, phone, city").in("id", ids);
      setProfiles(Object.fromEntries(((data ?? []) as Profile[]).map((profile) => [profile.id, profile])));
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Contrôle financier - AYMANE";
    void load();
  }, [isAdmin, isReviewer]);

  const filteredWithdrawals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return withdrawals;
    return withdrawals.filter((item) => {
      const profile = item.wallets?.provider_id ? profiles[item.wallets.provider_id] : null;
      return `${profile?.full_name ?? ""} ${item.payout_accounts?.account_name ?? ""} ${item.status}`.toLowerCase().includes(query);
    });
  }, [withdrawals, profiles, search]);

  const kycGroups = useMemo(() => {
    const groups = new Map<string, KycDocument[]>();
    for (const document of kycDocuments) {
      groups.set(document.provider_id, [...(groups.get(document.provider_id) ?? []), document]);
    }
    return Array.from(groups.entries()).filter(([providerId]) => {
      const query = search.trim().toLowerCase();
      return !query || `${profiles[providerId]?.full_name ?? ""} ${profiles[providerId]?.phone ?? ""}`.toLowerCase().includes(query);
    });
  }, [kycDocuments, profiles, search]);

  const pendingGross = withdrawals.filter((item) => item.status === "under_review").reduce((sum, item) => sum + item.gross_amount_fcfa, 0);
  const totalCommission = withdrawals.filter((item) => ["approved", "paid"].includes(item.status)).reduce((sum, item) => sum + item.commission_amount_fcfa, 0);

  const reviewWithdrawal = async (withdrawalId: string, decision: "approved" | "rejected") => {
    if (reason.trim().length < 3) {
      toast({ title: "Motif requis", description: "Ajoutez un avis clair avant de décider.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.rpc("review_wallet_withdrawal", {
      _withdrawal_id: withdrawalId,
      _decision: decision,
      _reason: reason.trim(),
    });
    setWorking(false);
    if (error) {
      toast({ title: "Décision non enregistrée", description: "Actualisez le dossier puis réessayez.", variant: "destructive" });
      return;
    }
    setReason("");
    setSelectedWithdrawal(null);
    toast({ title: decision === "approved" ? "Retrait validé" : "Retrait refusé" });
    await load();
  };

  const reviewPayment = async (paymentId: string, status: "awaiting_provider" | "paid" | "failed" | "cancelled") => {
    if (reason.trim().length < 3) {
      toast({ title: "Motif requis", description: "Ajoutez une note de rapprochement claire.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.rpc("review_local_payment_request", {
      _request_id: paymentId,
      _status: status,
      _reason: reason.trim(),
    });
    setWorking(false);
    if (error) {
      toast({ title: "Paiement non mis à jour", description: "Actualisez la demande puis réessayez.", variant: "destructive" });
      return;
    }
    setReason("");
    setSelectedWithdrawal(null);
    toast({ title: status === "paid" ? "Paiement confirmé" : "Suivi du paiement mis à jour" });
    await load();
  };

  const markPaid = async (withdrawalId: string) => {
    if (paymentReference.trim().length < 4) {
      toast({ title: "Référence requise", description: "Indiquez la référence de l'envoi effectué.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.rpc("mark_wallet_withdrawal_paid", {
      _withdrawal_id: withdrawalId,
      _payment_reference: paymentReference.trim(),
    });
    setWorking(false);
    if (error) {
      toast({ title: "Paiement non confirmé", description: "Vérifiez que le retrait est bien validé.", variant: "destructive" });
      return;
    }
    setPaymentReference("");
    setSelectedWithdrawal(null);
    toast({ title: "Paiement confirmé", description: "Le prestataire a été informé." });
    await load();
  };

  const openKycDocument = async (document: KycDocument) => {
    const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(document.file_path, 120);
    if (error || !data?.signedUrl) {
      toast({ title: "Pièce indisponible", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const reviewKyc = async (providerId: string, status: "reviewing" | "approved" | "rejected") => {
    if (reason.trim().length < 3) {
      toast({ title: "Avis requis", description: "Expliquez votre décision au prestataire.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.rpc("review_provider_kyc", {
      _provider_id: providerId,
      _status: status,
      _reason: reason.trim(),
    });
    setWorking(false);
    if (error) {
      toast({ title: "Avis non enregistré", description: "Actualisez le dossier puis réessayez.", variant: "destructive" });
      return;
    }
    setReason("");
    setSelectedProvider(null);
    toast({ title: status === "approved" ? "Identité professionnelle validée" : status === "rejected" ? "Corrections demandées" : "Dossier pris en charge" });
    await load();
  };

  if (!loading && !isAdmin && !isReviewer) {
    return (
      <DashboardLayout title="Contrôle" back>
        <section className="mx-auto max-w-md rounded-[1rem] border border-hairline bg-surface-0 p-6 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-ink-3" />
          <h1 className="mt-4 font-display text-2xl text-ink">Accès réservé.</h1>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={isAdmin ? "Finance" : "Vérifications"} back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">{isAdmin ? "Contrôle financier" : "Étude des pièces"}</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">{isAdmin ? "Décider avec une trace claire." : "Vérifier avec rigueur et équité."}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          {isAdmin ? "Chaque validation, refus et paiement reste motivé et consultable." : "Les pièces professionnelles sont étudiées séparément des opérations financières."}
        </p>
      </header>

      {isAdmin && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="À étudier" value={String(withdrawals.filter((item) => item.status === "under_review").length)} />
          <Kpi label="Montant en attente" value={`${money(pendingGross)} F`} />
          <Kpi label="Commissions validées" value={`${money(totalCommission)} F`} className="col-span-2 sm:col-span-1" />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit gap-1 rounded-[0.8rem] bg-surface-1 p-1">
          {isAdmin && <Tab active={view === "payments"} onClick={() => setView("payments")} icon={ReceiptText}>Paiements</Tab>}
          {isAdmin && <Tab active={view === "withdrawals"} onClick={() => setView("withdrawals")} icon={Banknote}>Retraits</Tab>}
          <Tab active={view === "kyc"} onClick={() => setView("kyc")} icon={FileCheck2}>KYC</Tab>
          {isAdmin && <Tab active={view === "audit"} onClick={() => setView("audit")} icon={ReceiptText}>Journal</Tab>}
        </div>
        {view !== "audit" && (
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un prestataire" />
          </label>
        )}
      </div>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Chargement des dossiers…</p></div>
      ) : (
        <>
          {view === "payments" && isAdmin && (
            <section className="space-y-3">
              {payments.length === 0 ? <Empty text="Aucune demande de paiement." /> : payments.map((payment) => {
                const profile = profiles[payment.user_id];
                const isSelected = selectedWithdrawal === payment.id;
                const closed = ["paid", "cancelled"].includes(payment.status);
                return (
                  <article key={payment.id} className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-secondary-soft text-secondary"><ReceiptText className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13.5px] font-semibold text-ink">{profile?.full_name || "Client AYMANE"}</p>
                            <p className="mt-0.5 text-[10.5px] text-ink-3">{payment.channel.replaceAll("_", " ")} · {payment.provider.replaceAll("_", " ")}</p>
                          </div>
                          <Status status={payment.status} />
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-mono uppercase text-ink-4">{payment.reference}</p>
                            <p className="mt-1 text-[10.5px] text-ink-3">{payment.payer_phone} · {formatDate(payment.created_at)}</p>
                          </div>
                          <p className="shrink-0 text-[15px] font-bold text-primary">{money(payment.amount)} F</p>
                        </div>
                      </div>
                    </div>
                    {!closed && (
                      <button type="button" onClick={() => setSelectedWithdrawal(isSelected ? null : payment.id)} className="mt-4 flex h-10 w-full items-center justify-center rounded-full border border-hairline text-[12px] font-semibold text-ink-2">Rapprocher le paiement</button>
                    )}
                    {isSelected && !closed && (
                      <div className="mt-4 rounded-[0.85rem] bg-surface-1 p-3">
                        <label><span className="mb-1.5 block text-[10px] font-mono uppercase text-ink-3">Note de contrôle</span><textarea className="min-h-20 w-full rounded-[0.7rem] border border-hairline bg-surface-0 px-3 py-2.5 text-[13px] outline-none" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Référence opérateur, vérification ou motif d'échec" /></label>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <button type="button" disabled={working} onClick={() => void reviewPayment(payment.id, "awaiting_provider")} className="h-10 rounded-full border border-hairline text-[10.5px] font-semibold text-ink-2">En cours</button>
                          <button type="button" disabled={working} onClick={() => void reviewPayment(payment.id, "failed")} className="h-10 rounded-full border border-accent/25 text-[10.5px] font-semibold text-accent">Échec</button>
                          <button type="button" disabled={working} onClick={() => void reviewPayment(payment.id, "cancelled")} className="h-10 rounded-full border border-hairline text-[10.5px] font-semibold text-ink-3">Annuler</button>
                          <button type="button" disabled={working} onClick={() => void reviewPayment(payment.id, "paid")} className="h-10 rounded-full bg-emerald-700 text-[10.5px] font-semibold text-white">Confirmer payé</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {view === "withdrawals" && isAdmin && (
            <section className="space-y-3">
              {filteredWithdrawals.length === 0 ? <Empty text="Aucune demande de retrait." /> : filteredWithdrawals.map((withdrawal) => {
                const providerId = withdrawal.wallets?.provider_id;
                const profile = providerId ? profiles[providerId] : null;
                const isSelected = selectedWithdrawal === withdrawal.id;
                return (
                  <article key={withdrawal.id} className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary"><Wallet className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[14px] font-semibold text-ink">{profile?.full_name || "Prestataire AYMANE"}</p>
                            <p className="mt-0.5 text-[11px] text-ink-3">{withdrawal.payout_accounts?.method.replace("_", " ")} · ••••{withdrawal.payout_accounts?.account_reference.slice(-4)}</p>
                          </div>
                          <Status status={withdrawal.status} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <Amount label="Demandé" value={withdrawal.gross_amount_fcfa} />
                          <Amount label="Commission" value={withdrawal.commission_amount_fcfa} />
                          <Amount label="À envoyer" value={withdrawal.net_amount_fcfa} strong />
                        </div>
                        <p className="mt-3 flex items-center gap-1 text-[10.5px] text-ink-4"><Clock3 className="h-3 w-3" /> {formatDate(withdrawal.requested_at)}</p>
                      </div>
                    </div>

                    {withdrawal.status === "under_review" && (
                      <button type="button" onClick={() => setSelectedWithdrawal(isSelected ? null : withdrawal.id)} className="mt-4 flex h-10 w-full items-center justify-center rounded-full border border-hairline text-[12px] font-semibold text-ink-2">
                        Étudier la demande
                      </button>
                    )}
                    {withdrawal.status === "approved" && (
                      <button type="button" onClick={() => setSelectedWithdrawal(isSelected ? null : withdrawal.id)} className="mt-4 flex h-10 w-full items-center justify-center rounded-full bg-emerald-700 text-[12px] font-semibold text-white">
                        Confirmer le paiement effectué
                      </button>
                    )}

                    {isSelected && withdrawal.status === "under_review" && (
                      <div className="mt-4 rounded-[0.85rem] bg-surface-1 p-3">
                        <label><span className="mb-1.5 block text-[10px] font-mono uppercase text-ink-3">Avis motivé</span><textarea className="min-h-20 w-full rounded-[0.7rem] border border-hairline bg-surface-0 px-3 py-2.5 text-[13px] outline-none" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Contrôles effectués et motif de la décision" /></label>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" disabled={working} onClick={() => void reviewWithdrawal(withdrawal.id, "rejected")} className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-accent/25 text-[11.5px] font-semibold text-accent"><X className="h-3.5 w-3.5" /> Refuser</button>
                          <button type="button" disabled={working} onClick={() => void reviewWithdrawal(withdrawal.id, "approved")} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-ink text-[11.5px] font-semibold text-white"><Check className="h-3.5 w-3.5" /> Valider</button>
                        </div>
                      </div>
                    )}

                    {isSelected && withdrawal.status === "approved" && (
                      <div className="mt-4 rounded-[0.85rem] bg-surface-1 p-3">
                        <label><span className="mb-1.5 block text-[10px] font-mono uppercase text-ink-3">Référence de paiement</span><input className={inputClass} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Référence Wave, OM ou bancaire" /></label>
                        <button type="button" disabled={working} onClick={() => void markPaid(withdrawal.id)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 text-[11.5px] font-semibold text-white"><Check className="h-3.5 w-3.5" /> Confirmer l'envoi</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {view === "kyc" && (
            <section className="space-y-3">
              {kycGroups.length === 0 ? <Empty text="Aucun dossier KYC à étudier." /> : kycGroups.map(([providerId, documents]) => {
                const profile = profiles[providerId];
                const isSelected = selectedProvider === providerId;
                const overallStatus = documents.every((item) => item.status === "approved") ? "approved" : documents.some((item) => item.status === "rejected") ? "rejected" : "pending";
                return (
                  <article key={providerId} className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-secondary-soft text-secondary"><BadgeCheck className="h-4 w-4" /></span>
                        <div>
                          <p className="text-[14px] font-semibold text-ink">{profile?.full_name || "Prestataire AYMANE"}</p>
                          <p className="mt-0.5 text-[11px] text-ink-3">{profile?.phone || "Téléphone non indiqué"} · {profile?.city || "Sénégal"}</p>
                        </div>
                      </div>
                      <Status status={overallStatus} />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {documents.map((document) => (
                        <button key={document.id} type="button" onClick={() => void openKycDocument(document)} className="flex items-center gap-3 rounded-[0.75rem] bg-surface-1 p-3 text-left">
                          <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink-2">{document.document_type.replaceAll("_", " ")}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-ink-4" />
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setSelectedProvider(isSelected ? null : providerId)} className="mt-4 flex h-10 w-full items-center justify-center rounded-full border border-hairline text-[12px] font-semibold text-ink-2">Donner un avis</button>
                    {isSelected && (
                      <div className="mt-4 rounded-[0.85rem] bg-surface-1 p-3">
                        <label><span className="mb-1.5 block text-[10px] font-mono uppercase text-ink-3">Avis communiqué au prestataire</span><textarea className="min-h-20 w-full rounded-[0.7rem] border border-hairline bg-surface-0 px-3 py-2.5 text-[13px] outline-none" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <button type="button" disabled={working} onClick={() => void reviewKyc(providerId, "rejected")} className="h-10 rounded-full border border-accent/25 text-[11px] font-semibold text-accent">À corriger</button>
                          <button type="button" disabled={working} onClick={() => void reviewKyc(providerId, "reviewing")} className="h-10 rounded-full border border-hairline text-[11px] font-semibold text-ink-2">En étude</button>
                          <button type="button" disabled={working} onClick={() => void reviewKyc(providerId, "approved")} className="h-10 rounded-full bg-ink text-[11px] font-semibold text-white">Valider</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {view === "audit" && isAdmin && (
            <section className="overflow-hidden rounded-[1rem] border border-hairline bg-surface-0">
              {audits.length === 0 ? <Empty text="Aucune opération auditée." /> : audits.map((audit) => (
                <article key={audit.id} className="flex gap-3 border-b border-hairline p-4 last:border-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-1 text-ink-3"><ReceiptText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">{audit.action.replaceAll("_", " ")}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-4">{audit.resource_type} · {formatDate(audit.created_at)}</p>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

const Kpi = ({ label, value, className }: { label: string; value: string; className?: string }) => <div className={cn("rounded-[0.9rem] border border-hairline bg-surface-0 p-4", className)}><p className="text-[10px] font-mono uppercase text-ink-3">{label}</p><p className="mt-2 font-display text-2xl text-ink">{value}</p></div>;
const Tab = ({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Banknote; children: React.ReactNode }) => <button type="button" onClick={onClick} className={cn("flex h-9 items-center gap-1.5 rounded-[0.65rem] px-3 text-[11.5px] font-semibold", active ? "bg-ink text-white" : "text-ink-3")}><Icon className="h-3.5 w-3.5" />{children}</button>;
const Amount = ({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) => <div className="min-w-0"><p className="text-[9.5px] uppercase text-ink-4">{label}</p><p className={cn("mt-1 truncate text-[11.5px]", strong ? "font-bold text-primary" : "font-semibold text-ink-2")}>{money(value)} F</p></div>;
const Status = ({ status }: { status: string }) => <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold", status === "approved" || status === "paid" ? "bg-emerald-100 text-emerald-700" : status === "rejected" ? "bg-accent-soft text-accent" : "bg-amber-100 text-amber-700")}>{statusLabels[status] ?? status}</span>;
const Empty = ({ text }: { text: string }) => <div className="rounded-[0.8rem] border border-dashed border-hairline bg-surface-1 px-4 py-8 text-center"><p className="text-[12.5px] text-ink-3">{text}</p></div>;

export default FinancialAdmin;
