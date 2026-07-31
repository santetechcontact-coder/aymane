import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Baby,
  BookOpen,
  CalendarDays,
  Check,
  HeartPulse,
  Plus,
  Ruler,
  Save,
  Scale,
  Syringe,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type View = "medications" | "pregnancy" | "cycle" | "children" | "education";

type MedicationSchedule = {
  id: string;
  medication_name: string;
  dosage: string;
  route: string | null;
  start_on: string;
  end_on: string | null;
  reminder_times: string[];
  active: boolean;
};

type PregnancyProfile = {
  last_menstrual_period: string;
  estimated_due_date: string;
  care_provider_name: string | null;
  starting_weight_kg: number | null;
  current_weight_kg: number | null;
  risk_notes: string | null;
  active: boolean;
};

type Cycle = {
  id: string;
  started_on: string;
  ended_on: string | null;
  flow_level: "light" | "medium" | "heavy" | null;
  symptoms: string[];
  notes: string | null;
};

type Dependent = {
  id: string;
  full_name: string;
  date_of_birth: string;
  relationship: string;
  gender: string | null;
  blood_group: string | null;
};

type GrowthRecord = {
  id: string;
  dependent_id: string;
  measured_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  head_circumference_cm: number | null;
  milestone_notes: string | null;
};

type ChildVaccination = {
  id: string;
  dependent_id: string;
  vaccine_name: string;
  dose_label: string | null;
  administered_on: string;
  next_due_on: string | null;
};

type HealthContent = {
  id: string;
  title: string;
  summary: string;
  category: string;
  media_url: string | null;
};

const views: { id: View; label: string; icon: typeof HeartPulse }[] = [
  { id: "medications", label: "Traitements", icon: Syringe },
  { id: "pregnancy", label: "Grossesse", icon: HeartPulse },
  { id: "cycle", label: "Cycle", icon: CalendarDays },
  { id: "children", label: "Enfants", icon: Baby },
  { id: "education", label: "Prévention", icon: BookOpen },
];

const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const CarePrograms = () => {
  const { user } = useAuth();
  const db: SupabaseClient = supabase;
  const [view, setView] = useState<View>("medications");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [medications, setMedications] = useState<MedicationSchedule[]>([]);
  const [pregnancy, setPregnancy] = useState<PregnancyProfile | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [childVaccinations, setChildVaccinations] = useState<ChildVaccination[]>([]);
  const [contents, setContents] = useState<HealthContent[]>([]);
  const [medicationForm, setMedicationForm] = useState({
    name: "",
    dosage: "",
    route: "orale",
    start: new Date().toISOString().slice(0, 10),
    end: "",
    time: "08:00",
  });
  const [pregnancyForm, setPregnancyForm] = useState({
    lastPeriod: "",
    provider: "",
    startingWeight: "",
    currentWeight: "",
    risks: "",
  });
  const [cycleForm, setCycleForm] = useState({
    startedOn: new Date().toISOString().slice(0, 10),
    endedOn: "",
    flow: "medium",
    symptoms: "",
  });
  const [childForm, setChildForm] = useState({
    fullName: "",
    birthDate: "",
    relationship: "Enfant",
    gender: "",
    bloodGroup: "",
  });
  const [selectedChildId, setSelectedChildId] = useState("");
  const [growthForm, setGrowthForm] = useState({
    measuredOn: new Date().toISOString().slice(0, 10),
    weight: "",
    height: "",
    head: "",
    milestone: "",
  });
  const [childVaccineForm, setChildVaccineForm] = useState({
    name: "",
    dose: "",
    date: new Date().toISOString().slice(0, 10),
    nextDate: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [meds, pregnancyResult, cycleResult, dependentResult, contentResult] = await Promise.all([
      db.from("medication_schedules").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
      db.from("pregnancy_profiles").select("*").eq("patient_id", user.id).maybeSingle(),
      db.from("menstrual_cycles").select("*").eq("patient_id", user.id).order("started_on", { ascending: false }).limit(24),
      db.from("dependents").select("*").eq("guardian_id", user.id).order("date_of_birth", { ascending: false }),
      db.from("health_contents").select("id, title, summary, category, media_url").eq("status", "published").order("publish_at", { ascending: false }).limit(12),
    ]);

    setMedications((meds.data ?? []) as MedicationSchedule[]);
    setPregnancy((pregnancyResult.data ?? null) as PregnancyProfile | null);
    setCycles((cycleResult.data ?? []) as Cycle[]);
    setDependents((dependentResult.data ?? []) as Dependent[]);
    const dependentIds = (dependentResult.data ?? []).map((item: Dependent) => item.id);
    if (dependentIds.length) {
      const [growthResult, vaccineResult] = await Promise.all([
        db.from("growth_records").select("*").in("dependent_id", dependentIds).order("measured_on", { ascending: false }),
        db.from("vaccinations").select("*").in("dependent_id", dependentIds).order("administered_on", { ascending: false }),
      ]);
      setGrowthRecords((growthResult.data ?? []) as GrowthRecord[]);
      setChildVaccinations((vaccineResult.data ?? []) as ChildVaccination[]);
      setSelectedChildId((current) => current || dependentIds[0]);
    } else {
      setGrowthRecords([]);
      setChildVaccinations([]);
      setSelectedChildId("");
    }
    setContents((contentResult.data ?? []) as HealthContent[]);
    if (pregnancyResult.data) {
      setPregnancyForm({
        lastPeriod: pregnancyResult.data.last_menstrual_period,
        provider: pregnancyResult.data.care_provider_name ?? "",
        startingWeight: pregnancyResult.data.starting_weight_kg?.toString() ?? "",
        currentWeight: pregnancyResult.data.current_weight_kg?.toString() ?? "",
        risks: pregnancyResult.data.risk_notes ?? "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Mes suivis santé — AYMANE";
    void load();
  }, [user]);

  const pregnancyWeek = useMemo(() => {
    if (!pregnancy?.last_menstrual_period) return null;
    const elapsed = Date.now() - new Date(`${pregnancy.last_menstrual_period}T12:00:00`).getTime();
    return Math.max(1, Math.min(42, Math.floor(elapsed / 604_800_000)));
  }, [pregnancy]);

  const cyclePrediction = useMemo(() => {
    if (cycles.length === 0) return null;
    const lengths = cycles
      .slice(0, 6)
      .map((cycle, index, list) => {
        const next = list[index + 1];
        return next
          ? Math.round(
              (new Date(`${cycle.started_on}T12:00:00`).getTime() -
                new Date(`${next.started_on}T12:00:00`).getTime()) /
                86_400_000,
            )
          : null;
      })
      .filter((value): value is number => Boolean(value && value >= 18 && value <= 45));
    const average = lengths.length
      ? Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length)
      : 28;
    const nextStart = addDays(cycles[0].started_on, average);
    return {
      average,
      nextStart,
      fertileStart: addDays(nextStart, -14),
      fertileEnd: addDays(nextStart, -10),
    };
  }, [cycles]);

  const addMedication = async () => {
    if (!user || medicationForm.name.trim().length < 2 || medicationForm.dosage.trim().length < 1) {
      toast({ title: "Informations manquantes", description: "Indiquez le médicament et la posologie.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("medication_schedules").insert({
      patient_id: user.id,
      medication_name: medicationForm.name.trim(),
      dosage: medicationForm.dosage.trim(),
      route: medicationForm.route,
      start_on: medicationForm.start,
      end_on: medicationForm.end || null,
      reminder_times: [`${medicationForm.time}:00`],
      active: true,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Traitement non enregistré", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    setMedicationForm((current) => ({ ...current, name: "", dosage: "", end: "" }));
    toast({ title: "Traitement ajouté", description: "Le rappel est prêt dans votre suivi." });
    await load();
  };

  const confirmIntake = async (schedule: MedicationSchedule) => {
    if (!user) return;
    const { error } = await db.from("medication_intakes").insert({
      schedule_id: schedule.id,
      patient_id: user.id,
      scheduled_for: new Date().toISOString(),
      status: "taken",
    });
    if (error) {
      toast({ title: "Prise déjà enregistrée", description: "Cette confirmation est déjà dans votre historique." });
      return;
    }
    toast({ title: "Prise confirmée", description: `${schedule.medication_name} a été ajouté à l’historique.` });
  };

  const savePregnancy = async () => {
    if (!user || !pregnancyForm.lastPeriod) {
      toast({ title: "Date requise", description: "Indiquez le premier jour des dernières règles.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("pregnancy_profiles").upsert({
      patient_id: user.id,
      last_menstrual_period: pregnancyForm.lastPeriod,
      estimated_due_date: addDays(pregnancyForm.lastPeriod, 280),
      care_provider_name: pregnancyForm.provider.trim() || null,
      starting_weight_kg: pregnancyForm.startingWeight ? Number(pregnancyForm.startingWeight) : null,
      current_weight_kg: pregnancyForm.currentWeight ? Number(pregnancyForm.currentWeight) : null,
      risk_notes: pregnancyForm.risks.trim() || null,
      active: true,
    }, { onConflict: "patient_id" });
    setWorking(false);
    if (error) {
      toast({ title: "Suivi non enregistré", description: "Vérifiez les informations saisies.", variant: "destructive" });
      return;
    }
    toast({ title: "Suivi grossesse mis à jour" });
    await load();
  };

  const addCycle = async () => {
    if (!user || !cycleForm.startedOn) return;
    setWorking(true);
    const { error } = await db.from("menstrual_cycles").upsert({
      patient_id: user.id,
      started_on: cycleForm.startedOn,
      ended_on: cycleForm.endedOn || null,
      flow_level: cycleForm.flow,
      symptoms: cycleForm.symptoms
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }, { onConflict: "patient_id,started_on" });
    setWorking(false);
    if (error) {
      toast({ title: "Cycle non enregistré", description: "Vérifiez les dates.", variant: "destructive" });
      return;
    }
    toast({ title: "Cycle ajouté à l’historique" });
    await load();
  };

  const addChild = async () => {
    if (!user || childForm.fullName.trim().length < 2 || !childForm.birthDate) {
      toast({ title: "Informations manquantes", description: "Indiquez le nom et la date de naissance.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("dependents").insert({
      guardian_id: user.id,
      full_name: childForm.fullName.trim(),
      date_of_birth: childForm.birthDate,
      relationship: childForm.relationship.trim(),
      gender: childForm.gender || null,
      blood_group: childForm.bloodGroup || null,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Profil enfant non créé", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    setChildForm({ fullName: "", birthDate: "", relationship: "Enfant", gender: "", bloodGroup: "" });
    toast({ title: "Profil enfant ajouté" });
    await load();
  };

  const addGrowthRecord = async () => {
    if (!selectedChildId || (!growthForm.weight && !growthForm.height && !growthForm.milestone.trim())) {
      toast({ title: "Mesure incomplète", description: "Ajoutez au moins une mesure ou une étape observée.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("growth_records").upsert({
      dependent_id: selectedChildId,
      measured_on: growthForm.measuredOn,
      weight_kg: growthForm.weight ? Number(growthForm.weight) : null,
      height_cm: growthForm.height ? Number(growthForm.height) : null,
      head_circumference_cm: growthForm.head ? Number(growthForm.head) : null,
      milestone_notes: growthForm.milestone.trim() || null,
    }, { onConflict: "dependent_id,measured_on" });
    setWorking(false);
    if (error) {
      toast({ title: "Suivi non enregistré", description: "Vérifiez les mesures indiquées.", variant: "destructive" });
      return;
    }
    setGrowthForm({ measuredOn: new Date().toISOString().slice(0, 10), weight: "", height: "", head: "", milestone: "" });
    toast({ title: "Croissance mise à jour" });
    await load();
  };

  const addChildVaccination = async () => {
    if (!user || !selectedChildId || childVaccineForm.name.trim().length < 2 || !childVaccineForm.date) {
      toast({ title: "Vaccin incomplet", description: "Indiquez le vaccin et la date.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("vaccinations").insert({
      patient_id: user.id,
      dependent_id: selectedChildId,
      vaccine_name: childVaccineForm.name.trim(),
      dose_label: childVaccineForm.dose.trim() || null,
      administered_on: childVaccineForm.date,
      next_due_on: childVaccineForm.nextDate || null,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Vaccin non enregistré", description: "Vérifiez les dates saisies.", variant: "destructive" });
      return;
    }
    setChildVaccineForm({ name: "", dose: "", date: new Date().toISOString().slice(0, 10), nextDate: "" });
    toast({ title: "Vaccin ajouté au carnet de l'enfant" });
    await load();
  };

  return (
    <DashboardLayout title="Mes suivis" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Santé au quotidien</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Des repères simples, au bon moment.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Traitements, grossesse, cycle et santé des enfants restent réunis dans un espace personnel.
        </p>
      </header>

      <nav className="mb-6 overflow-x-auto no-scrollbar" aria-label="Types de suivi">
        <div className="flex min-w-max gap-1 rounded-[0.9rem] bg-surface-1 p-1">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-[0.7rem] px-3 text-[12px] font-semibold transition",
                  view === item.id ? "bg-ink text-white shadow-sm" : "text-ink-3",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Chargement de vos suivis…</p></div>
      ) : (
        <>
          {view === "medications" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <EditorSection title="Ajouter un traitement" description="Un rappel quotidien peut être confirmé en un geste.">
                <FormGrid>
                  <Field label="Médicament">
                    <input className={inputClass} value={medicationForm.name} onChange={(event) => setMedicationForm({ ...medicationForm, name: event.target.value })} placeholder="Ex. Amoxicilline" />
                  </Field>
                  <Field label="Posologie">
                    <input className={inputClass} value={medicationForm.dosage} onChange={(event) => setMedicationForm({ ...medicationForm, dosage: event.target.value })} placeholder="Ex. 1 comprimé" />
                  </Field>
                  <Field label="Heure du rappel">
                    <input type="time" className={inputClass} value={medicationForm.time} onChange={(event) => setMedicationForm({ ...medicationForm, time: event.target.value })} />
                  </Field>
                  <Field label="Voie">
                    <select className={inputClass} value={medicationForm.route} onChange={(event) => setMedicationForm({ ...medicationForm, route: event.target.value })}>
                      <option value="orale">Orale</option>
                      <option value="cutanée">Cutanée</option>
                      <option value="inhalée">Inhalée</option>
                      <option value="injectable">Injectable</option>
                    </select>
                  </Field>
                  <Field label="Début">
                    <input type="date" className={inputClass} value={medicationForm.start} onChange={(event) => setMedicationForm({ ...medicationForm, start: event.target.value })} />
                  </Field>
                  <Field label="Fin">
                    <input type="date" className={inputClass} value={medicationForm.end} onChange={(event) => setMedicationForm({ ...medicationForm, end: event.target.value })} />
                  </Field>
                </FormGrid>
                <PrimaryButton disabled={working} onClick={() => void addMedication()} label="Ajouter le traitement" />
              </EditorSection>

              <ListSection title="Traitements actifs" count={medications.filter((item) => item.active).length}>
                {medications.length === 0 ? (
                  <Empty label="Aucun traitement enregistré." />
                ) : medications.map((medication) => (
                  <article key={medication.id} className="flex items-center gap-3 border-b border-hairline py-4 last:border-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary">
                      <Syringe className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{medication.medication_name}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-3">
                        {medication.dosage} · {medication.reminder_times?.[0]?.slice(0, 5) ?? "Sans rappel"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void confirmIntake(medication)}
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"
                      aria-label={`Confirmer la prise de ${medication.medication_name}`}
                      title="Confirmer la prise"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </article>
                ))}
              </ListSection>
            </div>
          )}

          {view === "pregnancy" && (
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <section className="rounded-[1rem] bg-ink p-5 text-white">
                <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-white/55">Repère actuel</p>
                <p className="mt-4 font-display text-5xl">{pregnancyWeek ? `${pregnancyWeek}e` : "—"}</p>
                <p className="mt-1 text-[14px] text-white/70">semaine de grossesse</p>
                <div className="mt-6 border-t border-white/15 pt-4">
                  <p className="text-[11px] text-white/55">Date prévue d’accouchement</p>
                  <p className="mt-1 text-[15px] font-semibold">
                    {pregnancy?.estimated_due_date ? formatDate(pregnancy.estimated_due_date) : "À calculer"}
                  </p>
                </div>
              </section>
              <EditorSection title="Mon suivi grossesse" description="Ces repères complètent, sans remplacer, le suivi de votre sage-femme ou médecin.">
                <FormGrid>
                  <Field label="Début des dernières règles">
                    <input type="date" className={inputClass} value={pregnancyForm.lastPeriod} onChange={(event) => setPregnancyForm({ ...pregnancyForm, lastPeriod: event.target.value })} />
                  </Field>
                  <Field label="Professionnel référent">
                    <input className={inputClass} value={pregnancyForm.provider} onChange={(event) => setPregnancyForm({ ...pregnancyForm, provider: event.target.value })} placeholder="Sage-femme ou médecin" />
                  </Field>
                  <Field label="Poids de départ (kg)">
                    <input type="number" inputMode="decimal" className={inputClass} value={pregnancyForm.startingWeight} onChange={(event) => setPregnancyForm({ ...pregnancyForm, startingWeight: event.target.value })} />
                  </Field>
                  <Field label="Poids actuel (kg)">
                    <input type="number" inputMode="decimal" className={inputClass} value={pregnancyForm.currentWeight} onChange={(event) => setPregnancyForm({ ...pregnancyForm, currentWeight: event.target.value })} />
                  </Field>
                </FormGrid>
                <Field label="Signes ou risques à surveiller">
                  <textarea className="min-h-24 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 py-2.5 text-[14px] outline-none focus:border-primary/50" value={pregnancyForm.risks} onChange={(event) => setPregnancyForm({ ...pregnancyForm, risks: event.target.value })} placeholder="Tension, douleurs, saignements, recommandations reçues…" />
                </Field>
                <PrimaryButton disabled={working} onClick={() => void savePregnancy()} label="Enregistrer le suivi" icon={Save} />
              </EditorSection>
            </div>
          )}

          {view === "cycle" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <EditorSection title="Ajouter un cycle" description="Les prévisions s’ajustent à partir de votre propre historique.">
                <FormGrid>
                  <Field label="Premier jour">
                    <input type="date" className={inputClass} value={cycleForm.startedOn} onChange={(event) => setCycleForm({ ...cycleForm, startedOn: event.target.value })} />
                  </Field>
                  <Field label="Dernier jour">
                    <input type="date" className={inputClass} value={cycleForm.endedOn} onChange={(event) => setCycleForm({ ...cycleForm, endedOn: event.target.value })} />
                  </Field>
                  <Field label="Flux">
                    <select className={inputClass} value={cycleForm.flow} onChange={(event) => setCycleForm({ ...cycleForm, flow: event.target.value })}>
                      <option value="light">Léger</option>
                      <option value="medium">Moyen</option>
                      <option value="heavy">Abondant</option>
                    </select>
                  </Field>
                  <Field label="Symptômes">
                    <input className={inputClass} value={cycleForm.symptoms} onChange={(event) => setCycleForm({ ...cycleForm, symptoms: event.target.value })} placeholder="Crampes, fatigue…" />
                  </Field>
                </FormGrid>
                <PrimaryButton disabled={working} onClick={() => void addCycle()} label="Ajouter à l’historique" />
              </EditorSection>

              <ListSection title="Prévisions et historique" count={cycles.length}>
                {cyclePrediction && (
                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-[0.9rem] bg-primary-soft p-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-primary/70">Prochain cycle</p>
                      <p className="mt-1 text-[14px] font-semibold text-primary">{formatDate(cyclePrediction.nextStart)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase text-primary/70">Fenêtre fertile estimée</p>
                      <p className="mt-1 text-[13px] font-semibold text-primary">
                        {formatDate(cyclePrediction.fertileStart)} - {formatDate(cyclePrediction.fertileEnd)}
                      </p>
                    </div>
                  </div>
                )}
                {cycles.length === 0 ? <Empty label="Aucun cycle enregistré." /> : cycles.map((cycle) => (
                  <div key={cycle.id} className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-0">
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">{formatDate(cycle.started_on)}</p>
                      <p className="text-[11.5px] text-ink-3">{cycle.symptoms.length ? cycle.symptoms.join(", ") : "Aucun symptôme indiqué"}</p>
                    </div>
                    <span className="text-[11px] font-medium text-ink-3">{cycle.ended_on ? formatDate(cycle.ended_on) : "En cours"}</span>
                  </div>
                ))}
              </ListSection>
            </div>
          )}

          {view === "children" && (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <EditorSection title="Ajouter un enfant" description="Chaque enfant garde ses propres repères de santé.">
                  <FormGrid>
                    <Field label="Nom complet">
                      <input className={inputClass} value={childForm.fullName} onChange={(event) => setChildForm({ ...childForm, fullName: event.target.value })} />
                    </Field>
                    <Field label="Date de naissance">
                      <input type="date" className={inputClass} value={childForm.birthDate} onChange={(event) => setChildForm({ ...childForm, birthDate: event.target.value })} />
                    </Field>
                    <Field label="Lien">
                      <input className={inputClass} value={childForm.relationship} onChange={(event) => setChildForm({ ...childForm, relationship: event.target.value })} />
                    </Field>
                    <Field label="Groupe sanguin">
                      <select className={inputClass} value={childForm.bloodGroup} onChange={(event) => setChildForm({ ...childForm, bloodGroup: event.target.value })}>
                        <option value="">Inconnu</option>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group} value={group}>{group}</option>)}
                      </select>
                    </Field>
                  </FormGrid>
                  <PrimaryButton disabled={working} onClick={() => void addChild()} label="Créer le profil enfant" />
                </EditorSection>
                <ListSection title="Profils rattachés" count={dependents.length}>
                  {dependents.length === 0 ? <Empty label="Aucun enfant rattaché." /> : dependents.map((dependent) => (
                    <button
                      type="button"
                      key={dependent.id}
                      onClick={() => setSelectedChildId(dependent.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-hairline py-4 text-left last:border-0",
                        selectedChildId === dependent.id && "text-primary",
                      )}
                    >
                      <span className={cn("grid size-10 place-items-center rounded-full", selectedChildId === dependent.id ? "bg-primary text-white" : "bg-secondary-soft text-secondary")}>
                        <Baby className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">{dependent.full_name}</p>
                        <p className="text-[12px] text-ink-3">Né(e) le {formatDate(dependent.date_of_birth)} · {dependent.relationship}</p>
                      </div>
                      {dependent.blood_group && <span className="rounded-full bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent">{dependent.blood_group}</span>}
                    </button>
                  ))}
                </ListSection>
              </div>

              {selectedChildId && (
                <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-primary">Carnet de croissance</p>
                      <h2 className="mt-1 font-display text-2xl text-ink">{dependents.find((item) => item.id === selectedChildId)?.full_name}</h2>
                    </div>
                    <span className="rounded-full bg-surface-1 px-2.5 py-1 text-[10.5px] font-semibold text-ink-3">
                      {growthRecords.filter((item) => item.dependent_id === selectedChildId).length} mesures
                    </span>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-[0.9rem] bg-surface-1 p-4">
                      <h3 className="text-[13px] font-semibold text-ink">Nouvelle mesure</h3>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <Field label="Date"><input type="date" className={inputClass} value={growthForm.measuredOn} onChange={(event) => setGrowthForm({ ...growthForm, measuredOn: event.target.value })} /></Field>
                        <Field label="Poids (kg)"><input type="number" inputMode="decimal" className={inputClass} value={growthForm.weight} onChange={(event) => setGrowthForm({ ...growthForm, weight: event.target.value })} /></Field>
                        <Field label="Taille (cm)"><input type="number" inputMode="decimal" className={inputClass} value={growthForm.height} onChange={(event) => setGrowthForm({ ...growthForm, height: event.target.value })} /></Field>
                        <Field label="Tour de tête (cm)"><input type="number" inputMode="decimal" className={inputClass} value={growthForm.head} onChange={(event) => setGrowthForm({ ...growthForm, head: event.target.value })} /></Field>
                      </div>
                      <Field label="Étape observée">
                        <input className={`${inputClass} mt-1.5`} value={growthForm.milestone} onChange={(event) => setGrowthForm({ ...growthForm, milestone: event.target.value })} placeholder="Ex. premiers pas, premiers mots" />
                      </Field>
                      <div className="mt-3"><PrimaryButton disabled={working} onClick={() => void addGrowthRecord()} label="Enregistrer la mesure" icon={Scale} /></div>
                    </div>

                    <div className="rounded-[0.9rem] bg-surface-1 p-4">
                      <h3 className="text-[13px] font-semibold text-ink">Vaccination de l'enfant</h3>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <Field label="Vaccin"><input className={inputClass} value={childVaccineForm.name} onChange={(event) => setChildVaccineForm({ ...childVaccineForm, name: event.target.value })} /></Field>
                        <Field label="Dose"><input className={inputClass} value={childVaccineForm.dose} onChange={(event) => setChildVaccineForm({ ...childVaccineForm, dose: event.target.value })} /></Field>
                        <Field label="Date reçue"><input type="date" className={inputClass} value={childVaccineForm.date} onChange={(event) => setChildVaccineForm({ ...childVaccineForm, date: event.target.value })} /></Field>
                        <Field label="Prochain rappel"><input type="date" className={inputClass} value={childVaccineForm.nextDate} onChange={(event) => setChildVaccineForm({ ...childVaccineForm, nextDate: event.target.value })} /></Field>
                      </div>
                      <div className="mt-3"><PrimaryButton disabled={working} onClick={() => void addChildVaccination()} label="Ajouter le vaccin" icon={Syringe} /></div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink"><Ruler className="h-3.5 w-3.5 text-primary" /> Historique de croissance</h3>
                      {growthRecords.filter((item) => item.dependent_id === selectedChildId).length === 0 ? <Empty label="Aucune mesure enregistrée." /> : growthRecords.filter((item) => item.dependent_id === selectedChildId).slice(0, 8).map((record) => (
                        <article key={record.id} className="flex items-start justify-between gap-3 border-b border-hairline py-3 last:border-0">
                          <div>
                            <p className="text-[12.5px] font-semibold text-ink">{formatDate(record.measured_on)}</p>
                            {record.milestone_notes && <p className="mt-0.5 text-[11.5px] text-ink-3">{record.milestone_notes}</p>}
                          </div>
                          <p className="text-right text-[11px] font-medium text-ink-2">{record.weight_kg ? `${record.weight_kg} kg` : ""}{record.weight_kg && record.height_cm ? " · " : ""}{record.height_cm ? `${record.height_cm} cm` : ""}</p>
                        </article>
                      ))}
                    </div>
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink"><Syringe className="h-3.5 w-3.5 text-primary" /> Vaccins</h3>
                      {childVaccinations.filter((item) => item.dependent_id === selectedChildId).length === 0 ? <Empty label="Aucun vaccin enregistré." /> : childVaccinations.filter((item) => item.dependent_id === selectedChildId).slice(0, 8).map((vaccine) => (
                        <article key={vaccine.id} className="flex items-start justify-between gap-3 border-b border-hairline py-3 last:border-0">
                          <div><p className="text-[12.5px] font-semibold text-ink">{vaccine.vaccine_name}</p><p className="text-[11px] text-ink-3">{vaccine.dose_label || "Dose"} · {formatDate(vaccine.administered_on)}</p></div>
                          {vaccine.next_due_on && <p className="text-right text-[10.5px] font-medium text-primary">Rappel<br />{formatDate(vaccine.next_due_on)}</p>}
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {view === "education" && (
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-ink-3">Sélection médicale</p>
                  <h2 className="mt-1 font-display text-2xl text-ink">Prévention utile</h2>
                </div>
                <span className="text-[12px] text-ink-3">{contents.length} contenus</span>
              </div>
              {contents.length === 0 ? (
                <Empty label="Les premiers contenus validés apparaîtront ici." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {contents.map((content) => (
                    <article key={content.id} className="rounded-[0.9rem] border border-hairline bg-surface-0 p-4">
                      <span className="inline-flex rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold uppercase text-primary">{content.category}</span>
                      <h3 className="mt-3 font-display text-[18px] leading-tight text-ink">{content.title}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{content.summary}</p>
                      {content.media_url && (
                        <a href={content.media_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                          Ouvrir le contenu
                          <BookOpen className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

const EditorSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
    <h2 className="font-display text-xl text-ink">{title}</h2>
    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{description}</p>
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

const ListSection = ({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) => (
  <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
    <div className="flex items-center justify-between">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <span className="text-[11px] text-ink-3">{count}</span>
    </div>
    <div className="mt-3">{children}</div>
  </section>
);

const FormGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2.5">{children}</div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="min-w-0">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</span>
    {children}
  </label>
);

const PrimaryButton = ({
  disabled,
  onClick,
  label,
  icon: Icon = Plus,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  icon?: typeof Plus;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50"
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const Empty = ({ label }: { label: string }) => (
  <div className="rounded-[0.8rem] border border-dashed border-hairline bg-surface-1 px-4 py-6 text-center">
    <p className="text-[13px] text-ink-3">{label}</p>
  </div>
);

export default CarePrograms;
