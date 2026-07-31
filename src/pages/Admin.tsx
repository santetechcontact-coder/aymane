import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Search, FileText, Download, Check, X, Clock, Building2, User as UserIcon, ExternalLink, History,
  LayoutDashboard, Users as UsersIcon, ShieldCheck, Stethoscope, Pill, FlaskConical, Siren,
  Activity, TrendingUp, AlertCircle, Sparkles, UserCog, ChevronRight,
  MessageSquarePlus, RotateCcw,
} from "lucide-react";
import AuditLog from "@/components/AuditLog";
import SignedDocLink from "@/components/SignedDocLink";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

type AppStatus = "pending" | "approved" | "rejected";

interface ProviderApp {
  id: string;
  user_id: string;
  application_type: string;
  status: AppStatus;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string;
  city: string;
  region: string | null;
  professional_address: string | null;
  speciality: string | null;
  order_number: string | null;
  diploma_year: number | null;
  structure_name: string | null;
  structure_type: string | null;
  manager_name: string | null;
  rccm: string | null;
  ministry_approval: string | null;
  profile_photo_url: string | null;
  logo_url: string | null;
  document_cni_url: string | null;
  document_cv_url: string | null;
  document_diploma_url: string | null;
  document_order_url: string | null;
  document_legal_url: string | null;
  document_approval_url: string | null;
  document_rccm_url: string | null;
  rejection_reason: string | null;
  created_at: string;
}

type ReviewOpinion = "favorable" | "unfavorable";

interface ApplicationReview {
  id: string;
  application_id: string;
  reviewer_id: string;
  opinion: ReviewOpinion;
  reason: string;
  created_at: string;
  updated_at: string;
}

interface ComplementRequest {
  id: string;
  application_id: string;
  requested_by: string;
  reason: string;
  missing_items: string[];
  applicant_response: string | null;
  requested_at: string;
  responded_at: string | null;
  resolved_at: string | null;
}

interface ComplementDocument {
  id: string;
  request_id: string;
  label: string;
  file_path: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  doctor: "Médecin", dentist: "Dentiste", nurse: "Infirmier(ère)",
  midwife: "Sage-femme", pharmacist: "Pharmacien", lab_technician: "Technicien labo",
  other_provider: "Autre profession", structure: "Structure",
};

const ROLE_LABELS: Record<string, string> = {
  patient: "Patient", doctor: "Médecin", dentist: "Dentiste", nurse: "Infirmier",
  midwife: "Sage-femme", pharmacist: "Pharmacien", lab_technician: "Technicien labo",
  other_provider: "Autre", structure: "Structure", admin: "Admin",
  application_reviewer: "Agent dossiers",
};

const STATUS_META: Record<AppStatus, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Validé", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejeté", cls: "bg-rose-100 text-rose-700" },
};

type View = "overview" | "requests" | "users" | "audit";

interface PlatformStats {
  users: number;
  pendingApps: number;
  consultations: number;
  emergencies: number;
  pharmacyOrders: number;
  labRequests: number;
  structures: number;
  medications: number;
  alerts: number;
}

interface UserRow {
  id: string;
  full_name: string | null;
  city: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

const Admin = () => {
  const { user, hasRole, loading } = useAuth();
  const isFullAdmin = hasRole("admin");
  const isReviewer = hasRole("application_reviewer");
  const [apps, setApps] = useState<ProviderApp[]>([]);
  const [reviews, setReviews] = useState<ApplicationReview[]>([]);
  const [complements, setComplements] = useState<ComplementRequest[]>([]);
  const [complementDocuments, setComplementDocuments] = useState<ComplementDocument[]>([]);
  const [filter, setFilter] = useState<AppStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProviderApp | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [opinion, setOpinion] = useState<ReviewOpinion>("favorable");
  const [opinionReason, setOpinionReason] = useState("");
  const [complementReason, setComplementReason] = useState("");
  const [complementItems, setComplementItems] = useState("");
  const [roleWorkingId, setRoleWorkingId] = useState<string | null>(null);
  const [view, setView] = useState<View>("overview");

  // Overview / Users data
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [signupsSeries, setSignupsSeries] = useState<{ d: string; n: number }[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");

  useEffect(() => { document.title = "Espace admin — AYMANE"; }, []);

  const load = async () => {
    const [applicationsResult, reviewsResult, complementsResult, complementDocumentsResult] = await Promise.all([
      supabase.from("provider_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("provider_application_reviews").select("*").order("updated_at", { ascending: false }),
      (supabase as any).from("provider_application_complement_requests").select("*").order("requested_at", { ascending: false }),
      (supabase as any).from("provider_application_complement_documents").select("*").order("created_at", { ascending: false }),
    ]);
    if (applicationsResult.error || reviewsResult.error || complementsResult.error || complementDocumentsResult.error) {
      toast({
        title: "Dossiers indisponibles",
        description: "Impossible de charger les demandes pour le moment.",
        variant: "destructive",
      });
      return;
    }
    setApps((applicationsResult.data ?? []) as ProviderApp[]);
    setReviews((reviewsResult.data ?? []) as ApplicationReview[]);
    setComplements((complementsResult.data ?? []) as ComplementRequest[]);
    setComplementDocuments((complementDocumentsResult.data ?? []) as ComplementDocument[]);
  };

  const loadOverview = async () => {
    const [
      profilesC, pendingC, consultsC, emergC, ordersC, labsC, structsC, medsC, alertsC, recentProfiles,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("provider_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("consultations").select("id", { count: "exact", head: true }),
      supabase.from("emergencies").select("id", { count: "exact", head: true }),
      supabase.from("pharmacy_orders").select("id", { count: "exact", head: true }),
      supabase.from("lab_requests").select("id", { count: "exact", head: true }),
      supabase.from("health_structures").select("id", { count: "exact", head: true }),
      supabase.from("medications").select("id", { count: "exact", head: true }),
      supabase.from("health_alerts").select("id", { count: "exact", head: true }).eq("severity", "critical"),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    setStats({
      users: profilesC.count ?? 0,
      pendingApps: pendingC.count ?? 0,
      consultations: consultsC.count ?? 0,
      emergencies: emergC.count ?? 0,
      pharmacyOrders: ordersC.count ?? 0,
      labRequests: labsC.count ?? 0,
      structures: structsC.count ?? 0,
      medications: medsC.count ?? 0,
      alerts: alertsC.count ?? 0,
    });
    // 14-day signup series
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    (recentProfiles.data ?? []).forEach((r: any) => {
      const k = r.created_at?.slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    });
    setSignupsSeries(Array.from(map.entries()).map(([d, n]) => ({
      d: new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), n,
    })));
  };

  const loadUsers = async () => {
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, city, phone, avatar_url, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    setUsers((profs ?? []).map((p: any) => ({ ...p, roles: byUser.get(p.id) ?? ["patient"] })));
  };

  useEffect(() => {
    if (!isFullAdmin && !isReviewer) return;
    void load();
    if (isFullAdmin) {
      void loadOverview();
      void loadUsers();
    } else {
      setView("requests");
    }
  }, [isFullAdmin, isReviewer]);

  // Generate signed urls for the selected application's documents
  useEffect(() => {
    const run = async () => {
      if (!selected) { setDocUrls({}); return; }
      const docs = {
        document_cni_url: selected.document_cni_url,
        document_cv_url: selected.document_cv_url,
        document_diploma_url: selected.document_diploma_url,
        document_order_url: selected.document_order_url,
        document_legal_url: selected.document_legal_url,
        document_approval_url: selected.document_approval_url,
        document_rccm_url: selected.document_rccm_url,
      };
      const entries: [string, string][] = [];
      for (const [k, v] of Object.entries(docs)) {
        if (!v) continue;
        const { data } = await supabase.storage.from("provider-documents").createSignedUrl(v, 3600);
        if (data?.signedUrl) entries.push([k, data.signedUrl]);
      }
      setDocUrls(Object.fromEntries(entries));
    };
    run();
  }, [selected]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        a.full_name.toLowerCase().includes(s) ||
        a.email.toLowerCase().includes(s) ||
        a.city?.toLowerCase().includes(s) ||
        a.speciality?.toLowerCase().includes(s)
      );
    });
  }, [apps, filter, search]);

  const counts = useMemo(() => ({
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    all: apps.length,
  }), [apps]);

  const selectedReviews = useMemo(
    () => reviews.filter((review) => review.application_id === selected?.id),
    [reviews, selected?.id],
  );

  const myReview = useMemo(
    () => selectedReviews.find((review) => review.reviewer_id === user?.id),
    [selectedReviews, user?.id],
  );

  const selectedComplement = useMemo(
    () => complements.find((request) => request.application_id === selected?.id && !request.resolved_at) ?? null,
    [complements, selected?.id],
  );

  useEffect(() => {
    setOpinion(myReview?.opinion ?? "favorable");
    setOpinionReason(myReview?.reason ?? "");
    setRejectReason("");
    setComplementReason("");
    setComplementItems("");
  }, [selected?.id, myReview?.id, myReview?.opinion, myReview?.reason]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (!userSearch) return true;
      const s = userSearch.toLowerCase();
      return (u.full_name ?? "").toLowerCase().includes(s) || (u.city ?? "").toLowerCase().includes(s);
    });
  }, [users, userSearch, roleFilter]);

  const roleDistribution = useMemo(() => {
    const tally = new Map<string, number>();
    users.forEach((u) => u.roles.forEach((r) => tally.set(r, (tally.get(r) ?? 0) + 1)));
    return Array.from(tally.entries()).map(([role, n]) => ({ role, label: ROLE_LABELS[role] ?? role, n }));
  }, [users]);

  const appsByType = useMemo(() => {
    const tally = new Map<string, number>();
    apps.forEach((a) => tally.set(a.application_type, (tally.get(a.application_type) ?? 0) + 1));
    return Array.from(tally.entries()).map(([t, n]) => ({ type: TYPE_LABELS[t] ?? t, n }));
  }, [apps]);

  const submitOpinion = async (id: string) => {
    const reason = opinionReason.trim();
    if (reason.length < 10) {
      toast({
        title: "Motif trop court",
        description: "Expliquez votre avis en au moins 10 caractères.",
        variant: "destructive",
      });
      return;
    }
    setWorking(true);
    const { error } = await supabase.rpc("submit_provider_application_opinion", {
      _application_id: id,
      _opinion: opinion,
      _reason: reason,
    });
    setWorking(false);
    if (error) {
      toast({
        title: "Avis non enregistré",
        description: "Vérifiez que le dossier est toujours en attente puis réessayez.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Avis enregistré", description: "L’administrateur total peut maintenant statuer." });
    await load();
  };

  const requestComplement = async (id: string) => {
    const missingItems = complementItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (complementReason.trim().length < 10 || missingItems.length === 0) {
      toast({
        title: "Demande incomplète",
        description: "Expliquez le besoin et indiquez au moins un élément attendu.",
        variant: "destructive",
      });
      return;
    }
    setWorking(true);
    const { error } = await (supabase as any).rpc("request_provider_application_complement", {
      _application_id: id,
      _reason: complementReason.trim(),
      _missing_items: missingItems,
    });
    setWorking(false);
    if (error) {
      toast({
        title: "Demande non envoyée",
        description: "Un complément est peut-être déjà en cours sur ce dossier.",
        variant: "destructive",
      });
      return;
    }
    setComplementReason("");
    setComplementItems("");
    toast({ title: "Complément demandé", description: "Le prestataire a été informé dans son espace." });
    await load();
  };

  const resolveComplement = async (requestId: string) => {
    setWorking(true);
    const { error } = await (supabase as any).rpc("resolve_provider_application_complement", {
      _request_id: requestId,
    });
    setWorking(false);
    if (error) {
      toast({
        title: "Complément non clôturé",
        description: "La réponse du prestataire doit être reçue avant de reprendre l'étude.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Complément reçu", description: "Vous pouvez maintenant mettre à jour votre avis." });
    await load();
  };

  const toggleReviewer = async (person: UserRow) => {
    const enabled = !person.roles.includes("application_reviewer");
    setRoleWorkingId(person.id);
    const { error } = await supabase.rpc("set_application_reviewer", {
      _user_id: person.id,
      _enabled: enabled,
    });
    setRoleWorkingId(null);
    if (error) {
      toast({
        title: "Rôle non modifié",
        description: "Cette action est réservée à l’administrateur total.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: enabled ? "Agent dossiers ajouté" : "Accès agent retiré",
      description: enabled
        ? "La personne peut désormais étudier les demandes prestataires."
        : "La personne n’a plus accès à la file d’étude.",
    });
    await loadUsers();
  };

  const approve = async (id: string) => {
    if (selectedReviews.length === 0) {
      toast({ title: "Avis requis", description: "Un agent dossiers doit d’abord déposer un avis motivé.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase.rpc("approve_provider_application", { _application_id: id });
    setWorking(false);
    if (error) { toast({ title: "Activation impossible", description: "Le dossier n’a pas pu être validé.", variant: "destructive" }); return; }
    toast({ title: "Compte prestataire activé", description: "Le rôle professionnel a été attribué." });
    setSelected(null);
    load(); loadOverview(); loadUsers();
  };

  const reject = async (id: string) => {
    if (rejectReason.trim().length < 10) {
      toast({ title: "Motif requis", description: "Expliquez la décision en au moins 10 caractères.", variant: "destructive" });
      return;
    }
    if (selectedReviews.length === 0) {
      toast({ title: "Avis requis", description: "Un agent dossiers doit d’abord déposer un avis motivé.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase.rpc("reject_provider_application", { _application_id: id, _reason: rejectReason });
    setWorking(false);
    if (error) { toast({ title: "Décision non enregistrée", description: "Le dossier n’a pas pu être refusé.", variant: "destructive" }); return; }
    toast({ title: "Demande refusée", description: "Le motif restera visible dans l’espace du demandeur." });
    setRejectReason("");
    setSelected(null);
    load(); loadOverview();
  };

  if (loading) return null;
  if (!isFullAdmin && !isReviewer) return <Navigate to="/dashboard" replace />;

  const tabs = isFullAdmin
    ? ([
        { k: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
        { k: "requests", label: "Dossiers", icon: ShieldCheck },
        { k: "users", label: "Comptes", icon: UsersIcon },
        { k: "audit", label: "Historique", icon: History },
      ] as const)
    : ([{ k: "requests", label: "Dossiers à étudier", icon: ShieldCheck }] as const);

  return (
    <DashboardLayout title={isFullAdmin ? "Administration" : "Étude des dossiers"} eyebrow="Coordination AYMANE">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-widest text-primary mb-2">
          {isFullAdmin ? "Pilotage · décision finale" : "Contrôle · avis motivé"}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-display text-ink">
          {isFullAdmin ? "Garder le réseau clair et fiable" : "Étudier chaque demande avec rigueur"}
        </h1>
        <p className="text-[14px] text-ink-3 mt-2 max-w-2xl">
          {isFullAdmin
            ? "Supervisez les comptes, consultez les avis et prenez la décision finale."
            : "Vérifiez l’identité, les diplômes et les pièces du prestataire, puis transmettez un avis favorable ou défavorable."}
        </p>
      </header>

      {/* View tabs */}
      <div className="inline-flex p-1 bg-surface-1 squircle-full mb-5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setView(t.k)}
            className={cn(
              "h-8 px-4 squircle-full text-[12.5px] font-semibold tap transition-colors inline-flex items-center gap-1.5",
              view === t.k ? "bg-surface-0 text-ink shadow-sm" : "text-ink-3"
            )}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.k === "requests" && counts.pending > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-accent text-white rounded-full px-1.5 py-px">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {isFullAdmin && view === "overview" && stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard label="Utilisateurs" value={stats.users} icon={UsersIcon} tone="primary" hint="comptes actifs" />
            <KpiCard label="À valider" value={stats.pendingApps} icon={ShieldCheck} tone="warning" hint="dossiers pros" />
            <KpiCard label="Consultations" value={stats.consultations} icon={Stethoscope} tone="primary" />
            <KpiCard label="Urgences SOS" value={stats.emergencies} icon={Siren} tone="accent" hint="prises en charge" />
            <KpiCard label="Pharmacie" value={stats.pharmacyOrders} icon={Pill} tone="secondary" />
            <KpiCard label="Analyses" value={stats.labRequests} icon={FlaskConical} tone="secondary" />
            <KpiCard label="Structures" value={stats.structures} icon={Building2} tone="primary" hint="vérifiées + en attente" />
            <KpiCard label="Alertes critiques" value={stats.alerts} icon={AlertCircle} tone="accent" hint="télésurveillance" />
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <section className="lg:col-span-2 squircle-xl glass p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3">Arrivées · 14 jours</p>
                  <h3 className="font-display text-[18px] tracking-headline text-ink mt-0.5">Nouvelles personnes inscrites</h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success bg-success-soft px-2.5 py-1 rounded-full">
                  <TrendingUp className="h-3.5 w-3.5" /> progression calme
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupsSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--hairline))" vertical={false} />
                    <XAxis dataKey="d" tick={{ fontSize: 11, fill: "hsl(var(--ink-3))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--ink-3))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--hairline))", fontSize: 12 }} />
                    <Area type="monotone" dataKey="n" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gSign)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="squircle-xl glass p-5">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3">Réseau</p>
              <h3 className="font-display text-[18px] tracking-headline text-ink mt-0.5 mb-3">Profils inscrits</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleDistribution} dataKey="n" nameKey="label" innerRadius={42} outerRadius={70} paddingAngle={3}>
                      {roleDistribution.map((_, i) => (
                        <Cell key={i} fill={["hsl(var(--primary))","hsl(var(--secondary))","hsl(var(--accent))","hsl(var(--warning))","hsl(var(--ink-3))","hsl(var(--primary-deep))"][i % 6]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--hairline))", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {roleDistribution.map((r, i) => (
                  <li key={r.role} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-ink-2">
                      <span className="size-2 rounded-full" style={{ background: ["hsl(var(--primary))","hsl(var(--secondary))","hsl(var(--accent))","hsl(var(--warning))","hsl(var(--ink-3))","hsl(var(--primary-deep))"][i % 6] }} />
                      {r.label}
                    </span>
                    <span className="font-semibold text-ink">{r.n}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <section className="lg:col-span-2 squircle-xl glass p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3">Vérification</p>
                  <h3 className="font-display text-[18px] tracking-headline text-ink mt-0.5">Dossiers par métier</h3>
                </div>
                <button onClick={() => setView("requests")}
                  className="text-[12px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                  Voir tout <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appsByType} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--hairline))" vertical={false} />
                    <XAxis dataKey="type" tick={{ fontSize: 11, fill: "hsl(var(--ink-3))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--ink-3))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--hairline))", fontSize: 12 }} />
                    <Bar dataKey="n" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="squircle-xl glass p-5">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-3">Action rapide</p>
              <div className="space-y-2">
                <QuickAction icon={ShieldCheck} label={`${counts.pending} dossier(s) à vérifier`} onClick={() => setView("requests")} tone="warning" />
                <QuickAction icon={UsersIcon} label="Voir les personnes inscrites" onClick={() => setView("users")} tone="primary" />
                <QuickAction icon={History} label="Voir l'historique" onClick={() => setView("audit")} tone="ink" />
                <QuickAction icon={Activity} label="Service disponible" tone="success" />
              </div>
            </section>
          </div>
        </motion.div>
      )}

      {/* USERS */}
      {isFullAdmin && view === "users" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(["all","patient","doctor","pharmacist","lab_technician","application_reviewer","admin"] as const).map((r) => (
              <button key={r} onClick={() => setRoleFilter(r as any)}
                className={cn(
                  "h-9 px-3.5 rounded-full text-[12.5px] font-semibold tap transition-all",
                  roleFilter === r ? "bg-ink text-white shadow-sm" : "bg-surface-1 text-ink-2 hover:bg-surface-2"
                )}>
                {r === "all" ? "Tous" : ROLE_LABELS[r]}
              </button>
            ))}
            <div className="relative w-full sm:ml-auto sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Nom, ville…"
                className="h-9 w-full pl-9 pr-3 squircle-full bg-surface-1 border border-hairline text-[13px] outline-none focus:border-primary/40 sm:w-56"
              />
            </div>
          </div>
          <div className="grid gap-2">
            {filteredUsers.map((u) => {
              const photo = u.avatar_url ? supabase.storage.from("public-profiles").getPublicUrl(u.avatar_url).data.publicUrl : null;
              return (
                <div key={u.id} className="squircle-lg glass p-4 flex items-center gap-3">
                  <div className="size-11 rounded-full bg-surface-1 flex items-center justify-center overflow-hidden shrink-0">
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-5 w-5 text-ink-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14.5px] text-ink truncate">{u.full_name || "Utilisateur"}</p>
                    <p className="text-[12px] text-ink-3 truncate">
                      {u.city ?? "Ville inconnue"} · inscrit {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px] justify-end">
                    {u.roles.map((r) => (
                      <span key={r} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                  {!u.roles.includes("admin") && (
                    <button
                      type="button"
                      disabled={roleWorkingId === u.id}
                      onClick={() => void toggleReviewer(u)}
                      title={u.roles.includes("application_reviewer") ? "Retirer l’accès agent dossiers" : "Nommer agent dossiers"}
                      aria-label={u.roles.includes("application_reviewer") ? "Retirer l’accès agent dossiers" : "Nommer agent dossiers"}
                      className={cn(
                        "min-h-9 shrink-0 squircle px-2.5 flex items-center justify-center gap-1.5 tap text-[11.5px] font-semibold transition disabled:opacity-50",
                        u.roles.includes("application_reviewer")
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-surface-1 text-ink-2 hover:bg-surface-2",
                      )}
                    >
                      <UserCog className="h-4 w-4" />
                      <span className="hidden md:inline">
                        {u.roles.includes("application_reviewer") ? "Retirer l’accès" : "Nommer agent"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="state-panel">
                <p className="text-ink-3 text-[14px]">Aucun utilisateur ne correspond.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* AUDIT */}
      {isFullAdmin && view === "audit" && <AuditLog />}

      {/* REQUESTS */}
      {view === "requests" && <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "h-9 px-3.5 rounded-full text-[12.5px] font-semibold tap transition-all",
              filter === f ? "bg-ink text-white shadow-sm" : "bg-surface-1 text-ink-2 hover:bg-surface-2"
            )}>
            {f === "all" ? "Toutes" : STATUS_META[f].label}
            <span className="ml-1.5 text-[11px] opacity-70">{counts[f]}</span>
          </button>
        ))}
        <div className="relative w-full sm:ml-auto sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, ville…"
            className="h-9 w-full pl-9 pr-3 squircle-full bg-surface-1 border border-hairline text-[13px] outline-none focus:border-primary/40 sm:w-56"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="state-panel">
          <p className="text-ink-3 text-[14px]">Aucune demande {filter !== "all" && `«${STATUS_META[filter as AppStatus]?.label}»`}.</p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filtered.map((a) => {
            const isStruct = a.application_type === "structure";
            const appReviews = reviews.filter((review) => review.application_id === a.id);
            const appComplement = complements.find((request) => request.application_id === a.id && !request.resolved_at);
            const favorableCount = appReviews.filter((review) => review.opinion === "favorable").length;
            const unfavorableCount = appReviews.length - favorableCount;
            const photo = isStruct
              ? (a.logo_url ? supabase.storage.from("public-profiles").getPublicUrl(a.logo_url).data.publicUrl : null)
              : (a.profile_photo_url ? supabase.storage.from("public-profiles").getPublicUrl(a.profile_photo_url).data.publicUrl : null);
            return (
              <button key={a.id} onClick={() => setSelected(a)}
                className="squircle-lg glass hover:shadow-md transition-all text-left p-4 flex items-center gap-3 tap">
                <div className={cn("size-11 squircle bg-surface-1 flex items-center justify-center shrink-0 overflow-hidden", isStruct ? "" : "rounded-full")}>
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover" />
                    : isStruct ? <Building2 className="h-5 w-5 text-ink-3" /> : <UserIcon className="h-5 w-5 text-ink-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[14.5px] text-ink truncate">{a.full_name}</p>
                    <span className={cn("text-[10.5px] font-semibold px-2 py-0.5 rounded-full", STATUS_META[a.status].cls)}>
                      {STATUS_META[a.status].label}
                    </span>
                    {appComplement && (
                      <span className={cn(
                        "text-[10.5px] font-semibold px-2 py-0.5 rounded-full",
                        appComplement.responded_at
                          ? "bg-primary-soft text-primary"
                          : "bg-surface-2 text-ink-3",
                      )}>
                        {appComplement.responded_at ? "Réponse reçue" : "Complément demandé"}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-ink-3 truncate">
                    {TYPE_LABELS[a.application_type] ?? a.application_type}
                    {a.speciality && ` · ${a.speciality}`}
                    {a.city && ` · ${a.city}`}
                  </p>
                  {appReviews.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10.5px] font-semibold">
                      {favorableCount > 0 && <span className="text-emerald-700">{favorableCount} favorable{favorableCount > 1 ? "s" : ""}</span>}
                      {unfavorableCount > 0 && <span className="text-rose-700">{unfavorableCount} défavorable{unfavorableCount > 1 ? "s" : ""}</span>}
                    </div>
                  )}
                </div>
                <Clock className="h-4 w-4 text-ink-4 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-paper z-50 overflow-y-auto safe-top"
            >
              <header className="sticky top-0 bg-paper/95 backdrop-blur-md border-b border-hairline px-5 py-4 flex items-center justify-between z-10">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3">{TYPE_LABELS[selected.application_type]}</p>
                  <p className="font-display text-[18px] tracking-headline text-ink truncate">{selected.full_name}</p>
                </div>
                <button onClick={() => setSelected(null)} className="size-9 squircle bg-surface-1 hover:bg-surface-2 flex items-center justify-center tap">
                  <X className="h-4 w-4 text-ink-2" />
                </button>
              </header>

              <div className="p-5 space-y-5">
                <DetailGrid app={selected} />

                <section>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-3">Pièces justificatives</p>
                  <div className="space-y-2">
                    {Object.entries({
                      document_cni_url: "Carte d'identité (CNI)",
                      document_cv_url: "Curriculum Vitae",
                      document_diploma_url: "Diplôme",
                      document_order_url: "Carte d'ordre",
                      document_legal_url: "Document légal (RCCM)",
                      document_approval_url: "Agrément ministériel",
                      document_rccm_url: "RCCM",
                    }).map(([key, label]) => {
                      const url = docUrls[key];
                      const path = (selected as any)[key];
                      if (!path) return null;
                      return (
                        <a key={key} href={url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 squircle bg-surface-1 hover:bg-surface-2 p-3 transition-all tap">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="flex-1 text-[13px] font-medium text-ink truncate">{label}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-ink-3" />
                        </a>
                      );
                    })}
                  </div>
                </section>

                {selected.status === "pending" && (
                  <section className="squircle-lg border border-hairline bg-surface-0 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary">
                        <MessageSquarePlus className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-ink">Complément de dossier</p>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                          Demandez uniquement les éléments nécessaires pour poursuivre l'étude.
                        </p>
                      </div>
                    </div>

                    {selectedComplement ? (
                      <div className="mt-4 rounded-[0.8rem] bg-surface-1 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold",
                            selectedComplement.responded_at
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}>
                            {selectedComplement.responded_at ? "Réponse reçue" : "En attente du prestataire"}
                          </span>
                          <time className="text-[10px] text-ink-4">
                            {new Date(selectedComplement.requested_at).toLocaleDateString("fr-SN")}
                          </time>
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{selectedComplement.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {selectedComplement.missing_items.map((item) => (
                            <span key={item} className="rounded-full bg-surface-0 px-2 py-1 text-[10.5px] font-medium text-ink-2">
                              {item}
                            </span>
                          ))}
                        </div>
                        {selectedComplement.applicant_response && (
                          <div className="mt-3 border-t border-hairline pt-3">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Réponse du prestataire</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-ink">{selectedComplement.applicant_response}</p>
                          </div>
                        )}
                        {complementDocuments.some((document) => document.request_id === selectedComplement.id) && (
                          <div className="mt-3 rounded-[0.75rem] bg-surface-0 px-3">
                            {complementDocuments
                              .filter((document) => document.request_id === selectedComplement.id)
                              .map((document) => (
                                <SignedDocLink key={document.id} path={document.file_path} label={document.label} />
                              ))}
                          </div>
                        )}
                        {selectedComplement.responded_at && (
                          <button
                            type="button"
                            disabled={working}
                            onClick={() => void resolveComplement(selectedComplement.id)}
                            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reprendre l'étude du dossier
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <label>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Éléments attendus</span>
                          <input
                            value={complementItems}
                            onChange={(event) => setComplementItems(event.target.value)}
                            placeholder="Ex. Diplôme lisible, carte d'ordre à jour"
                            className="mt-1.5 h-10 w-full rounded-[0.7rem] border border-hairline bg-surface-1 px-3 text-[12.5px] outline-none focus:border-primary/40"
                          />
                        </label>
                        <label>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Message au prestataire</span>
                          <textarea
                            value={complementReason}
                            onChange={(event) => setComplementReason(event.target.value)}
                            rows={3}
                            maxLength={1200}
                            placeholder="Expliquez précisément ce qui manque ou doit être remplacé."
                            className="mt-1.5 w-full rounded-[0.7rem] border border-hairline bg-surface-1 px-3 py-2.5 text-[12.5px] outline-none focus:border-primary/40"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={working || complementReason.trim().length < 10 || !complementItems.trim()}
                          onClick={() => void requestComplement(selected.id)}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary-soft text-[12px] font-semibold text-primary disabled:opacity-50"
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                          Envoyer la demande de complément
                        </button>
                      </div>
                    )}
                  </section>
                )}

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3">Avis de l’équipe dossiers</p>
                    <span className="text-[11px] text-ink-3">{selectedReviews.length} avis</span>
                  </div>
                  {selectedReviews.length === 0 ? (
                    <div className="squircle-lg border border-dashed border-hairline bg-surface-1 p-4">
                      <p className="text-[13px] text-ink-3">Aucun avis motivé n’a encore été déposé.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedReviews.map((review) => (
                        <article key={review.id} className="squircle-lg border border-hairline bg-surface-0 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className={cn(
                              "text-[11px] font-semibold rounded-full px-2 py-1",
                              review.opinion === "favorable"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700",
                            )}>
                              Avis {review.opinion}
                            </span>
                            <time className="text-[10.5px] text-ink-3">
                              {new Date(review.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                            </time>
                          </div>
                          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{review.reason}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                {selected.status === "rejected" && selected.rejection_reason && (
                  <section className="squircle-lg bg-rose-50 border border-rose-200 p-4">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-rose-700 mb-1">Motif du rejet</p>
                    <p className="text-[13.5px] text-rose-900">{selected.rejection_reason}</p>
                  </section>
                )}

                {selected.status === "pending" && !isFullAdmin && !selectedComplement && (
                  <section className="space-y-4 border-t border-hairline pt-4">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-2">Votre avis</p>
                      <div className="grid grid-cols-2 gap-2 rounded-[0.85rem] bg-surface-1 p-1">
                        {(["favorable", "unfavorable"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setOpinion(value)}
                            className={cn(
                              "min-h-10 rounded-[0.7rem] text-[13px] font-semibold transition",
                              opinion === value
                                ? value === "favorable" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                                : "text-ink-3",
                            )}
                          >
                            {value === "favorable" ? "Favorable" : "Défavorable"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="opinion-reason" className="text-[11px] font-mono uppercase tracking-widest text-ink-3">
                        Motif de l’avis
                      </label>
                      <textarea
                        id="opinion-reason"
                        value={opinionReason}
                        onChange={(event) => setOpinionReason(event.target.value)}
                        rows={4}
                        maxLength={1200}
                        placeholder="Précisez les vérifications effectuées, les pièces conformes ou les éléments à corriger."
                        className="mt-2 w-full squircle bg-surface-1 border border-hairline px-3 py-2.5 text-[13.5px] outline-none focus:border-primary/40 resize-y"
                      />
                      <p className="mt-1 text-right text-[10.5px] text-ink-4">{opinionReason.length}/1200</p>
                    </div>
                    <button
                      type="button"
                      disabled={working || opinionReason.trim().length < 10}
                      onClick={() => void submitOpinion(selected.id)}
                      className="h-11 w-full squircle-full bg-ink text-white font-semibold text-[14px] tap inline-flex items-center justify-center gap-2 hover:bg-ink/90 transition disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {myReview ? "Mettre à jour mon avis" : "Enregistrer mon avis"}
                    </button>
                  </section>
                )}

                {selected.status === "pending" && isFullAdmin && (
                  <section className="space-y-3 pt-3 border-t border-hairline">
                    {selectedComplement && (
                      <div className="squircle-lg bg-primary-soft border border-primary/15 p-3">
                        <p className="text-[12.5px] text-primary">
                          La décision finale reste en pause jusqu'à la réception et la clôture du complément.
                        </p>
                      </div>
                    )}
                    {selectedReviews.length === 0 && (
                      <div className="squircle-lg bg-amber-50 border border-amber-200 p-3">
                        <p className="text-[12.5px] text-amber-800">Un avis motivé de l’équipe dossiers est requis avant la décision finale.</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-2">Motif du refus définitif</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="Expliquez clairement au demandeur les éléments non conformes ou manquants."
                        className="w-full squircle bg-surface-1 border border-hairline px-3 py-2 text-[13.5px] outline-none focus:border-primary/40 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 sticky bottom-0 bg-paper py-2">
                      <button disabled={working || selectedReviews.length === 0 || Boolean(selectedComplement)} onClick={() => reject(selected.id)}
                        className="flex-1 h-11 squircle-full bg-rose-50 text-rose-700 font-semibold text-[14px] tap inline-flex items-center justify-center gap-1.5 hover:bg-rose-100 transition disabled:opacity-50">
                        <X className="h-4 w-4" /> Refuser
                      </button>
                      <button disabled={working || selectedReviews.length === 0 || Boolean(selectedComplement)} onClick={() => approve(selected.id)}
                        className="flex-1 h-11 squircle-full bg-ink text-white font-semibold text-[14px] tap inline-flex items-center justify-center gap-1.5 hover:bg-ink/90 transition disabled:opacity-50">
                        <Check className="h-4 w-4" /> Activer le compte
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      </>}
    </DashboardLayout>
  );
};

const TONE_MAP: Record<string, { bg: string; fg: string; ring: string }> = {
  primary:   { bg: "bg-primary/10",   fg: "text-primary",   ring: "ring-primary/20" },
  secondary: { bg: "bg-secondary/10", fg: "text-secondary", ring: "ring-secondary/20" },
  accent:    { bg: "bg-accent/10",    fg: "text-accent",    ring: "ring-accent/20" },
  warning:   { bg: "bg-warning-soft", fg: "text-warning",   ring: "ring-warning/20" },
  success:   { bg: "bg-success-soft", fg: "text-success",   ring: "ring-success/20" },
  ink:       { bg: "bg-surface-1",    fg: "text-ink",       ring: "ring-hairline" },
};

const KpiCard = ({ label, value, icon: Icon, tone, hint }: { label: string; value: number; icon: any; tone: string; hint?: string }) => {
  const t = TONE_MAP[tone] ?? TONE_MAP.primary;
  return (
    <motion.div whileHover={{ y: -2 }} className="squircle-lg glass p-4">
      <div className="flex items-start justify-between">
        <div className={cn("size-9 squircle flex items-center justify-center", t.bg, t.fg)}>
          <Icon className="h-4 w-4" />
        </div>
        <Sparkles className="h-3.5 w-3.5 text-ink-4" />
      </div>
      <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mt-3">{label}</p>
      <p className="font-display text-[26px] tracking-display text-ink mt-0.5 tabular-nums">{value.toLocaleString("fr-FR")}</p>
      {hint && <p className="text-[11.5px] text-ink-3 mt-0.5">{hint}</p>}
    </motion.div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick, tone }: { icon: any; label: string; onClick?: () => void; tone: string }) => {
  const t = TONE_MAP[tone] ?? TONE_MAP.primary;
  return (
    <button onClick={onClick}
      className="w-full squircle bg-surface-1 hover:bg-surface-2 transition-all p-3 flex items-center gap-3 tap text-left">
      <span className={cn("size-9 squircle flex items-center justify-center", t.bg, t.fg)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-[13.5px] font-medium text-ink">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink-3" />
    </button>
  );
};

const DetailGrid = ({ app }: { app: ProviderApp }) => {
  const items: [string, string | null | undefined][] = app.application_type === "structure"
    ? [
        ["Type", app.structure_type ?? null],
        ["Responsable", app.manager_name],
        ["Email", app.email],
        ["Tél. fixe", app.phone],
        ["Adresse", app.professional_address ?? null],
        ["Ville", app.city],
        ["Région", app.region],
        ["RCCM", app.rccm],
        ["Agrément", app.ministry_approval],
      ]
    : [
        ["Email", app.email],
        ["Téléphone", app.phone],
        ["Spécialité", app.speciality],
        ["N° d'ordre", app.order_number],
        ["Année diplôme", app.diploma_year ? String(app.diploma_year) : null],
        ["Adresse pro", app.professional_address],
        ["Ville", app.city],
      ];
  return (
    <section className="squircle-lg glass p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {items.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3 mb-0.5">{k}</dt>
            <dd className="text-[13.5px] text-ink truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default Admin;
