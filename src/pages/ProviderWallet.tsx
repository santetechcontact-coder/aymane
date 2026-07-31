import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  BriefcaseMedical,
  Check,
  Clock3,
  FileCheck2,
  Landmark,
  Plus,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Upload,
  Wallet,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { PROVIDER_ROLES, STRUCTURE_ROLES, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type WalletView = "overview" | "services" | "withdraw" | "verification";

type WalletSnapshot = {
  wallet_id: string | null;
  provider_id: string;
  currency: string;
  kyc_status: "pending" | "reviewing" | "approved" | "rejected";
  frozen: boolean;
  frozen_reason?: string | null;
  total_balance: number;
  available_balance: number;
  reserved_balance: number;
};

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  delivery_mode: string;
  duration_minutes: number | null;
  price_fcfa: number;
  active: boolean;
  created_at: string;
};

type TransactionRow = {
  id: string;
  entry_type: string;
  amount_fcfa: number;
  reference: string;
  description: string;
  created_at: string;
};

type PayoutAccount = {
  id: string;
  method: "wave" | "orange_money" | "free_money" | "bank";
  account_name: string;
  account_reference: string;
  bank_name: string | null;
  is_default: boolean;
};

type WithdrawalRow = {
  id: string;
  gross_amount_fcfa: number;
  commission_amount_fcfa: number;
  net_amount_fcfa: number;
  status: string;
  review_reason: string | null;
  requested_at: string;
};

type KycDocument = {
  id: string;
  document_type: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

const views: { id: WalletView; label: string; icon: typeof Wallet }[] = [
  { id: "overview", label: "Solde", icon: Wallet },
  { id: "services", label: "Services", icon: BriefcaseMedical },
  { id: "withdraw", label: "Retraits", icon: ArrowDownToLine },
  { id: "verification", label: "Vérification", icon: ShieldCheck },
];

const statusLabels: Record<string, string> = {
  pending: "À compléter",
  reviewing: "En vérification",
  approved: "Validé",
  rejected: "À corriger",
  under_review: "En étude",
  paid: "Payé",
  cancelled: "Annulé",
};

const serviceCategories: Record<string, string> = {
  consultation: "Consultation",
  teleconsultation: "Téléconsultation",
  home_care: "Soins à domicile",
  diagnostic: "Diagnostic",
  pharmacy_delivery: "Livraison pharmacie",
  ambulance: "Ambulance",
  maternal_care: "Suivi maternité",
  vaccination: "Vaccination",
  other: "Autre",
};

const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const money = (value: number) => new Intl.NumberFormat("fr-SN").format(value);
const dateTime = (value: string) =>
  new Date(value).toLocaleString("fr-SN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const ProviderWallet = () => {
  const { user, roles } = useAuth();
  const db: SupabaseClient = supabase;
  const [view, setView] = useState<WalletView>("overview");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    category: "consultation",
    mode: "onsite",
    duration: "30",
    price: "",
  });
  const [accountForm, setAccountForm] = useState({
    method: "wave",
    name: "",
    reference: "",
    bank: "",
  });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", accountId: "" });
  const [kycForm, setKycForm] = useState({ type: "identity", file: null as File | null });

  const isProvider = roles.some((role) => PROVIDER_ROLES.includes(role) || STRUCTURE_ROLES.includes(role));

  const load = async () => {
    if (!user || !isProvider) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await db.rpc("ensure_my_wallet");
    const [snapshotResult, serviceResult, accountResult, withdrawalResult, kycResult] = await Promise.all([
      db.rpc("get_wallet_snapshot", { _provider_id: null }),
      db.from("provider_services").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
      db.from("payout_accounts").select("*").eq("provider_id", user.id).order("is_default", { ascending: false }),
      db.from("withdrawals").select("*").order("requested_at", { ascending: false }).limit(30),
      db.from("kyc_documents").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
    ]);
    const nextSnapshot = (snapshotResult.data ?? null) as WalletSnapshot | null;
    setSnapshot(nextSnapshot);
    setServices((serviceResult.data ?? []) as ServiceRow[]);
    setAccounts((accountResult.data ?? []) as PayoutAccount[]);
    setWithdrawals((withdrawalResult.data ?? []) as WithdrawalRow[]);
    setKycDocuments((kycResult.data ?? []) as KycDocument[]);
    if (nextSnapshot?.wallet_id) {
      const { data } = await db.from("wallet_transactions").select("*").eq("wallet_id", nextSnapshot.wallet_id).order("created_at", { ascending: false }).limit(50);
      setTransactions((data ?? []) as TransactionRow[]);
    }
    if (!withdrawForm.accountId && accountResult.data?.[0]?.id) {
      setWithdrawForm((current) => ({ ...current, accountId: accountResult.data[0].id }));
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Mon activité - AYMANE";
    void load();
  }, [user, isProvider]);

  const withdrawalPreview = useMemo(() => {
    const gross = Math.max(0, Number(withdrawForm.amount) || 0);
    const commission = Math.round(gross * 0.2);
    return { gross, commission, net: Math.max(0, gross - commission) };
  }, [withdrawForm.amount]);

  const addService = async () => {
    const price = Number(serviceForm.price);
    const duration = Number(serviceForm.duration);
    if (!user || serviceForm.title.trim().length < 3 || price < 100 || !Number.isFinite(price)) {
      toast({ title: "Service incomplet", description: "Indiquez un titre et un tarif valide.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("provider_services").insert({
      provider_id: user.id,
      title: serviceForm.title.trim(),
      description: serviceForm.description.trim() || null,
      category: serviceForm.category,
      delivery_mode: serviceForm.mode,
      duration_minutes: Number.isFinite(duration) && duration >= 5 ? duration : null,
      price_fcfa: Math.round(price),
      active: true,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Service non publié", description: "Vérifiez le tarif et la durée.", variant: "destructive" });
      return;
    }
    setServiceForm({ title: "", description: "", category: "consultation", mode: "onsite", duration: "30", price: "" });
    toast({ title: "Service ajouté", description: "Il est maintenant visible dans votre catalogue." });
    await load();
  };

  const toggleService = async (service: ServiceRow) => {
    const { error } = await db.from("provider_services").update({ active: !service.active }).eq("id", service.id);
    if (error) {
      toast({ title: "Modification non enregistrée", variant: "destructive" });
      return;
    }
    await load();
  };

  const addPayoutAccount = async () => {
    if (!user || accountForm.name.trim().length < 2 || accountForm.reference.trim().length < 6) {
      toast({ title: "Compte incomplet", description: "Indiquez le titulaire et le numéro de réception.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("payout_accounts").insert({
      provider_id: user.id,
      method: accountForm.method,
      account_name: accountForm.name.trim(),
      account_reference: accountForm.reference.trim(),
      bank_name: accountForm.method === "bank" ? accountForm.bank.trim() || null : null,
      is_default: accounts.length === 0,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Compte non ajouté", description: "Vérifiez les informations saisies.", variant: "destructive" });
      return;
    }
    setAccountForm({ method: "wave", name: "", reference: "", bank: "" });
    toast({ title: "Compte de réception ajouté" });
    await load();
  };

  const requestWithdrawal = async () => {
    if (!withdrawForm.accountId || withdrawalPreview.gross < 1000) {
      toast({ title: "Retrait incomplet", description: "Choisissez un compte et un montant d'au moins 1 000 FCFA.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.rpc("request_wallet_withdrawal", {
      _amount_fcfa: withdrawalPreview.gross,
      _payout_account_id: withdrawForm.accountId,
    });
    setWorking(false);
    if (error) {
      const needsMfa = error.message?.toLowerCase().includes("multi-factor");
      const needsKyc = error.message?.toLowerCase().includes("kyc");
      toast({
        title: needsMfa ? "Sécurisez d'abord ce retrait" : needsKyc ? "Vérification requise" : "Retrait non envoyé",
        description: needsMfa
          ? "Activez la double vérification dans Sécurité, puis recommencez."
          : needsKyc
            ? "Votre identité professionnelle doit être validée avant un retrait."
            : "Vérifiez votre solde disponible et le compte choisi.",
        variant: "destructive",
      });
      return;
    }
    setWithdrawForm((current) => ({ ...current, amount: "" }));
    toast({ title: "Demande envoyée", description: "Elle apparaît maintenant dans votre suivi." });
    await load();
  };

  const chooseKycFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier non accepté", description: "Choisissez un PDF, JPG ou PNG de 10 Mo maximum.", variant: "destructive" });
      event.target.value = "";
      return;
    }
    setKycForm((current) => ({ ...current, file }));
  };

  const uploadKyc = async () => {
    if (!user || !kycForm.file) {
      toast({ title: "Pièce manquante", description: "Choisissez le document à envoyer.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const extension = kycForm.file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${user.id}/${kycForm.type}-${crypto.randomUUID()}.${extension}`;
    const uploadResult = await supabase.storage.from("kyc-documents").upload(path, kycForm.file, {
      contentType: kycForm.file.type,
      upsert: false,
    });
    if (uploadResult.error) {
      setWorking(false);
      toast({ title: "Envoi interrompu", description: "La pièce n'a pas été ajoutée.", variant: "destructive" });
      return;
    }
    const { error } = await db.from("kyc_documents").insert({
      provider_id: user.id,
      document_type: kycForm.type,
      file_path: path,
    });
    if (error) {
      await supabase.storage.from("kyc-documents").remove([path]);
      setWorking(false);
      toast({ title: "Pièce non enregistrée", variant: "destructive" });
      return;
    }
    setWorking(false);
    setKycForm({ type: "identity", file: null });
    toast({ title: "Pièce bien reçue", description: "L'équipe de vérification peut maintenant l'étudier." });
    await load();
  };

  if (!loading && !isProvider) {
    return (
      <DashboardLayout title="Activité" back>
        <section className="mx-auto max-w-lg rounded-[1rem] border border-hairline bg-surface-0 p-6 text-center">
          <Wallet className="mx-auto h-7 w-7 text-ink-3" />
          <h1 className="mt-4 font-display text-2xl text-ink">Espace réservé aux prestataires.</h1>
          <p className="mt-2 text-[13px] text-ink-3">Cet espace devient disponible après la validation de votre compte professionnel.</p>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mon activité" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Services et revenus</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Votre activité, lisible au premier regard.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Publiez vos services, suivez les paiements reçus et préparez vos retraits en toute sécurité.
        </p>
      </header>

      <nav className="mb-6 overflow-x-auto no-scrollbar" aria-label="Sections de l'activité">
        <div className="flex min-w-max gap-1 rounded-[0.9rem] bg-surface-1 p-1">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => setView(item.id)} className={cn("flex h-10 items-center gap-1.5 rounded-[0.7rem] px-3 text-[12px] font-semibold transition", view === item.id ? "bg-ink text-white" : "text-ink-3")}>
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Préparation de votre activité…</p></div>
      ) : (
        <>
          {view === "overview" && snapshot && (
            <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="space-y-5">
                <section className="rounded-[1rem] bg-ink p-5 text-white">
                  <div className="flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-[0.8rem] bg-white/10"><Wallet className="h-5 w-5" /></span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", snapshot.kyc_status === "approved" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/65")}>
                      {statusLabels[snapshot.kyc_status]}
                    </span>
                  </div>
                  <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.12em] text-white/45">Disponible</p>
                  <p className="mt-1 font-display text-4xl sm:text-5xl">{money(snapshot.available_balance)} <span className="text-lg text-white/50">FCFA</span></p>
                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                    <Metric label="Total reçu" value={`${money(snapshot.total_balance)} F`} />
                    <Metric label="En attente" value={`${money(snapshot.reserved_balance)} F`} />
                  </div>
                </section>
                <button type="button" onClick={() => setView("withdraw")} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-[13px] font-semibold text-white">
                  <ArrowDownToLine className="h-4 w-4" /> Demander un retrait
                </button>
              </div>
              <Panel title="Dernières opérations" description="Chaque paiement et retrait reste traçable.">
                {transactions.length === 0 ? <Empty text="Aucune opération pour le moment." /> : transactions.map((transaction) => (
                  <article key={transaction.id} className="flex items-center gap-3 border-b border-hairline py-3.5 first:pt-0 last:border-0 last:pb-0">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", transaction.amount_fcfa >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-accent-soft text-accent")}>
                      {transaction.amount_fcfa >= 0 ? <Plus className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{transaction.description}</p>
                      <p className="mt-0.5 text-[10.5px] text-ink-4">{dateTime(transaction.created_at)} · {transaction.reference}</p>
                    </div>
                    <p className={cn("shrink-0 text-[13px] font-bold", transaction.amount_fcfa >= 0 ? "text-emerald-700" : "text-accent")}>
                      {transaction.amount_fcfa >= 0 ? "+" : ""}{money(transaction.amount_fcfa)} F
                    </p>
                  </article>
                ))}
              </Panel>
            </div>
          )}

          {view === "services" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Panel title="Publier un service" description="Un intitulé concret et un prix final rassurent le patient.">
                <Field label="Nom du service"><input className={inputClass} value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} placeholder="Ex. Consultation à domicile" /></Field>
                <Field label="Description"><textarea className="min-h-20 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 py-2.5 text-[14px] outline-none focus:border-primary/50" value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Catégorie"><select className={inputClass} value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })}>{Object.entries(serviceCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="Mode"><select className={inputClass} value={serviceForm.mode} onChange={(event) => setServiceForm({ ...serviceForm, mode: event.target.value })}><option value="onsite">Sur place</option><option value="remote">À distance</option><option value="home">À domicile</option></select></Field>
                  <Field label="Durée (minutes)"><input type="number" inputMode="numeric" className={inputClass} value={serviceForm.duration} onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })} /></Field>
                  <Field label="Tarif (FCFA)"><input type="number" inputMode="numeric" className={inputClass} value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} placeholder="15000" /></Field>
                </div>
                <PrimaryButton disabled={working} onClick={() => void addService()} icon={Plus}>Publier le service</PrimaryButton>
              </Panel>
              <Panel title="Catalogue" description={`${services.length} service${services.length > 1 ? "s" : ""} créé${services.length > 1 ? "s" : ""}.`}>
                {services.length === 0 ? <Empty text="Votre premier service apparaîtra ici." /> : services.map((service) => (
                  <article key={service.id} className="border-b border-hairline py-4 first:pt-0 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary"><BriefcaseMedical className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-ink">{service.title}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-3">{serviceCategories[service.category]} · {service.duration_minutes ? `${service.duration_minutes} min` : "Durée variable"}</p>
                        <p className="mt-2 text-[14px] font-bold text-primary">{money(service.price_fcfa)} FCFA</p>
                      </div>
                      <button type="button" onClick={() => void toggleService(service)} className={cn("h-8 shrink-0 rounded-full px-3 text-[10.5px] font-semibold", service.active ? "bg-emerald-100 text-emerald-700" : "bg-surface-1 text-ink-3")}>{service.active ? "Visible" : "Masqué"}</button>
                    </div>
                  </article>
                ))}
              </Panel>
            </div>
          )}

          {view === "withdraw" && (
            <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-5">
                <Panel title="Compte de réception" description="Wave, Orange Money, Free Money ou compte bancaire.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Moyen"><select className={inputClass} value={accountForm.method} onChange={(event) => setAccountForm({ ...accountForm, method: event.target.value })}><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="free_money">Free Money</option><option value="bank">Compte bancaire</option></select></Field>
                    <Field label="Titulaire"><input className={inputClass} value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} /></Field>
                  </div>
                  <Field label={accountForm.method === "bank" ? "IBAN ou numéro de compte" : "Numéro de téléphone"}><input className={inputClass} inputMode={accountForm.method === "bank" ? "text" : "tel"} value={accountForm.reference} onChange={(event) => setAccountForm({ ...accountForm, reference: event.target.value })} /></Field>
                  {accountForm.method === "bank" && <Field label="Banque"><input className={inputClass} value={accountForm.bank} onChange={(event) => setAccountForm({ ...accountForm, bank: event.target.value })} /></Field>}
                  <PrimaryButton disabled={working} onClick={() => void addPayoutAccount()} icon={Plus}>Ajouter ce compte</PrimaryButton>
                </Panel>

                <Panel title="Demander un retrait" description="La commission de 20 % est appliquée uniquement au retrait.">
                  <Field label="Compte à créditer">
                    <select className={inputClass} value={withdrawForm.accountId} onChange={(event) => setWithdrawForm({ ...withdrawForm, accountId: event.target.value })}>
                      <option value="">Choisir un compte</option>
                      {accounts.map((account) => <option key={account.id} value={account.id}>{account.method.replace("_", " ")} · ••••{account.account_reference.slice(-4)}</option>)}
                    </select>
                  </Field>
                  <Field label="Montant à retirer (FCFA)"><input type="number" inputMode="numeric" min="1000" className={inputClass} value={withdrawForm.amount} onChange={(event) => setWithdrawForm({ ...withdrawForm, amount: event.target.value })} /></Field>
                  <div className="rounded-[0.85rem] bg-surface-1 p-3">
                    <Line label="Montant demandé" value={`${money(withdrawalPreview.gross)} F`} />
                    <Line label="Commission (20 %)" value={`-${money(withdrawalPreview.commission)} F`} />
                    <div className="mt-2 border-t border-hairline pt-2"><Line label="Montant reçu" value={`${money(withdrawalPreview.net)} F`} strong /></div>
                  </div>
                  <Link to="/dashboard/security" className="flex items-center gap-2 rounded-[0.75rem] bg-primary-soft px-3 py-2.5 text-[11.5px] font-medium text-primary"><ShieldCheck className="h-3.5 w-3.5" /> La double vérification protège chaque demande.</Link>
                  <PrimaryButton disabled={working || !accounts.length} onClick={() => void requestWithdrawal()} icon={ArrowDownToLine}>Envoyer la demande</PrimaryButton>
                </Panel>
              </div>

              <Panel title="Suivi des retraits" description="Montant reçu après commission et état de chaque demande.">
                {withdrawals.length === 0 ? <Empty text="Aucun retrait demandé." /> : withdrawals.map((withdrawal) => (
                  <article key={withdrawal.id} className="border-b border-hairline py-4 first:pt-0 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-bold text-ink">{money(withdrawal.net_amount_fcfa)} FCFA à recevoir</p>
                        <p className="mt-0.5 text-[11px] text-ink-3">Demandé le {dateTime(withdrawal.requested_at)}</p>
                      </div>
                      <StatusBadge status={withdrawal.status} />
                    </div>
                    <div className="mt-3 flex gap-4 text-[11px] text-ink-3">
                      <span>Brut {money(withdrawal.gross_amount_fcfa)} F</span>
                      <span>Commission {money(withdrawal.commission_amount_fcfa)} F</span>
                    </div>
                    {withdrawal.review_reason && <p className="mt-2 rounded-[0.7rem] bg-surface-1 px-3 py-2 text-[11.5px] text-ink-2">{withdrawal.review_reason}</p>}
                  </article>
                ))}
              </Panel>
            </div>
          )}

          {view === "verification" && snapshot && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <section className={cn("rounded-[1rem] p-5", snapshot.kyc_status === "approved" ? "bg-emerald-700 text-white" : "bg-ink text-white")}>
                <span className="grid size-11 place-items-center rounded-[0.8rem] bg-white/10">{snapshot.kyc_status === "approved" ? <BadgeCheck className="h-5 w-5" /> : <FileCheck2 className="h-5 w-5" />}</span>
                <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.12em] text-white/50">Vérification professionnelle</p>
                <h2 className="mt-1 font-display text-3xl">{statusLabels[snapshot.kyc_status]}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                  {snapshot.kyc_status === "approved" ? "Votre activité est vérifiée. Les retraits sont disponibles avec la double vérification." : "Ajoutez des pièces nettes et lisibles pour faciliter l'étude de votre dossier."}
                </p>
              </section>

              <Panel title="Mes pièces" description="Carte d'identité, autorisation d'exercer ou justificatif d'adresse.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type de pièce"><select className={inputClass} value={kycForm.type} onChange={(event) => setKycForm({ ...kycForm, type: event.target.value })}><option value="identity">Pièce d'identité</option><option value="professional_license">Autorisation professionnelle</option><option value="proof_of_address">Justificatif d'adresse</option><option value="selfie">Photo de vérification</option><option value="other">Autre document</option></select></Field>
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">Fichier</span>
                    <span className="flex h-11 cursor-pointer items-center gap-2 rounded-[0.75rem] border border-dashed border-primary/35 bg-primary-soft px-3 text-[12px] font-semibold text-primary">
                      <Upload className="h-3.5 w-3.5" /><span className="truncate">{kycForm.file?.name || "Choisir"}</span>
                      <input type="file" accept=".pdf,image/jpeg,image/png" className="sr-only" onChange={chooseKycFile} />
                    </span>
                  </label>
                </div>
                <PrimaryButton disabled={working} onClick={() => void uploadKyc()} icon={Upload}>Envoyer la pièce</PrimaryButton>

                <div className="pt-2">
                  {kycDocuments.length === 0 ? <Empty text="Aucune pièce envoyée." /> : kycDocuments.map((document) => (
                    <article key={document.id} className="flex items-center gap-3 border-b border-hairline py-3.5 last:border-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-1 text-ink-3"><ReceiptText className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink">{document.document_type.replaceAll("_", " ")}</p>
                        <p className="text-[10.5px] text-ink-4">{dateTime(document.created_at)}</p>
                      </div>
                      <StatusBadge status={document.status} />
                    </article>
                  ))}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

const Panel = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
    <h2 className="font-display text-xl text-ink">{title}</h2>
    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{description}</p>
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</span>
    {children}
  </label>
);

const PrimaryButton = ({ children, onClick, disabled, icon: Icon }: { children: React.ReactNode; onClick: () => void; disabled: boolean; icon: typeof Plus }) => (
  <button type="button" disabled={disabled} onClick={onClick} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
    <Icon className="h-4 w-4" /> {children}
  </button>
);

const Metric = ({ label, value }: { label: string; value: string }) => <div><p className="text-[9.5px] uppercase text-white/45">{label}</p><p className="mt-1 text-[13px] font-semibold">{value}</p></div>;
const Line = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => <div className="flex items-center justify-between gap-4 py-1"><span className={cn("text-[11.5px]", strong ? "font-semibold text-ink" : "text-ink-3")}>{label}</span><span className={cn("text-[12px]", strong ? "font-bold text-ink" : "font-medium text-ink-2")}>{value}</span></div>;
const Empty = ({ text }: { text: string }) => <div className="rounded-[0.8rem] border border-dashed border-hairline bg-surface-1 px-4 py-6 text-center"><p className="text-[12.5px] text-ink-3">{text}</p></div>;
const StatusBadge = ({ status }: { status: string }) => <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold", status === "approved" || status === "paid" ? "bg-emerald-100 text-emerald-700" : status === "rejected" ? "bg-accent-soft text-accent" : "bg-amber-100 text-amber-700")}>{statusLabels[status] ?? status}</span>;

export default ProviderWallet;
