import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Brain,
  Loader2,
  Pill,
  Search,
  Siren,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TriageResult {
  urgency: "low" | "moderate" | "high" | "emergency";
  recommended_speciality: string;
  consultation_mode: "self_care" | "teleconsultation" | "in_person" | "home_visit" | "emergency_room";
  summary: string;
  differential: { condition: string; likelihood: "low" | "medium" | "high"; rationale: string }[];
  red_flags: string[];
  suggested_exams: string[];
  advice: string;
}

const URGENCY: Record<TriageResult["urgency"], { label: string; cls: string; ring: string; dot: string }> = {
  low: { label: "Faible", cls: "bg-secondary-soft text-secondary", ring: "ring-secondary/30", dot: "bg-secondary" },
  moderate: { label: "Modérée", cls: "bg-warning-soft text-warning", ring: "ring-warning/40", dot: "bg-warning" },
  high: { label: "Élevée", cls: "bg-warning-soft text-warning", ring: "ring-warning/50", dot: "bg-warning" },
  emergency: { label: "URGENCE", cls: "bg-accent-soft text-accent", ring: "ring-accent/50", dot: "bg-accent" },
};

const MODE: Record<TriageResult["consultation_mode"], { label: string; icon: typeof Stethoscope; cta: string; to: string }> = {
  self_care: { label: "Conseils à la maison", icon: HeartPulse, cta: "Voir mes consignes", to: "/dashboard" },
  teleconsultation: { label: "Téléconsultation", icon: Stethoscope, cta: "Trouver un médecin", to: "/dashboard/directory" },
  in_person: { label: "Consultation physique", icon: Stethoscope, cta: "Annuaire des soignants", to: "/dashboard/directory" },
  home_visit: { label: "Visite à domicile", icon: Stethoscope, cta: "Demander une visite", to: "/dashboard/directory" },
  emergency_room: { label: "Service d'urgence", icon: Siren, cta: "Lancer une alerte SOS", to: "/dashboard/sos" },
};

const SUGGESTIONS = [
  "Fièvre depuis 2 jours",
  "Maux de tête persistants",
  "Toux sèche et fatigue",
  "Douleur abdominale",
  "Tension artérielle élevée",
  "Plaie qui ne cicatrise pas",
];

const formSchema = z.object({
  symptoms: z.string().trim().min(5, "Décrivez vos symptômes (5 caractères min).").max(2000),
  age: z.string().trim().max(3).optional().or(z.literal("")),
  sex: z.string().max(10).optional().or(z.literal("")),
  duration: z.string().trim().max(60).optional().or(z.literal("")),
  history: z.string().trim().max(1000).optional().or(z.literal("")),
});

const ORIENTATION_WAIT_MS = 2200;

const buildLocalOrientation = (payload: z.infer<typeof formSchema>): TriageResult => {
  const symptoms = payload.symptoms.toLowerCase();
  const history = (payload.history ?? "").toLowerCase();
  const combined = `${symptoms} ${history}`;
  const has = (...words: string[]) => words.some((word) => combined.includes(word));

  if (has("douleur thoracique", "respire mal", "difficulté à respirer", "perte de connaissance", "saignement abondant", "convulsion", "avc")) {
    return {
      urgency: "emergency",
      recommended_speciality: "Urgences",
      consultation_mode: "emergency_room",
      summary: "Certains signes peuvent demander une prise en charge immédiate.",
      differential: [
        { condition: "Urgence médicale possible", likelihood: "high", rationale: "Les symptômes décrits font partie des signaux qui doivent être évalués rapidement." },
        { condition: "Besoin de surveillance rapprochée", likelihood: "medium", rationale: "La situation peut évoluer vite sans examen clinique." },
      ],
      red_flags: ["Difficulté à respirer", "Douleur thoracique", "Perte de connaissance", "Saignement important"],
      suggested_exams: ["Constantes vitales", "Examen clinique rapide"],
      advice: "Appelez les secours ou allez au service d'urgence le plus proche. Si possible, restez accompagné.",
    };
  }

  if (has("enfant", "bébé", "bebe", "nourrisson") && has("fièvre", "fievre", "39", "40")) {
    return {
      urgency: "high",
      recommended_speciality: "Pédiatrie",
      consultation_mode: "in_person",
      summary: "La fièvre chez un enfant doit être évaluée avec attention, surtout si elle dure ou s'aggrave.",
      differential: [
        { condition: "Infection courante", likelihood: "medium", rationale: "La fièvre et la fatigue sont fréquentes dans les infections." },
        { condition: "Déshydratation possible", likelihood: "medium", rationale: "Chez l'enfant, il faut surveiller les apports et l'état général." },
      ],
      red_flags: ["Somnolence inhabituelle", "Difficulté à boire", "Respiration difficile", "Fièvre qui monte malgré les mesures habituelles"],
      suggested_exams: ["Température", "Examen pédiatrique", "Test rapide selon contexte"],
      advice: "Consultez un pédiatre, un centre de santé ou un poste de santé aujourd'hui. Gardez l'enfant hydraté et surveillez son état général.",
    };
  }

  if (has("tension", "hypertension", "vertige", "maux de tête", "mal de tête")) {
    return {
      urgency: has("très élevée", "tres elevee", "18", "180") ? "high" : "moderate",
      recommended_speciality: "Médecine générale",
      consultation_mode: "in_person",
      summary: "Les symptômes décrits méritent un contrôle des constantes et un avis médical si cela persiste.",
      differential: [
        { condition: "Tension artérielle élevée", likelihood: "medium", rationale: "Les maux de tête ou vertiges peuvent accompagner une tension haute." },
        { condition: "Fatigue ou déshydratation", likelihood: "low", rationale: "Ces facteurs peuvent aussi provoquer des symptômes proches." },
      ],
      red_flags: ["Douleur thoracique", "Trouble de la parole", "Faiblesse d'un côté du corps", "Essoufflement"],
      suggested_exams: ["Prise de tension", "Glycémie", "Consultation médicale"],
      advice: "Mesurez votre tension si possible. Si les symptômes sont forts ou nouveaux, consultez rapidement.",
    };
  }

  if (has("ordonnance", "médicament", "medicament", "pharmacie")) {
    return {
      urgency: "low",
      recommended_speciality: "Pharmacie",
      consultation_mode: "self_care",
      summary: "Le besoin semble surtout lié à un médicament ou une ordonnance à préparer.",
      differential: [
        { condition: "Recherche de disponibilité", likelihood: "high", rationale: "Les mots utilisés concernent le stock ou la prise de médicament." },
      ],
      red_flags: ["Allergie connue", "Effet indésirable", "Aggravation des symptômes"],
      suggested_exams: [],
      advice: "Vérifiez le stock en pharmacie et gardez l'ordonnance accessible. Demandez un avis si le traitement n'est pas clair.",
    };
  }

  return {
    urgency: "moderate",
    recommended_speciality: "Médecine générale",
    consultation_mode: "teleconsultation",
    summary: "Les informations données permettent une première orientation, mais un professionnel doit confirmer si les symptômes persistent.",
    differential: [
      { condition: "Problème de santé courant", likelihood: "medium", rationale: "Les symptômes ne suffisent pas à conclure sans examen." },
      { condition: "Besoin d'avis médical", likelihood: "medium", rationale: "Un échange avec un soignant permettra de préciser la suite." },
    ],
    red_flags: ["Douleur intense", "Fièvre très élevée", "Difficulté à respirer", "Aggravation rapide"],
    suggested_exams: ["Prise des constantes", "Consultation selon évolution"],
    advice: "Surveillez l'évolution. Si cela dure, s'aggrave ou vous inquiète, prenez rendez-vous avec un soignant.",
  };
};

const Triage = () => {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [form, setForm] = useState({ symptoms: initialQ, age: "", sex: "", duration: "", history: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  useEffect(() => {
    document.title = "Orientation santé · AYMANE";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute(
      "content",
      "Décrivez vos symptômes et recevez une orientation claire : niveau d'urgence, spécialité recommandée et prochaine étape.",
    );
    if (!meta.parentNode) document.head.appendChild(meta);

    if (initialQ.trim().length >= 5) {
      void analyze({ ...form, symptoms: initialQ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = async (payload: typeof form) => {
    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      toast({ title: "Information manquante", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    let response: Awaited<ReturnType<typeof supabase.functions.invoke>> | { data: null; error: unknown };
    try {
      response = await Promise.race([
        supabase.functions.invoke("symptom-triage", { body: parsed.data }),
        new Promise<{ data: null; error: unknown }>((resolve) => {
          window.setTimeout(() => resolve({ data: null, error: true }), ORIENTATION_WAIT_MS);
        }),
      ]);
    } catch {
      response = { data: null, error: true };
    }
    setLoading(false);
    const { data, error } = response;
    if (error || (data as any)?.error) {
      setResult(buildLocalOrientation(parsed.data));
      toast({ title: "Orientation préparée", description: "On continue avec les informations disponibles." });
      requestAnimationFrame(() => {
        document.getElementById("triage-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    setResult((data as any).result);
    requestAnimationFrame(() => {
      document.getElementById("triage-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(form.symptoms ? { q: form.symptoms } : {}, { replace: true });
    void analyze(form);
  };

  const reset = () => {
    setResult(null);
    setForm({ symptoms: "", age: "", sex: "", duration: "", history: "" });
    setParams({}, { replace: true });
  };

  const mode = result ? MODE[result.consultation_mode] : null;
  const urgency = result ? URGENCY[result.urgency] : null;

  const steps = useMemo(() => {
    if (!result) return [];
    const s = [
      { label: "Symptômes analysés", done: true, icon: Brain },
      { label: `Spécialité : ${result.recommended_speciality}`, done: true, icon: Stethoscope },
      { label: mode!.label, done: false, icon: mode!.icon },
    ];
    if (result.urgency === "emergency") {
      s.push({ label: "Alerte SOS recommandée", done: false, icon: Siren });
    } else {
      s.push({ label: "Préparer son dossier médical", done: false, icon: HeartPulse });
    }
    return s;
  }, [result, mode]);

  return (
    <div className="app-page-gradient min-h-[100dvh]">
      <Navbar />

      <main id="main-content" className="relative pt-24 md:pt-28 pb-20">
        <div className="relative px-5 md:px-8 max-w-5xl mx-auto">
          {/* Header */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink mb-5 underline-magnetic"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'accueil
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex glass squircle-full px-3 py-1.5 items-center gap-2 text-[12px] text-ink-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              Orientation rapide · Aide à la décision
            </div>
            <h1 className="font-display text-4xl md:text-6xl tracking-display leading-[1] text-ink mt-5 text-balance">
              Décrivez vos symptômes,{" "}
              <span className="text-gradient-primary">on vous guide.</span>
            </h1>
            <p className="text-ink-3 text-[15.5px] md:text-base mt-4 max-w-2xl leading-relaxed">
              Une première orientation pour savoir s'il faut surveiller, appeler, prendre rendez-vous ou aller consulter.
              Cet outil ne remplace pas un professionnel de santé.
            </p>
          </motion.div>

          {/* Form card */}
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 squircle-xl glass-strong ring-inner p-5 md:p-7 shadow-md"
          >
            <div className="space-y-2">
              <Label htmlFor="triage-symptoms" className="text-[13px] text-ink-2">Vos symptômes *</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink-4" strokeWidth={2.2} />
                <Textarea
                  id="triage-symptoms"
                  rows={3}
                  maxLength={2000}
                  placeholder="ex : fièvre 39°, maux de tête et fatigue depuis hier soir…"
                  value={form.symptoms}
                  onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                  className="pl-10 squircle-lg bg-surface-0/70 border-hairline resize-none text-[15px]"
                />
              </div>
              {!form.symptoms && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, symptoms: s })}
                      className="text-[12px] squircle-full px-3 py-1.5 bg-surface-1 hover:bg-surface-2 text-ink-2 border border-hairline tap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-ink-3">Age</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  placeholder="34"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="squircle bg-surface-0/70 border-hairline"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-ink-3">Sexe</Label>
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger className="squircle bg-surface-0/70 border-hairline">
                    <SelectValue placeholder="Non indiqué" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Féminin</SelectItem>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-[12px] text-ink-3">Depuis combien de temps ?</Label>
                <Input
                  placeholder="ex : 2 jours"
                  maxLength={60}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="squircle bg-surface-0/70 border-hairline"
                />
              </div>
            </div>

            <div className="space-y-1.5 mt-4">
              <Label htmlFor="triage-history" className="text-[12px] text-ink-3">Antécédents / traitements en cours (optionnel)</Label>
              <Textarea
                id="triage-history"
                rows={2}
                maxLength={1000}
                placeholder="ex : hypertension, diabète, allergie pénicilline…"
                value={form.history}
                onChange={(e) => setForm({ ...form, history: e.target.value })}
                className="squircle bg-surface-0/70 border-hairline resize-none text-[14px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-pill bg-ink text-white h-12 px-6 text-[15px] flex-1 sm:flex-none shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" /> Recevoir une orientation
                  </>
                )}
              </button>
              {(result || form.symptoms) && (
                <button
                  type="button"
                  onClick={reset}
                  className="btn-pill glass h-12 px-5 text-[14px] text-ink"
                >
                  Effacer
                </button>
              )}
            </div>

            <p className="text-[11.5px] text-ink-4 mt-4 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.2} />
              <span>
                Outil d'orientation, pas de diagnostic. En cas de signes graves (douleur thoracique, perte de
                conscience, saignement abondant…), appelez immédiatement les secours.
              </span>
            </p>
          </motion.form>

          {/* Results */}
          <div id="triage-result" className="mt-10 scroll-mt-24">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="squircle-xl glass ring-inner p-10 text-center"
                >
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-ink-2">On prépare votre orientation santé...</p>
                </motion.div>
              )}

              {result && urgency && mode && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  {/* Urgency banner */}
                  <div className={cn("squircle-xl ring-1 p-6 md:p-7 relative overflow-hidden", urgency.cls, urgency.ring)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="label">Niveau d'urgence</span>
                      <span className="label">{mode.label}</span>
                    </div>
                    <div className="font-display text-3xl md:text-4xl tracking-display flex items-center gap-3">
                      {result.urgency === "emergency" && <AlertTriangle className="h-7 w-7" />}
                      {urgency.label}
                    </div>
                    <p className="text-[15px] mt-3 opacity-90 leading-relaxed">{result.summary}</p>

                    <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                      <Link
                        to={mode.to}
                        className="btn-pill bg-ink text-white h-11 px-5 text-[14px] hover:bg-ink-2"
                      >
                        <mode.icon className="h-4 w-4" />
                        {mode.cta}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      {result.urgency === "emergency" ? (
                        <Link to="/dashboard/sos" className="btn-pill bg-accent text-accent-foreground h-11 px-5 text-[14px]">
                          <Siren className="h-4 w-4" /> Alerte SOS
                        </Link>
                      ) : (
                        <Link to="/dashboard/directory" className="btn-pill glass h-11 px-5 text-[14px] text-ink">
                          <Stethoscope className="h-4 w-4" /> Voir l'annuaire
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Care pathway */}
                  <div className="squircle-lg glass ring-inner p-5 md:p-6">
                    <p className="label text-primary mb-4">Ce qu'il faut faire ensuite</p>
                    <ol className="relative border-l border-hairline ml-2 space-y-4">
                      {steps.map((s, i) => (
                        <li key={i} className="pl-5 relative">
                          <span
                            className={cn(
                              "absolute -left-[9px] top-0.5 size-4 rounded-full ring-4 ring-background flex items-center justify-center",
                              s.done ? "bg-secondary" : "bg-primary",
                            )}
                          >
                            <span className="size-1.5 rounded-full bg-white" />
                          </span>
                          <div className="flex items-center gap-2 text-ink">
                            <s.icon className="h-4 w-4 text-ink-3" strokeWidth={2.2} />
                            <span className="text-[14.5px] font-medium">{s.label}</span>
                          </div>
                          <p className="text-[12px] text-ink-3 mt-0.5">
                            {s.done ? "Étape complétée" : "Prochaine étape"}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Speciality + differential */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="squircle-lg glass ring-inner p-5">
                      <p className="label text-ink-3 mb-2">Spécialité recommandée</p>
                      <div className="flex items-center gap-3">
                        <div className="size-10 squircle bg-primary-soft text-primary flex items-center justify-center">
                          <Stethoscope className="h-5 w-5" strokeWidth={2.4} />
                        </div>
                        <div className="font-display text-2xl tracking-headline text-ink">
                          {result.recommended_speciality}
                        </div>
                      </div>
                      <Link
                        to={`/dashboard/directory?spec=${encodeURIComponent(result.recommended_speciality)}`}
                        className="mt-4 inline-flex items-center gap-1 text-[13px] text-primary underline-magnetic"
                      >
                        Voir les soignants disponibles <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {result.differential.length > 0 && (
                      <div className="squircle-lg glass ring-inner p-5">
                        <p className="label text-ink-3 mb-3">Pistes possibles</p>
                        <ul className="space-y-2.5">
                          {result.differential.slice(0, 4).map((d, i) => (
                            <li key={i} className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[14px] text-ink truncate">{d.condition}</p>
                                <p className="text-[12px] text-ink-3 line-clamp-2">{d.rationale}</p>
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 squircle shrink-0",
                                  d.likelihood === "high"
                                    ? "bg-primary-soft text-primary"
                                    : d.likelihood === "medium"
                                      ? "bg-warning-soft text-warning"
                                      : "bg-surface-2 text-ink-3",
                                )}
                              >
                                {d.likelihood === "high" ? "Probable" : d.likelihood === "medium" ? "Possible" : "Faible"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Red flags */}
                  {result.red_flags.length > 0 && (
                    <div className="squircle-lg p-5 bg-accent-soft border border-accent/20">
                      <p className="label text-accent mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" /> Signes à surveiller
                      </p>
                      <ul className="space-y-1.5">
                        {result.red_flags.map((r, i) => (
                          <li key={i} className="text-[14px] text-ink flex items-start gap-2">
                            <span className="text-accent mt-1">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[12px] text-ink-3 mt-3">
                        Si l'un de ces signes apparaît, consultez sans tarder ou lancez une alerte SOS.
                      </p>
                    </div>
                  )}

                  {/* Exams */}
                  {result.suggested_exams.length > 0 && (
                    <div className="squircle-lg glass ring-inner p-5">
                      <p className="label text-ink-3 mb-3 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" /> Examens à envisager
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.suggested_exams.map((e, i) => (
                          <span key={i} className="text-[12.5px] squircle-full px-3 py-1.5 bg-surface-1 text-ink-2 border border-hairline">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advice */}
                  <div className="squircle-lg glass-strong ring-inner p-6">
                    <p className="label text-primary mb-2">À faire maintenant</p>
                    <p className="text-[15px] text-ink leading-relaxed">{result.advice}</p>
                  </div>

                  {/* Next steps shortcuts */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { to: "/dashboard/directory", icon: Stethoscope, label: "Trouver un soignant" },
                      { to: "/dashboard/pharmacy", icon: Pill, label: "Pharmacie proche" },
                      { to: "/dashboard/sos", icon: Siren, label: "Urgence SOS" },
                    ].map((a) => (
                      <Link
                        key={a.to}
                        to={a.to}
                        className="group squircle-lg glass ring-inner p-4 flex items-center gap-3 tap hover:shadow-md transition-shadow"
                      >
                        <div className="size-10 squircle bg-surface-1 text-ink-2 flex items-center justify-center group-hover:bg-primary-soft group-hover:text-primary transition-colors">
                          <a.icon className="h-5 w-5" strokeWidth={2.3} />
                        </div>
                        <span className="text-[14px] font-medium text-ink flex-1">{a.label}</span>
                        <ArrowUpRight className="h-4 w-4 text-ink-4 group-hover:text-ink" />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Triage;
