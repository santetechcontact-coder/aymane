import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import CompletenessCard from "@/components/CompletenessCard";
import ProDashboard from "@/components/ProDashboard";
import {
  Activity, HeartPulse, Calendar, Pill, Siren, MessageCircle,
  Video, Stethoscope, ArrowRight, Droplet, FileText, ChevronRight,
  Sparkles, Clock, MapPin, ShieldCheck, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NextConsultation = { id: string; reason: string; scheduled_at: string; status: string };
type Prescription = { id: string; medication_name: string; dosage: string; duration: string; created_at: string };
const PRO_ORDER: AppRole[] = ["doctor", "dentist", "nurse", "midwife", "pharmacist", "lab_technician", "other_provider"];

const useCountdown = (target: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "C'est l'heure";
  const mins = Math.floor(diff / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `dans ${days}j ${hours}h`;
  if (hours > 0) return `dans ${hours}h ${m}min`;
  return `dans ${m} min`;
};

const Dashboard = () => {
  const { user, roles, account } = useAuth();
  const proRole = PRO_ORDER.find((r) => roles.includes(r));
  const [stats, setStats] = useState({ consultations: 0, prescriptions: 0, orders: 0, emergencies: 0, unread: 0 });
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [next, setNext] = useState<NextConsultation | null>(null);
  const [recentPresc, setRecentPresc] = useState<Prescription[]>([]);
  const countdown = useCountdown(next?.scheduled_at ?? null);

  useEffect(() => {
    document.title = "Mon espace santé — AYMANE";
    if (!user || proRole) return;
    (async () => {
      const [{ data: prof }, c, p, o, e, m, { data: upcoming }, { data: rx }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("consultations").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("pharmacy_orders").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("emergencies").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
        supabase.from("consultations").select("id, reason, scheduled_at, status").eq("patient_id", user.id)
          .gte("scheduled_at", new Date().toISOString())
          .in("status", ["pending", "confirmed", "in_progress"])
          .order("scheduled_at", { ascending: true }).limit(1),
        supabase.from("prescriptions").select("id, medication_name, dosage, duration, created_at")
          .eq("patient_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);
      setProfile(prof);
      setStats({
        consultations: c.count ?? 0, prescriptions: p.count ?? 0,
        orders: o.count ?? 0, emergencies: e.count ?? 0, unread: m.count ?? 0,
      });
      setNext(upcoming?.[0] ?? null);
      setRecentPresc((rx ?? []) as Prescription[]);
    })();
  }, [user, proRole]);

  if (roles.includes("admin") || roles.includes("application_reviewer")) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  if (proRole) return <ProDashboard role={proRole} />;

  const firstName = profile?.full_name?.split(" ")[0]
    ?? account?.fullName?.split(" ")[0]
    ?? user?.user_metadata?.full_name?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const vitals = [
    { label: "Consultations", value: stats.consultations, icon: Stethoscope, color: "primary" },
    { label: "Prescriptions", value: stats.prescriptions, icon: FileText, color: "secondary" },
    { label: "Pharmacie", value: stats.orders, icon: Pill, color: "warning" },
    { label: "Alertes SOS", value: stats.emergencies, icon: Siren, color: "accent" },
  ] as const;

  const quickActions = [
    { to: "/triage", label: "Orientation santé", desc: "Décrivez vos symptômes", icon: Activity, tone: "primary" },
    { to: "/dashboard/teleconsultation", label: "Téléconsultation", desc: "Consultez à distance", icon: Video, tone: "secondary" },
    { to: "/dashboard/messages", label: "Messagerie", desc: stats.unread ? `${stats.unread} non lu${stats.unread > 1 ? "s" : ""}` : "Discuter avec un pro", icon: MessageCircle, tone: "primary", badge: stats.unread },
    { to: "/dashboard/sos", label: "Urgence SOS", desc: "Alerte géolocalisée", icon: Siren, tone: "accent" },
  ] as const;

  const careSignals = [
    { label: "Ville active", value: "Dakar", detail: "Annuaire et SOS priorisés", icon: MapPin },
    { label: "Réseau", value: "Pros vérifiés", detail: "Profils contrôlés avant visibilité", icon: ShieldCheck },
    { label: "Paiement", value: "Mobile money", detail: "Pensé pour les usages locaux", icon: Wallet },
  ] as const;

  return (
    <DashboardLayout title="Aujourd'hui">
      {/* Hero greeting */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 md:mb-10"
      >
        <div className="label text-ink-3 mb-3">Mon espace santé</div>
        <h1 className="font-display text-4xl md:text-6xl tracking-display text-ink leading-[1.05]">
          {greeting}{firstName && <>, <span className="text-gradient-primary">{firstName}</span></>}.
        </h1>
        <p className="mt-3 text-[15px] text-ink-3 max-w-xl">
          Heureux de vous retrouver. Vos informations et vos prochaines actions sont prêtes.
        </p>
      </motion.header>

      <CompletenessCard />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mb-8 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="relative overflow-hidden squircle-xl bg-ink text-white p-5 md:p-6 shadow-md">
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-white/55">
              <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
              Action utile
            </div>
            <h2 className="mt-3 font-display text-3xl md:text-4xl leading-[1.05] text-balance">
              Décrivez le souci avant de chercher un soignant.
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/68">
              AYMANE repère le niveau d'urgence, propose la bonne spécialité et prépare les infos à partager.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <Link
                to="/triage"
                className="btn-pill h-11 bg-white text-ink px-5 text-[14px] font-semibold hover:bg-white/90"
              >
                <Activity className="h-4 w-4" strokeWidth={2.3} />
                Lancer l'orientation santé
              </Link>
              <Link
                to="/dashboard/directory"
                className="btn-pill h-11 bg-white/10 text-white border border-white/15 px-5 text-[14px] hover:bg-white/15"
              >
                <Stethoscope className="h-4 w-4" strokeWidth={2.3} />
                Voir les soignants
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          {careSignals.map((signal, i) => {
            const Icon = signal.icon;
            return (
              <motion.div
                key={signal.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.05 }}
                className="flex items-center gap-3 squircle-lg bg-surface-0/78 border border-hairline p-4 shadow-xs"
              >
                <div className="size-10 squircle bg-primary-soft text-primary grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-ink-4">{signal.label}</p>
                  <p className="text-[15px] font-semibold text-ink truncate">{signal.value}</p>
                  <p className="text-[12px] text-ink-3 truncate">{signal.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Next appointment hero card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        <Link
          to={next ? "/dashboard/consultations" : "/dashboard/consultations"}
          className="group relative block squircle-xl glass-strong sheen ring-inner shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring overflow-hidden p-6 md:p-8"
        >
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="size-12 squircle bg-primary-soft flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" strokeWidth={2.2} />
              </div>
              <div>
                <div className="label text-ink-3 mb-1.5">
                  {next ? "Prochain rendez-vous" : "Aucun rendez-vous"}
                </div>
                <h2 className="font-display text-2xl md:text-3xl tracking-headline text-ink leading-tight max-w-md">
                  {next ? next.reason : "Prendre une consultation"}
                </h2>
                {next && (
                  <p className="mt-2 text-[14px] text-ink-2 tabular">
                    {new Date(next.scheduled_at).toLocaleString("fr-FR", {
                      weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
                {countdown && (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold px-2.5 py-1 squircle-full bg-primary text-primary-foreground tabular">
                    <Clock className="h-3 w-3" /> {countdown}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-ink-3 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </motion.section>

      {/* Vitals grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl tracking-headline text-ink">Mes repères</h3>
          <Link to="/dashboard/medical-record" className="text-[13px] font-medium text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all">
            Dossier <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {vitals.map((v, i) => {
            const Icon = v.icon;
            const tone = {
              primary: "bg-primary-soft text-primary",
              secondary: "bg-secondary-soft text-secondary",
              warning: "bg-warning-soft text-warning",
              accent: "bg-accent-soft text-accent",
            }[v.color];
            return (
              <motion.div
                key={v.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="squircle-lg glass ring-inner shadow-xs p-5"
              >
                <div className={cn("size-9 squircle flex items-center justify-center mb-3", tone)}>
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div className="font-display text-3xl tabular text-ink leading-none">{v.value}</div>
                <div className="text-[12px] text-ink-3 mt-1.5 font-medium">{v.label}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section className="mb-8">
        <h3 className="font-display text-xl tracking-headline text-ink mb-4">Actions rapides</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            const tone = {
              primary: "bg-primary text-primary-foreground",
              secondary: "bg-secondary text-secondary-foreground",
              accent: "bg-accent text-accent-foreground",
            }[a.tone];
            return (
              <motion.div
                key={a.to}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <Link
                  to={a.to}
                  className="group relative flex items-center justify-between gap-4 squircle-lg glass ring-inner shadow-xs p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring overflow-hidden"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn("size-11 squircle flex items-center justify-center shrink-0", tone)}>
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-semibold text-ink flex items-center gap-2">
                        {a.label}
                        {"badge" in a && a.badge ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground tabular">{a.badge}</span>
                        ) : null}
                      </div>
                      <div className="text-[12px] text-ink-3 truncate">{a.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-3 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Traitements en cours */}
      {recentPresc.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl tracking-headline text-ink inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" /> Traitements en cours
            </h3>
            <Link to="/dashboard/medical-record" className="text-[13px] font-medium text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all">
              Tout voir <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {recentPresc.map((rx, i) => (
              <motion.div
                key={rx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="squircle-lg glass ring-inner shadow-xs p-4"
              >
                <div className="size-9 squircle bg-secondary-soft text-secondary flex items-center justify-center mb-3">
                  <Pill className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <div className="text-[14.5px] font-semibold text-ink truncate">{rx.medication_name}</div>
                <div className="text-[12px] text-ink-3 mt-1 tabular">{rx.dosage}</div>
                <div className="text-[11px] text-ink-3 mt-2 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {rx.duration}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Health pillars */}
      <section>
        <h3 className="font-display text-xl tracking-headline text-ink mb-4">Mes piliers santé</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Pillar to="/dashboard/medical-record" icon={HeartPulse} title="Dossier médical" desc="Allergies · antécédents" />
          <Pillar to="/dashboard/pharmacy" icon={Pill} title="Pharmacie" desc="Commander · livrer" />
          <Pillar to="/dashboard/payments" icon={Wallet} title="Paiements" desc="Wave · Orange Money" />
          <Pillar to="/dashboard/sos" icon={Droplet} title="Banque de sang" desc="Donneurs disponibles" />
        </div>
      </section>
    </DashboardLayout>
  );
};

const Pillar = ({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) => (
  <Link to={to} className="group squircle-lg glass ring-inner p-5 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring">
    <Icon className="h-5 w-5 text-primary mb-3" strokeWidth={2.2} />
    <div className="text-[15px] font-semibold text-ink">{title}</div>
    <div className="text-[12.5px] text-ink-3 mt-0.5">{desc}</div>
  </Link>
);

export default Dashboard;
