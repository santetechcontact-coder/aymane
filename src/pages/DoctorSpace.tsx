import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Stethoscope, Users, Calendar, MessageCircle, Video, Search,
  Clock, FileText, ChevronRight, Phone, MapPin, CheckCircle2,
  CalendarDays, ArrowRight, TrendingUp, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CONSULTATION_TYPES = [
  { value: "teleconsultation", label: "Téléconsultation" },
  { value: "in_person", label: "Cabinet" },
  { value: "home_visit", label: "À domicile" },
];

type Consultation = {
  id: string;
  patient_id: string;
  reason: string;
  scheduled_at: string;
  status: string;
  diagnosis?: string | null;
  consultation_type?: string | null;
  speciality?: string | null;
  symptoms?: string | null;
  procedures?: string | null;
  recommendations?: string | null;
  notes?: string | null;
  follow_up_needed?: boolean;
  follow_up_date?: string | null;
};

type PatientRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  visits: number;
};

const statusTone: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-primary-soft text-primary",
  in_progress: "bg-secondary-soft text-secondary",
  completed: "bg-success-soft text-success",
  cancelled: "bg-muted text-ink-3",
};
const statusLabel: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const DoctorSpace = () => {
  const { user, hasRole, loading } = useAuth();
  const [items, setItems] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "completed">("today");

  const [editing, setEditing] = useState<Consultation | null>(null);
  const [form, setForm] = useState({
    consultation_type: "teleconsultation",
    speciality: "",
    symptoms: "",
    diagnosis: "",
    procedures: "",
    recommendations: "",
    notes: "",
    follow_up_needed: false,
    follow_up_date: "",
  });
  const [presc, setPresc] = useState({ name: "", dosage: "", duration: "", instructions: "" });

  useEffect(() => {
    document.title = "Espace médecin — AYMANE";
    if (hasRole("doctor")) load();
  }, [hasRole]);

  const load = async () => {
    const { data: cons } = await supabase
      .from("consultations")
      .select("*")
      .order("scheduled_at", { ascending: true })
      .limit(150);
    const list = (cons ?? []) as Consultation[];
    setItems(list);

    const ids = Array.from(new Set(list.map((c) => c.patient_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, city")
        .in("id", ids);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setProfilesMap(map);

      const agg: Record<string, PatientRow> = {};
      list.forEach((c) => {
        const p = map[c.patient_id] ?? {};
        const cur = agg[c.patient_id] ?? {
          id: c.patient_id,
          full_name: p.full_name ?? null,
          phone: p.phone ?? null,
          city: p.city ?? null,
          avatar_url: p.avatar_url ?? null,
          last_seen: null,
          visits: 0,
        };
        cur.visits += 1;
        if (!cur.last_seen || new Date(c.scheduled_at) > new Date(cur.last_seen)) {
          cur.last_seen = c.scheduled_at;
        }
        agg[c.patient_id] = cur;
      });
      setPatients(Object.values(agg).sort((a, b) =>
        (b.last_seen ?? "").localeCompare(a.last_seen ?? "")
      ));
    }
  };

  if (loading) return null;
  if (!hasRole("doctor")) {
    return (
      <DashboardLayout title="Espace médecin">
        <Card className="state-panel">
          <Stethoscope className="h-12 w-12 mx-auto text-ink-3 mb-4" />
          <h2 className="font-display text-xl mb-2">Accès réservé aux médecins</h2>
          <p className="text-sm text-ink-3">
            Demandez à un administrateur de vous attribuer le rôle « doctor ».
          </p>
        </Card>
      </DashboardLayout>
    );
  }

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const todayList = items.filter((c) => {
    const d = new Date(c.scheduled_at);
    return d >= startOfDay && d <= endOfDay && c.status !== "cancelled";
  });
  const upcomingList = items.filter((c) => new Date(c.scheduled_at) > endOfDay && !["completed", "cancelled"].includes(c.status));
  const completedList = items.filter((c) => c.status === "completed");

  const filtered = (() => {
    let base = items;
    if (filter === "today") base = todayList;
    else if (filter === "upcoming") base = upcomingList;
    else if (filter === "completed") base = completedList;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((c) => {
      const p = profilesMap[c.patient_id];
      return (
        c.reason?.toLowerCase().includes(q) ||
        p?.full_name?.toLowerCase().includes(q) ||
        c.diagnosis?.toLowerCase().includes(q)
      );
    });
  })();

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q);
  });

  const stats = {
    today: todayList.length,
    upcoming: upcomingList.length,
    patients: patients.length,
    pending: items.filter((c) => c.status === "pending").length,
  };

  // Prochain patient & semaine
  const nextPatient = todayList
    .filter((c) => new Date(c.scheduled_at) > now && c.status !== "completed")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
    ?? upcomingList[0];
  const nextPatientProfile = nextPatient ? profilesMap[nextPatient.patient_id] : null;
  const minsToNext = nextPatient
    ? Math.max(0, Math.round((new Date(nextPatient.scheduled_at).getTime() - now.getTime()) / 60_000))
    : null;

  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weekDone = items.filter((c) => {
    const t = (c as any).completed_at ? new Date((c as any).completed_at).getTime() : 0;
    return c.status === "completed" && t >= weekStart.getTime();
  }).length;
  const weekTotal = items.filter((c) => new Date(c.scheduled_at) >= weekStart).length;
  const completionRate = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0;

  const openEdit = (c: Consultation) => {
    setEditing(c);
    setForm({
      consultation_type: c.consultation_type ?? "teleconsultation",
      speciality: c.speciality ?? "",
      symptoms: c.symptoms ?? "",
      diagnosis: c.diagnosis ?? "",
      procedures: c.procedures ?? "",
      recommendations: c.recommendations ?? "",
      notes: c.notes ?? "",
      follow_up_needed: c.follow_up_needed ?? false,
      follow_up_date: c.follow_up_date ? new Date(c.follow_up_date).toISOString().slice(0, 16) : "",
    });
    setPresc({ name: "", dosage: "", duration: "", instructions: "" });
  };

  const claimAndUpdate = async () => {
    if (!editing || !user) return;
    if (!form.diagnosis.trim()) {
      toast({ title: "Diagnostic requis", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("consultations").update({
      doctor_id: user.id,
      consultation_type: form.consultation_type,
      speciality: form.speciality || null,
      symptoms: form.symptoms || null,
      diagnosis: form.diagnosis,
      procedures: form.procedures || null,
      recommendations: form.recommendations || null,
      notes: form.notes || null,
      follow_up_needed: form.follow_up_needed,
      follow_up_date: form.follow_up_needed && form.follow_up_date ? new Date(form.follow_up_date).toISOString() : null,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", editing.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    if (presc.name) {
      await supabase.from("prescriptions").insert({
        consultation_id: editing.id,
        patient_id: editing.patient_id,
        doctor_id: user.id,
        medication_name: presc.name,
        dosage: presc.dosage,
        duration: presc.duration,
        instructions: presc.instructions,
      });
    }
    toast({ title: "Compte rendu enregistré" });
    setEditing(null);
    load();
  };

  const confirm = async (id: string) => {
    const { error } = await supabase
      .from("consultations")
      .update({ status: "confirmed", doctor_id: user!.id })
      .eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Rendez-vous confirmé" }); load(); }
  };

  return (
    <DashboardLayout title="Espace médecin">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="label text-ink-3 mb-3">Espace médecin</div>
        <h1 className="font-display text-4xl md:text-5xl tracking-display text-ink leading-[1.05]">
          Vos patients, <span className="text-gradient-primary">sereinement</span>.
        </h1>
        <p className="mt-3 text-[15px] text-ink-3 max-w-xl">
          Suivez vos rendez-vous, démarrez une téléconsultation et échangez avec vos patients.
        </p>
      </motion.header>

      {/* Quick actions */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <QuickAction to="/dashboard/teleconsultation" icon={Video} label="Téléconsultation" desc="Démarrer un appel" tone="primary" />
        <QuickAction to="/dashboard/messages" icon={MessageCircle} label="Messagerie" desc="Discuter avec un patient" tone="secondary" />
        <QuickAction to="/dashboard/consultations" icon={CalendarDays} label="Mes consultations" desc="Historique complet" tone="primary" />
        <QuickAction to="/dashboard/dispatch" icon={Phone} label="SOS en cours" desc="Alertes à suivre" tone="accent" />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat icon={Calendar} label="Aujourd'hui" value={stats.today} tone="primary" />
        <Stat icon={Clock} label="À venir" value={stats.upcoming} tone="secondary" />
        <Stat icon={Users} label="Patients suivis" value={stats.patients} tone="primary" />
        <Stat icon={FileText} label="En attente" value={stats.pending} tone="warning" />
      </section>

      {/* Prochain patient + cadence semaine */}
      <section className="grid lg:grid-cols-3 gap-3 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 relative overflow-hidden squircle-xl glass-strong sheen ring-inner shadow-md p-5 md:p-6"
        >
          <div className="relative flex items-start gap-4">
            <div className="size-12 squircle bg-primary text-primary-foreground grid place-items-center shrink-0">
              <Stethoscope className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="label text-ink-3 mb-1.5">Prochain patient</div>
              {nextPatient ? (
                <>
                  <div className="font-display text-xl md:text-2xl tracking-headline text-ink truncate">
                    {nextPatientProfile?.full_name ?? "Patient"}
                  </div>
                  <div className="text-[13px] text-ink-3 mt-1 truncate">{nextPatient.reason}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 squircle-full bg-primary text-primary-foreground tabular">
                      <Clock className="h-3 w-3" />
                      {minsToNext === 0 ? "C'est l'heure" : minsToNext! < 60 ? `dans ${minsToNext} min` : new Date(nextPatient.scheduled_at).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {nextPatient.consultation_type !== "in_person" && (
                      <Button asChild size="sm" className="squircle-full h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                        <Link to="/dashboard/teleconsultation"><Video className="h-3.5 w-3.5 mr-1.5" /> Démarrer</Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline" className="squircle-full h-8 px-3 border-hairline">
                      <Link to="/dashboard/messages"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Message</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display text-xl md:text-2xl tracking-headline text-ink">Agenda dégagé</div>
                  <div className="text-[13px] text-ink-3 mt-1">Aucun rendez-vous imminent. Profitez-en.</div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="squircle-xl glass ring-inner shadow-xs p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="label text-ink-3 inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> 7 derniers jours
            </div>
            <span className="text-[11px] font-semibold text-secondary tabular">{completionRate}%</span>
          </div>
          <div className="font-display text-3xl tabular text-ink leading-none">
            {weekDone}<span className="text-ink-3 text-xl"> / {weekTotal}</span>
          </div>
          <div className="text-[12px] text-ink-3 mt-1.5 font-medium">Consultations clôturées</div>
          <div className="mt-4 h-2 squircle-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </motion.div>
      </section>

      {/* Timeline du jour */}
      {todayList.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 squircle-xl glass ring-inner shadow-xs p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg tracking-headline text-ink inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Agenda du jour
            </h3>
            <span className="text-[12px] text-ink-3 tabular">{todayList.length} RDV</span>
          </div>
          <ol className="relative border-l-2 border-hairline ml-2 space-y-3 pl-5">
            {todayList.slice(0, 6).map((c) => {
              const p = profilesMap[c.patient_id];
              const d = new Date(c.scheduled_at);
              const past = d < now && c.status !== "completed";
              const done = c.status === "completed";
              return (
                <li key={c.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[27px] top-1.5 size-3 squircle-full ring-4 ring-background",
                      done ? "bg-success" : past ? "bg-warning" : "bg-primary"
                    )}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[13px] font-semibold text-ink tabular w-12 shrink-0">
                      {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[14px] text-ink truncate flex-1">{p?.full_name ?? "Patient"}</span>
                    <span className="text-[12px] text-ink-3 truncate hidden sm:inline">{c.reason}</span>
                    <Badge className={cn("squircle-full px-2 py-0 text-[10px] font-medium border-0", statusTone[c.status] ?? "bg-muted text-ink-3")}>
                      {statusLabel[c.status] ?? c.status}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.section>
      )}

      {/* Tabs */}
      <Tabs defaultValue="appointments" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <TabsList className="glass ring-inner squircle-lg p-1 h-11">
            <TabsTrigger value="appointments" className="squircle px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4 mr-2" /> Rendez-vous
            </TabsTrigger>
            <TabsTrigger value="patients" className="squircle px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" /> Patients
            </TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 squircle h-10 glass ring-inner border-0"
            />
          </div>
        </div>

        <TabsContent value="appointments">
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {([
              { k: "today", l: `Aujourd'hui (${todayList.length})` },
              { k: "upcoming", l: `À venir (${upcomingList.length})` },
              { k: "completed", l: `Terminés (${completedList.length})` },
              { k: "all", l: `Tous (${items.length})` },
            ] as const).map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={cn(
                  "squircle-full px-4 h-9 text-[13px] font-medium tap whitespace-nowrap transition-colors",
                  filter === f.k ? "bg-ink text-background" : "glass ring-inner text-ink-2 hover:text-ink"
                )}
              >
                {f.l}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <Card className="state-panel">
                <Calendar className="h-10 w-10 mx-auto text-ink-3 mb-3" />
                <p className="text-ink-3">Aucun rendez-vous dans cette catégorie.</p>
              </Card>
            )}
            {filtered.map((c) => {
              const p = profilesMap[c.patient_id];
              const initials = (p?.full_name ?? "P").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              const d = new Date(c.scheduled_at);
              const typeIcon =
                c.consultation_type === "in_person" ? MapPin :
                c.consultation_type === "home_visit" ? Phone : Video;
              const TIcon = typeIcon;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="squircle-lg glass ring-inner shadow-xs p-4 md:p-5 hover:shadow-md transition-all ease-spring"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-12 squircle bg-primary-soft text-primary grid place-items-center font-display font-semibold text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate">{p?.full_name ?? "Patient"}</div>
                          <div className="text-[13px] text-ink-3 truncate">{c.reason}</div>
                        </div>
                        <Badge className={cn("squircle-full px-2.5 py-0.5 text-[11px] font-medium border-0", statusTone[c.status] ?? "bg-muted text-ink-3")}>
                          {statusLabel[c.status] ?? c.status}
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex items-center gap-3 text-[12px] text-ink-3 tabular flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <TIcon className="h-3.5 w-3.5" />
                          {c.consultation_type === "in_person" ? "Cabinet" : c.consultation_type === "home_visit" ? "À domicile" : "Vidéo"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {c.status === "pending" && (
                          <Button size="sm" onClick={() => confirm(c.id)} className="squircle-full h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirmer
                          </Button>
                        )}
                        {c.consultation_type !== "in_person" && c.status !== "completed" && (
                          <Button asChild size="sm" variant="outline" className="squircle-full h-8 px-3 border-hairline">
                            <Link to="/dashboard/teleconsultation">
                              <Video className="h-3.5 w-3.5 mr-1.5" /> Démarrer
                            </Link>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="ghost" className="squircle-full h-8 px-3 text-ink-2">
                          <Link to="/dashboard/messages">
                            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Message
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(c)}
                          className="squircle-full h-8 px-3 text-primary hover:bg-primary-soft ml-auto"
                        >
                          {c.status === "completed" ? "Modifier" : "Compte rendu"}
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="patients">
          <div className="space-y-3">
            {filteredPatients.length === 0 && (
              <Card className="state-panel">
                <Users className="h-10 w-10 mx-auto text-ink-3 mb-3" />
                <p className="text-ink-3">Aucun patient à afficher.</p>
              </Card>
            )}
            {filteredPatients.map((p) => {
              const initials = (p.full_name ?? "P").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="squircle-lg glass ring-inner shadow-xs p-4 md:p-5 hover:shadow-md transition-all ease-spring"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 squircle bg-secondary-soft text-secondary grid place-items-center font-display font-semibold text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{p.full_name ?? "Patient anonyme"}</div>
                      <div className="text-[12.5px] text-ink-3 flex items-center gap-3 mt-0.5 flex-wrap">
                        {p.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                        {p.phone && <span className="tabular">{p.phone}</span>}
                        <span className="tabular">{p.visits} consult.</span>
                        {p.last_seen && (
                          <span className="tabular">
                            Dernière : {new Date(p.last_seen).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button asChild size="icon" variant="ghost" className="size-9 squircle text-ink-2 hover:text-primary hover:bg-primary-soft">
                        <Link to="/dashboard/messages" aria-label="Message"><MessageCircle className="h-4 w-4" /></Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost" className="size-9 squircle text-ink-2 hover:text-secondary hover:bg-secondary-soft">
                        <Link to="/dashboard/teleconsultation" aria-label="Vidéo"><Video className="h-4 w-4" /></Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost" className="size-9 squircle text-ink-2 hover:text-ink hover:bg-muted">
                        <Link to="/dashboard/consultations" aria-label="Dossier"><FileText className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compte rendu dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl squircle-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Compte rendu de consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type de consultation</Label>
                <Select value={form.consultation_type} onValueChange={(v) => setForm({ ...form, consultation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Spécialité</Label>
                <Input value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} placeholder="Ex. Médecine générale" />
              </div>
            </div>
            <div className="space-y-2"><Label>Symptômes observés</Label><Textarea value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} /></div>
            <div className="space-y-2"><Label>Diagnostic <span className="text-destructive">*</span></Label><Textarea value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div className="space-y-2"><Label>Actes réalisés</Label><Textarea value={form.procedures} onChange={(e) => setForm({ ...form, procedures: e.target.value })} /></div>
            <div className="space-y-2"><Label>Recommandations</Label><Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes internes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="fu">Suivi nécessaire</Label>
                <Switch id="fu" checked={form.follow_up_needed} onCheckedChange={(v) => setForm({ ...form, follow_up_needed: v })} />
              </div>
              {form.follow_up_needed && (
                <Input type="datetime-local" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Prescription (optionnel)</h3>
              <Input placeholder="Médicament" value={presc.name} onChange={(e) => setPresc({ ...presc, name: e.target.value })} />
              <Input placeholder="Posologie" value={presc.dosage} onChange={(e) => setPresc({ ...presc, dosage: e.target.value })} />
              <Input placeholder="Durée" value={presc.duration} onChange={(e) => setPresc({ ...presc, duration: e.target.value })} />
              <Textarea placeholder="Instructions" value={presc.instructions} onChange={(e) => setPresc({ ...presc, instructions: e.target.value })} />
            </div>
            <Button onClick={claimAndUpdate} className="w-full squircle-full h-11 bg-primary hover:bg-primary/90">
              Valider & clôturer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const QuickAction = ({ to, icon: Icon, label, desc, tone }: { to: string; icon: any; label: string; desc: string; tone: "primary" | "secondary" | "accent" }) => {
  const cls = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  }[tone];
  return (
    <Link
      to={to}
      className="group relative flex items-center justify-between gap-3 squircle-lg glass ring-inner shadow-xs p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("size-10 squircle grid place-items-center shrink-0", cls)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink">{label}</div>
          <div className="text-[12px] text-ink-3 truncate">{desc}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-3 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
};

const Stat = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "secondary" | "warning" }) => {
  const cls = {
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary-soft text-secondary",
    warning: "bg-warning-soft text-warning",
  }[tone];
  return (
    <div className="squircle-lg glass ring-inner shadow-xs p-4">
      <div className={cn("size-9 squircle grid place-items-center mb-2.5", cls)}>
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="font-display text-3xl tabular text-ink leading-none">{value}</div>
      <div className="text-[12px] text-ink-3 mt-1.5 font-medium">{label}</div>
    </div>
  );
};

export default DoctorSpace;
