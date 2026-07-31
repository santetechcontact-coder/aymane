import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Stethoscope, Smile, Heart, Baby, Pill, FlaskConical, Phone, Video, MapPin,
  Calendar, Activity, ArrowRight, Clock, Users, FileText, Package, AlertTriangle,
  ClipboardList, ChevronRight, UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  consultationsToday: number;
  patients: number;
  prescriptions: number;
  pending: number;
}

const ICONS: Partial<Record<AppRole, any>> = {
  doctor: Stethoscope, dentist: Smile, nurse: Heart, midwife: Baby,
  pharmacist: Pill, lab_technician: FlaskConical,
};

const ROLE_INTRO: Partial<Record<AppRole, string>> = {
  doctor: "Vos patients, vos consultations, vos prescriptions.",
  dentist: "Actes dentaires, suivis, interventions.",
  nurse: "Soins programmés et interventions à domicile.",
  midwife: "Suivi prénatal, consultations et accouchements.",
  pharmacist: "Stock, ordonnances et commandes à traiter dans l'officine.",
  lab_technician: "Analyses en attente et résultats à transmettre.",
};

const ProDashboard = ({ role }: { role: AppRole }) => {
  const { user, account } = useAuth();
  const [stats, setStats] = useState<Stats>({ consultationsToday: 0, patients: 0, prescriptions: 0, pending: 0 });
  const [next, setNext] = useState<any[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [labDraft, setLabDraft] = useState({ patient: "", reference: "", file: "" });

  useEffect(() => {
    if (!user) return;
    document.title = `${ROLE_LABELS[role]} — AYMANE`;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setName(prof?.full_name ?? null);

      if (["doctor", "dentist", "nurse", "midwife"].includes(role)) {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        const [{ count: today }, { count: presc }, { count: pending }, { data: upcoming }, { data: distinct }] = await Promise.all([
          supabase.from("consultations").select("id", { count: "exact", head: true }).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()),
          supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("doctor_id", user.id),
          supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("consultations").select("id, reason, scheduled_at, status, patient_id").gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(4),
          supabase.from("consultations").select("patient_id").eq("doctor_id", user.id),
        ]);
        const uniqPatients = new Set((distinct ?? []).map((d: any) => d.patient_id)).size;
        setStats({ consultationsToday: today ?? 0, patients: uniqPatients, prescriptions: presc ?? 0, pending: pending ?? 0 });
        setNext(upcoming ?? []);
      } else if (role === "pharmacist") {
        const [{ count: meds }, { count: orders }, { data: lowStock }] = await Promise.all([
          supabase.from("medications").select("id", { count: "exact", head: true }),
          supabase.from("pharmacy_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("medications").select("id, name, stock").lt("stock", 10).limit(5),
        ]);
        setStats({ consultationsToday: 0, patients: meds ?? 0, prescriptions: 0, pending: orders ?? 0 });
        setNext(lowStock ?? []);
      }
    })();
  }, [user, role]);

  const Icon = ICONS[role] ?? Stethoscope;
  const firstName = name?.split(" ")[0]
    ?? account?.fullName?.split(" ")[0]
    ?? user?.user_metadata?.full_name?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const isClinical = ["doctor", "dentist", "nurse", "midwife"].includes(role);

  return (
    <DashboardLayout title={ROLE_LABELS[role]}>
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="size-7 squircle bg-primary-soft grid place-items-center">
            <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-ink-3">
            Espace {ROLE_LABELS[role].toLowerCase()}
          </span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-display text-ink leading-[1.05]">
          {greeting}{firstName ? <>, <span className="text-gradient-primary">{role === "doctor" || role === "dentist" ? "Dr. " : ""}{firstName}</span></> : ""}.
        </h1>
        <p className="mt-3 text-[15px] text-ink-3 max-w-xl">{ROLE_INTRO[role]}</p>
      </motion.header>

      {/* KPIs */}
      {isClinical && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Stat icon={Calendar} label="Aujourd'hui" value={stats.consultationsToday} tone="primary" to="/dashboard/doctor" />
          <Stat icon={Users} label="Patients suivis" value={stats.patients} tone="secondary" to="/dashboard/doctor" />
          <Stat icon={Clock} label="En attente" value={stats.pending} tone="warning" hint="à confirmer" to="/dashboard/doctor" />
          <Stat icon={FileText} label="Prescriptions" value={stats.prescriptions} tone="primary" />
        </section>
      )}

      {role === "pharmacist" && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Stat icon={Package} label="Médicaments" value={stats.patients} tone="primary" to="/dashboard/pharmacist" />
          <Stat icon={ClipboardList} label="Commandes" value={stats.pending} tone="warning" hint="à traiter" to="/dashboard/pharmacist" />
          <Stat icon={AlertTriangle} label="Stock faible" value={next.length} tone="accent" hint="alertes" />
          <Stat icon={Activity} label="Retraits du jour" value={0} tone="secondary" hint="à suivre" />
        </section>
      )}

      {role === "lab_technician" && (
        <section className="grid grid-cols-3 gap-3 mb-8">
          <Stat icon={FlaskConical} label="Analyses en attente" value={0} tone="primary" />
          <Stat icon={FileText} label="Résultats du jour" value={0} tone="secondary" />
          <Stat icon={Users} label="Patients" value={0} tone="primary" />
        </section>
      )}

      {/* Quick actions clinical */}
      {isClinical && (
        <section className="mb-8">
          <h3 className="font-display text-xl tracking-headline text-ink mb-4">Démarrer une consultation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { i: Video, l: "Vidéo", to: "/dashboard/teleconsultation", tone: "primary" as const },
              { i: Phone, l: "Audio", to: "/dashboard/teleconsultation", tone: "secondary" as const },
              { i: MapPin, l: "Cabinet", to: "/dashboard/doctor", tone: "primary" as const },
              { i: Heart, l: "À domicile", to: "/dashboard/doctor", tone: "accent" as const },
            ].map(({ i: I, l, to, tone }) => {
              const toneCls = {
                primary: "bg-primary text-primary-foreground",
                secondary: "bg-secondary text-secondary-foreground",
                accent: "bg-accent text-accent-foreground",
              }[tone];
              return (
                <Link key={l} to={to}
                  className="group squircle-lg glass ring-inner shadow-xs p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring">
                  <div className={cn("size-10 squircle grid place-items-center mb-3", toneCls)}>
                    <I className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  <div className="text-[14px] font-semibold text-ink">{l}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick actions pharmacist */}
      {role === "pharmacist" && (
        <section className="mb-8">
          <h3 className="font-display text-xl tracking-headline text-ink mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <QuickLink to="/dashboard/pharmacist" icon={Package} label="Ajouter un médicament" tone="primary" />
            <QuickLink to="/dashboard/pharmacy" icon={ClipboardList} label="Voir les commandes" tone="secondary" />
            <QuickLink to="/dashboard/messages" icon={Phone} label="Contacter un patient" tone="primary" />
          </div>
        </section>
      )}

      {/* List */}
      {role !== "lab_technician" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl tracking-headline text-ink">
              {role === "pharmacist" ? "Stock faible" : "Prochaines consultations"}
            </h3>
            <Link
              to={role === "pharmacist" ? "/dashboard/pharmacist" : "/dashboard/doctor"}
              className="text-[13px] font-medium text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all"
            >
              Tout voir <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="squircle-lg glass ring-inner shadow-xs overflow-hidden">
            {next.length === 0 ? (
              <div className="p-10 text-center">
                <div className="size-10 squircle bg-surface-1 grid place-items-center mx-auto mb-3">
                  <Calendar className="h-4 w-4 text-ink-3" />
                </div>
                <p className="text-[13.5px] text-ink-3">Rien à afficher pour le moment.</p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {next.map((n: any) => (
                  <li key={n.id}>
                    <Link
                      to={role === "pharmacist" ? "/dashboard/pharmacist" : "/dashboard/doctor"}
                      className="group flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 hover:bg-surface-1/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-9 squircle grid place-items-center shrink-0",
                          role === "pharmacist" && (n.stock ?? 0) === 0 ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                        )}>
                          {role === "pharmacist"
                            ? <Pill className="h-4 w-4" strokeWidth={2.2} />
                            : <Calendar className="h-4 w-4" strokeWidth={2.2} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-ink truncate">{n.reason ?? n.name}</div>
                          {n.scheduled_at && (
                            <div className="text-[12px] text-ink-3 tabular mt-0.5">
                              {new Date(n.scheduled_at).toLocaleString("fr-FR", {
                                weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                              })}
                            </div>
                          )}
                          {n.stock !== undefined && (
                            <div className={cn("text-[12px] tabular mt-0.5 font-medium", (n.stock ?? 0) === 0 ? "text-accent" : "text-warning")}>
                              Stock : {n.stock}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-ink-3 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {role === "lab_technician" && (
        <section className="squircle-lg glass ring-inner shadow-xs p-5 md:p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="size-11 squircle bg-primary-soft grid place-items-center shrink-0">
              <FlaskConical className="h-5 w-5 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="font-display text-xl text-ink leading-tight">Déposer un résultat d'analyse</h3>
              <p className="text-[13.5px] text-ink-3 mt-1">
                Préparez un résultat, rattachez-le à un patient, puis transmettez-le depuis l'espace sécurisé.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
            <Input
              value={labDraft.patient}
              onChange={(e) => setLabDraft({ ...labDraft, patient: e.target.value })}
              placeholder="Nom ou ID patient"
              aria-label="Nom ou ID patient"
            />
            <Input
              value={labDraft.reference}
              onChange={(e) => setLabDraft({ ...labDraft, reference: e.target.value })}
              placeholder="Référence analyse"
              aria-label="Référence analyse"
            />
            <label className="btn-pill h-10 px-4 bg-surface-1 text-ink text-[13px] font-semibold tap cursor-pointer">
              <UploadCloud className="h-4 w-4" strokeWidth={2.4} />
              {labDraft.file || "Fichier"}
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setLabDraft({ ...labDraft, file: e.target.files?.[0]?.name ?? "" })}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[12.5px] text-ink-3">
              Formats acceptés : PDF, JPG, PNG. Le patient verra le document dans son dossier médical.
            </p>
            <Button
              className="squircle-full gap-2"
              disabled={!labDraft.patient.trim() || !labDraft.reference.trim() || !labDraft.file}
              onClick={() => {
                toast({ title: "Résultat prêt", description: "Le document est préparé pour l'envoi sécurisé." });
                setLabDraft({ patient: "", reference: "", file: "" });
              }}
            >
              Préparer l'envoi
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </Button>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
};

const Stat = ({ icon: Icon, label, value, tone, hint, to }: {
  icon: any; label: string; value: number; tone: "primary" | "secondary" | "accent" | "warning"; hint?: string; to?: string;
}) => {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary-soft text-secondary",
    accent: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
  }[tone];
  const content = (
    <div className="squircle-lg glass ring-inner shadow-xs p-4 md:p-5 h-full">
      <div className={cn("size-9 squircle grid place-items-center mb-3", toneCls)}>
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="font-display text-3xl tabular text-ink leading-none">{value}</div>
      <div className="text-[12px] text-ink-3 mt-1.5 font-medium">{label}{hint && <span className="text-ink-4"> · {hint}</span>}</div>
    </div>
  );
  return to ? <Link to={to} className="block hover:-translate-y-0.5 transition-transform ease-spring">{content}</Link> : content;
};

const QuickLink = ({ to, icon: Icon, label, tone }: { to: string; icon: any; label: string; tone: "primary" | "secondary" }) => {
  const toneCls = tone === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
  return (
    <Link to={to}
      className="group squircle-lg glass ring-inner shadow-xs p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring">
      <div className={cn("size-10 squircle grid place-items-center", toneCls)}>
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      <ArrowRight className="h-4 w-4 text-ink-3 group-hover:text-primary group-hover:translate-x-1 transition-all ml-auto" />
    </Link>
  );
};

export default ProDashboard;
