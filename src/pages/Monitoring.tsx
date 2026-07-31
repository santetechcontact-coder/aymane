import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, HeartPulse, Droplet, Wind, Thermometer, Scale, Gauge, Footprints,
  Syringe, Bluetooth, Watch, Smartphone, AlertTriangle, CheckCircle2, Bell,
  Plus, TrendingUp, TrendingDown, Sparkles, FileDown, Phone, Shield, Zap,
  ArrowUpRight, X,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip as RTooltip, CartesianGrid,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  VITAL_SPECS, evaluateStatus, generateMockSeries, analyzeTrend,
  STATUS_TONE, type VitalType, type VitalStatus,
} from "@/lib/vitals";

// ──────────────────────────────────────────────────────────────────────────────
// Iconographie
const ICON: Record<string, any> = {
  glucose: Droplet, insulin: Syringe, blood_pressure: Activity,
  heart_rate: HeartPulse, spo2: Wind, temperature: Thermometer,
  respiratory_rate: Wind, weight: Scale, bmi: Gauge, steps: Footprints,
};

const TONE_BG: Record<string, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  secondary: "from-secondary/15 to-secondary/5 text-secondary",
  accent: "from-accent/15 to-accent/5 text-accent",
  warning: "from-warning/15 to-warning/5 text-warning",
};

// ──────────────────────────────────────────────────────────────────────────────
// Carte vitale style Apple Health
function VitalCard({
  type, value, value2, deltaPct, sparkData, onClick,
}: {
  type: VitalType; value: number; value2?: number; deltaPct: number;
  sparkData: { v: number }[]; onClick: () => void;
}) {
  const spec = VITAL_SPECS[type];
  const Icon = ICON[type] ?? Activity;
  const status = evaluateStatus(type, value, value2);
  const tone = STATUS_TONE[status];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group text-left squircle-lg glass-strong ring-inner shadow-sm p-4 md:p-5 relative overflow-hidden"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", TONE_BG[spec.tone])} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("size-10 squircle grid place-items-center bg-white/70 backdrop-blur shadow-sm", `text-${spec.tone === "warning" ? "warning" : spec.tone}`)}>
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider px-2 py-0.5 squircle-full", tone.classes)}>
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {tone.label}
          </span>
        </div>
        <div className="text-[11.5px] font-mono uppercase tracking-widest text-ink-3">{spec.short}</div>
        <div className="font-display text-[28px] md:text-[32px] font-semibold text-ink leading-none mt-1.5">
          {spec.format(value, value2)}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[12px] text-ink-3">
          {deltaPct >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-success" /> : <TrendingDown className="h-3.5 w-3.5 text-accent" />}
          <span>{Math.abs(deltaPct).toFixed(1)}% vs hier</span>
        </div>

        <div className="h-12 -mx-1 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`g-${type}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={`hsl(var(--${spec.tone === "warning" ? "warning" : spec.tone}))`} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={`hsl(var(--${spec.tone === "warning" ? "warning" : spec.tone}))`} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="v" stroke={`hsl(var(--${spec.tone === "warning" ? "warning" : spec.tone}))`} strokeWidth={2} fill={`url(#g-${type})`} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal pour saisir une mesure
function NewReadingDialog({ patientId, defaultType, onSaved }: { patientId: string; defaultType?: VitalType; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<VitalType>(defaultType ?? "glucose");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const spec = VITAL_SPECS[type];

  async function save() {
    if (!value) { toast.error("Saisissez une valeur"); return; }
    setSaving(true);
    const v = parseFloat(value);
    const v2 = value2 ? parseFloat(value2) : null;
    const status = evaluateStatus(type, v, v2 ?? undefined);
    const { error } = await supabase.from("vital_readings").insert({
      patient_id: patientId, type, value: v, value_secondary: v2, unit: spec.unit, notes,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }

    if (status !== "normal") {
      const insight = analyzeTrend(type, [{ ts: Date.now(), v, v2: v2 ?? undefined }]);
      await supabase.from("health_alerts").insert({
        patient_id: patientId, vital_type: type, severity: status === "critical" ? "critical" : "warning",
        title: insight?.title ?? `${spec.label} à surveiller`,
        message: insight?.message ?? `Valeur notée : ${spec.format(v, v2 ?? undefined)}.`,
        value: v, unit: spec.unit,
      });
    }
    toast.success("Mesure enregistrée");
    setOpen(false); setValue(""); setValue2(""); setNotes(""); setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 squircle-full"><Plus className="h-4 w-4" /> Nouvelle mesure</Button>
      </DialogTrigger>
      <DialogContent className="squircle-xl">
        <DialogHeader><DialogTitle className="font-display">Enregistrer une constante</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type de mesure</Label>
            <Select value={type} onValueChange={(v) => setType(v as VitalType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(VITAL_SPECS).map((s) => (
                  <SelectItem key={s.type} value={s.type}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{type === "blood_pressure" ? "Systolique" : "Valeur"} ({spec.unit})</Label>
              <Input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            {type === "blood_pressure" && (
              <div>
                <Label>Diastolique ({spec.unit})</Label>
                <Input type="number" step="0.1" value={value2} onChange={(e) => setValue2(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <Label>Notes (optionnel)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: après le repas" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal d'injection d'insuline
function InsulinDialog({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [insulinType, setInsulinType] = useState("Rapide");
  const [dose, setDose] = useState("");
  const [site, setSite] = useState("Abdomen");

  async function save() {
    if (!dose) { toast.error("Dose requise"); return; }
    const { error } = await supabase.from("insulin_injections").insert({
      patient_id: patientId, insulin_type: insulinType, dose_units: parseFloat(dose), injection_site: site,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Injection enregistrée");
    setOpen(false); setDose(""); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 squircle-full"><Syringe className="h-4 w-4" /> Injection</Button>
      </DialogTrigger>
      <DialogContent className="squircle-xl">
        <DialogHeader><DialogTitle className="font-display">Enregistrer une injection</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type d'insuline</Label>
            <Select value={insulinType} onValueChange={setInsulinType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Rapide", "Lente", "Mixte", "Ultra-rapide"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dose (UI)</Label>
            <Input type="number" step="0.5" value={dose} onChange={(e) => setDose(e.target.value)} />
          </div>
          <div>
            <Label>Site</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Abdomen", "Cuisse", "Bras", "Fesses"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
type ReadingRow = { id: string; type: VitalType; value: number; value_secondary: number | null; measured_at: string; notes: string | null };
type AlertRow = { id: string; title: string; message: string; severity: "info" | "warning" | "critical"; vital_type: VitalType | null; created_at: string; resolved_at: string | null };
type InjectionRow = { id: string; insulin_type: string; dose_units: number; injection_site: string | null; injected_at: string };
type DeviceRow = { id: string; name: string; type: string; brand: string | null; last_sync_at: string | null; active: boolean };

const DEVICE_PRESETS = [
  { name: "Apple Watch Series 10", brand: "Apple", type: "smartwatch" as const, icon: Watch },
  { name: "Galaxy Watch 7", brand: "Samsung", type: "smartwatch" as const, icon: Watch },
  { name: "Huawei Watch GT 5", brand: "Huawei", type: "smartwatch" as const, icon: Watch },
  { name: "Fitbit Charge 6", brand: "Fitbit", type: "smartwatch" as const, icon: Watch },
  { name: "Accu-Chek Guide", brand: "Roche", type: "glucometer" as const, icon: Droplet },
  { name: "Omron M7", brand: "Omron", type: "blood_pressure_monitor" as const, icon: Activity },
  { name: "Oxymètre PO-100", brand: "Beurer", type: "oximeter" as const, icon: Wind },
];

// ──────────────────────────────────────────────────────────────────────────────
const Monitoring = () => {
  const { user } = useAuth();
  const patientId = user?.id ?? "";
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [injections, setInjections] = useState<InjectionRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!patientId) return;
    const [r, a, i, d] = await Promise.all([
      supabase.from("vital_readings").select("*").eq("patient_id", patientId).order("measured_at", { ascending: false }).limit(500),
      supabase.from("health_alerts").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      supabase.from("insulin_injections").select("*").eq("patient_id", patientId).order("injected_at", { ascending: false }).limit(50),
      supabase.from("connected_devices").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    ]);
    setReadings((r.data ?? []) as any);
    setAlerts((a.data ?? []) as any);
    setInjections((i.data ?? []) as any);
    setDevices((d.data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, [patientId]);

  // Realtime alerts
  useEffect(() => {
    if (!patientId) return;
    const ch = supabase
      .channel(`monitoring-${patientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "health_alerts", filter: `patient_id=eq.${patientId}` }, (p) => {
        const a = p.new as AlertRow;
        if (a.severity === "critical") toast.error(a.title, { description: a.message });
        else if (a.severity === "warning") toast.warning(a.title, { description: a.message });
        setAlerts((prev) => [a, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId]);

  const latest = useMemo(() => {
    const map: Partial<Record<VitalType, { value: number; value2?: number; ts: number }>> = {};
    for (const r of readings) {
      if (!map[r.type]) map[r.type] = { value: r.value, value2: r.value_secondary ?? undefined, ts: new Date(r.measured_at).getTime() };
    }
    (Object.keys(VITAL_SPECS) as VitalType[]).forEach(t => {
      if (!map[t]) {
        const series = generateMockSeries(t, 2);
        const last = series[series.length - 1];
        map[t] = { value: last.v, value2: last.v2, ts: last.ts };
      }
    });
    return map as Record<VitalType, { value: number; value2?: number; ts: number }>;
  }, [readings]);

  function seriesFor(type: VitalType, days = 14) {
    const real = readings.filter(r => r.type === type)
      .map(r => ({ ts: new Date(r.measured_at).getTime(), v: Number(r.value), v2: r.value_secondary ? Number(r.value_secondary) : undefined }))
      .reverse();
    if (real.length >= 6) return real;
    const mock = generateMockSeries(type, days);
    return [...mock, ...real];
  }

  // Score santé
  const healthScore = useMemo(() => {
    const types: VitalType[] = ["glucose", "blood_pressure", "heart_rate", "spo2", "temperature"];
    let total = 0; let count = 0;
    for (const t of types) {
      const l = latest[t]; if (!l) continue;
      const s = evaluateStatus(t, l.value, l.value2);
      total += s === "normal" ? 100 : s === "warning" ? 65 : 25;
      count++;
    }
    return count ? Math.round(total / count) : 0;
  }, [latest]);

  const unreadAlerts = alerts.filter(a => !a.resolved_at).length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.resolved_at);

  async function addDevice(preset: typeof DEVICE_PRESETS[number]) {
    const { error } = await supabase.from("connected_devices").insert({
      patient_id: patientId, name: preset.name, brand: preset.brand, type: preset.type, last_sync_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message); else { toast.success(`${preset.name} connecté`); load(); }
  }

  async function resolveAlert(id: string) {
    await supabase.from("health_alerts").update({ resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  function exportReport() {
    const lines = [
      `Rapport médical AYMANE - ${format(new Date(), "PPP", { locale: fr })}`,
      `Patient: ${user?.email}`,
      `Score santé: ${healthScore}/100`,
      "",
      "── Dernières constantes ──",
      ...(Object.keys(VITAL_SPECS) as VitalType[]).map(t => {
        const l = latest[t]; if (!l) return "";
        return `${VITAL_SPECS[t].label}: ${VITAL_SPECS[t].format(l.value, l.value2)}`;
      }).filter(Boolean),
      "",
      "── Alertes actives ──",
      ...alerts.filter(a => !a.resolved_at).map(a => `[${a.severity.toUpperCase()}] ${a.title} — ${a.message}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `aymane-rapport-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport téléchargé");
  }

  if (loading) {
    return <DashboardLayout title="Surveillance Santé"><div className="state-panel">Chargement de vos mesures…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout
      title="Surveillance Santé"
      mobileAction={<NewReadingDialog patientId={patientId} onSaved={load} />}
    >
      {/* ─── Hero score santé + actions ─── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="squircle-xl glass-strong ring-inner shadow-md p-5 md:p-7 mb-5 md:mb-7 relative overflow-hidden"
      >
        <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
          <div className="flex items-center gap-4">
            <div className="relative size-24 md:size-28 grid place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--surface-2))" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={`hsl(var(--${healthScore >= 80 ? "secondary" : healthScore >= 60 ? "warning" : "accent"}))`}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 276} 276`}
                  initial={{ strokeDasharray: "0 276" }}
                  animate={{ strokeDasharray: `${(healthScore / 100) * 276} 276` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="text-center">
                <div className="font-display text-[28px] font-bold text-ink leading-none">{healthScore}</div>
                <div className="text-[9.5px] font-mono uppercase tracking-widest text-ink-3 mt-1">/100</div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3">Niveau de vigilance</div>
              <div className="font-display text-[22px] font-semibold text-ink mt-0.5">
                {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "À surveiller" : "Attention"}
              </div>
              <div className="text-[13px] text-ink-3 mt-1 max-w-md">
                Synthèse en temps réel de vos constantes vitales. Mise à jour il y a quelques secondes.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <Stat icon={Bell} label="Alertes actives" value={String(unreadAlerts)} tone={unreadAlerts > 0 ? "accent" : "secondary"} />
            <Stat icon={Bluetooth} label="Appareils" value={String(devices.length)} tone="primary" />
            <Stat icon={Activity} label="Mesures 7j" value={String(readings.filter(r => Date.now() - new Date(r.measured_at).getTime() < 7 * 86400000).length)} tone="secondary" />
          </div>

          <div className="hidden md:flex flex-col gap-2">
            <NewReadingDialog patientId={patientId} onSaved={load} />
            <Button variant="outline" className="gap-2 squircle-full" onClick={exportReport}><FileDown className="h-4 w-4" /> Rapport</Button>
          </div>
        </div>

        {criticalAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mt-5 squircle-lg bg-accent-soft border border-accent/20 p-4 flex items-start gap-3">
            <div className="size-9 squircle bg-accent text-accent-foreground grid place-items-center shrink-0 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-semibold text-accent">{criticalAlerts[0].title}</div>
              <div className="text-[13px] text-ink-2 mt-0.5">{criticalAlerts[0].message}</div>
            </div>
            <Button size="sm" variant="destructive" className="gap-1.5 squircle-full">
              <Phone className="h-3.5 w-3.5" /> Urgences
            </Button>
          </motion.div>
        )}
      </motion.section>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="squircle-full bg-surface-1 p-1 h-auto flex-wrap gap-0.5 mb-5">
          {[
            { v: "dashboard", l: "Vue d'ensemble" },
            { v: "diabetes", l: "Diabète" },
            { v: "cardio", l: "Cardio · Tension" },
            { v: "alerts", l: `Alertes${unreadAlerts ? ` (${unreadAlerts})` : ""}` },
            { v: "devices", l: "Objets connectés" },
            { v: "history", l: "Historique" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="squircle-full data-[state=active]:bg-surface-0 data-[state=active]:shadow-sm text-[12.5px] px-3.5">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Vue d'ensemble ─── */}
        <TabsContent value="dashboard" className="space-y-5 mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {(["heart_rate", "blood_pressure", "spo2", "glucose", "temperature", "respiratory_rate", "steps", "weight"] as VitalType[]).map(t => {
              const l = latest[t];
              const series = seriesFor(t, 7).slice(-12).map(s => ({ v: s.v }));
              const prev = seriesFor(t, 14)[seriesFor(t, 14).length - 6]?.v ?? l.value;
              const delta = ((l.value - prev) / prev) * 100;
              return (
                <VitalCard key={t} type={t} value={l.value} value2={l.value2} deltaPct={delta} sparkData={series} onClick={() => {}} />
              );
            })}
          </div>

          <div className="squircle-xl glass-strong ring-inner shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-9 squircle bg-gradient-to-br from-primary to-secondary text-white grid place-items-center shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-[16px] font-semibold text-ink">Repères de suivi</div>
                <div className="text-[12px] text-ink-3">Signaux utiles pour préparer la prochaine action</div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(["heart_rate", "blood_pressure", "spo2", "glucose"] as VitalType[]).map(t => {
                const insight = analyzeTrend(t, seriesFor(t, 7));
                if (!insight) return null;
                return (
                  <div key={t} className="squircle-lg bg-surface-1/60 p-4 flex gap-3">
                    <div className={cn(
                      "size-8 squircle grid place-items-center shrink-0",
                      insight.severity === "critical" ? "bg-accent text-accent-foreground" :
                      insight.severity === "warning" ? "bg-warning text-warning-foreground" :
                      "bg-secondary text-secondary-foreground"
                    )}>
                      {insight.severity === "info" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[13.5px] text-ink">{insight.title}</div>
                      <div className="text-[12.5px] text-ink-3 mt-0.5">{insight.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ─── Diabète ─── */}
        <TabsContent value="diabetes" className="space-y-5 mt-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-display text-[20px] font-semibold text-ink">Suivi Diabète</div>
              <div className="text-[13px] text-ink-3">Glycémie, insuline, tendances et rappels utiles</div>
            </div>
            <div className="flex gap-2">
              <NewReadingDialog patientId={patientId} defaultType="glucose" onSaved={load} />
              <InsulinDialog patientId={patientId} onSaved={load} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <BigStat label="Moyenne 7j" value={`${(seriesFor("glucose", 7).reduce((a, b) => a + b.v, 0) / seriesFor("glucose", 7).length).toFixed(0)} mg/dL`} tone="primary" />
            <BigStat label="Hypo (7j)" value={String(seriesFor("glucose", 7).filter(s => s.v < 70).length)} tone="accent" />
            <BigStat label="Hyper (7j)" value={String(seriesFor("glucose", 7).filter(s => s.v > 180).length)} tone="warning" />
          </div>

          <div className="squircle-xl glass-strong ring-inner shadow-sm p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-[16px] font-semibold">Courbe glycémique · 14 jours</div>
              <Badge variant="outline" className="font-mono text-[10px]">cible 80-130 mg/dL</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesFor("glucose", 14).map(s => ({ ...s, date: format(s.ts, "dd/MM") }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-2))" />
                  <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--ink-3))" />
                  <YAxis fontSize={11} stroke="hsl(var(--ink-3))" domain={[40, 280]} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--hairline))" }} />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--warning))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="squircle-xl glass-strong ring-inner shadow-sm p-4 md:p-5">
            <div className="font-display text-[16px] font-semibold mb-3">Injections récentes</div>
            {injections.length === 0 ? (
              <div className="text-[13px] text-ink-3 text-center py-8">Aucune injection enregistrée</div>
            ) : (
              <div className="divide-y divide-hairline">
                {injections.slice(0, 8).map(i => (
                  <div key={i.id} className="flex items-center gap-3 py-2.5">
                    <div className="size-8 squircle bg-primary-soft text-primary grid place-items-center"><Syringe className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-ink">{i.insulin_type} · {i.dose_units} UI</div>
                      <div className="text-[11.5px] text-ink-3">{i.injection_site} · {format(new Date(i.injected_at), "PPp", { locale: fr })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Cardio ─── */}
        <TabsContent value="cardio" className="space-y-5 mt-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-display text-[20px] font-semibold text-ink">Cardio · Tension</div>
              <div className="text-[13px] text-ink-3">Surveillance rapprochée tension et rythme cardiaque</div>
            </div>
            <NewReadingDialog patientId={patientId} defaultType="blood_pressure" onSaved={load} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="squircle-xl glass-strong ring-inner shadow-sm p-5">
              <div className="font-display text-[16px] font-semibold mb-3">Tension artérielle · 14j</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesFor("blood_pressure", 14).map(s => ({ ...s, date: format(s.ts, "dd/MM") }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-2))" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--ink-3))" />
                    <YAxis fontSize={11} stroke="hsl(var(--ink-3))" />
                    <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--hairline))" }} />
                    <Line type="monotone" dataKey="v" name="Sys" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="v2" name="Dia" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="squircle-xl glass-strong ring-inner shadow-sm p-5">
              <div className="font-display text-[16px] font-semibold mb-3">Fréquence cardiaque · 14j</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesFor("heart_rate", 14).map(s => ({ ...s, date: format(s.ts, "dd/MM") }))}>
                    <defs>
                      <linearGradient id="hr" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-2))" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--ink-3))" />
                    <YAxis fontSize={11} stroke="hsl(var(--ink-3))" />
                    <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--hairline))" }} />
                    <Area type="monotone" dataKey="v" stroke="hsl(var(--accent))" fill="url(#hr)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Alertes ─── */}
        <TabsContent value="alerts" className="space-y-3 mt-0">
          {alerts.length === 0 ? (
            <div className="state-panel">
              <CheckCircle2 className="h-10 w-10 text-secondary mx-auto mb-3" />
              <div className="font-display text-[18px] font-semibold">Aucune alerte</div>
              <div className="text-[13px] text-ink-3 mt-1">Vos constantes sont dans les normes.</div>
            </div>
          ) : alerts.map(a => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={cn(
                "squircle-lg ring-inner shadow-sm p-4 flex items-start gap-3 glass-strong",
                a.resolved_at && "opacity-60"
              )}>
              <div className={cn(
                "size-10 squircle grid place-items-center shrink-0",
                a.severity === "critical" ? "bg-accent text-accent-foreground" :
                a.severity === "warning" ? "bg-warning text-warning-foreground" :
                "bg-primary text-primary-foreground"
              )}>
                {a.severity === "critical" ? <Zap className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-[15px] font-semibold text-ink">{a.title}</span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase">{a.severity}</Badge>
                  {a.resolved_at && <Badge variant="secondary" className="text-[10px]">Résolue</Badge>}
                </div>
                <div className="text-[13px] text-ink-2 mt-1">{a.message}</div>
                <div className="text-[11px] text-ink-3 mt-1">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}</div>
              </div>
              {!a.resolved_at && (
                <Button size="sm" variant="ghost" onClick={() => resolveAlert(a.id)} className="squircle-full">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </TabsContent>

        {/* ─── Devices ─── */}
        <TabsContent value="devices" className="space-y-5 mt-0">
          <div className="squircle-xl glass-strong ring-inner shadow-sm p-5">
            <div className="font-display text-[16px] font-semibold mb-3">Mes appareils connectés</div>
            {devices.length === 0 ? (
              <div className="text-[13px] text-ink-3 text-center py-6">Aucun appareil connecté</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {devices.map(d => (
                  <div key={d.id} className="squircle-lg bg-surface-1/60 p-4 flex items-center gap-3">
                    <div className="size-10 squircle bg-primary text-primary-foreground grid place-items-center"><Bluetooth className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13.5px] text-ink truncate">{d.name}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {d.brand} · {d.last_sync_at ? `Synchro ${formatDistanceToNow(new Date(d.last_sync_at), { addSuffix: true, locale: fr })}` : "Jamais"}
                      </div>
                    </div>
                    <Switch checked={d.active} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="squircle-xl glass-strong ring-inner shadow-sm p-5">
            <div className="font-display text-[16px] font-semibold mb-3">Ajouter un appareil compatible</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DEVICE_PRESETS.map(p => {
                const Icon = p.icon;
                return (
                  <button key={p.name} onClick={() => addDevice(p)}
                    className="squircle-lg bg-surface-1/60 hover:bg-surface-1 p-4 flex flex-col items-start gap-2 transition-colors text-left">
                    <div className="size-9 squircle bg-gradient-to-br from-primary/20 to-secondary/20 text-primary grid place-items-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-[13px] text-ink">{p.name}</div>
                      <div className="text-[11px] text-ink-3">{p.brand}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="squircle-xl bg-primary-soft/50 p-5 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-[13.5px] text-ink">Données chiffrées de bout en bout</div>
              <div className="text-[12px] text-ink-3 mt-0.5">Vos données vitales sont chiffrées et accessibles uniquement par vous et votre médecin référent.</div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Historique ─── */}
        <TabsContent value="history" className="mt-0">
          <div className="squircle-xl glass-strong ring-inner shadow-sm overflow-hidden">
            <div className="p-5 border-b border-hairline flex items-center justify-between">
              <div>
                <div className="font-display text-[16px] font-semibold">Historique des mesures</div>
                <div className="text-[12px] text-ink-3">{readings.length} mesures enregistrées</div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 squircle-full" onClick={exportReport}>
                <FileDown className="h-3.5 w-3.5" /> Exporter
              </Button>
            </div>
            {readings.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-ink-3">Aucune mesure encore enregistrée. Saisissez votre première mesure pour commencer.</div>
            ) : (
              <div className="divide-y divide-hairline max-h-[500px] overflow-y-auto">
                {readings.map(r => {
                  const spec = VITAL_SPECS[r.type];
                  const Icon = ICON[r.type] ?? Activity;
                  const status = evaluateStatus(r.type, r.value, r.value_secondary ?? undefined);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-4">
                      <div className={cn("size-9 squircle grid place-items-center", `bg-${spec.tone === "warning" ? "warning" : spec.tone}-soft text-${spec.tone === "warning" ? "warning" : spec.tone}`)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium text-ink">{spec.label} · {spec.format(r.value, r.value_secondary ?? undefined)}</div>
                        <div className="text-[11.5px] text-ink-3">{format(new Date(r.measured_at), "PPp", { locale: fr })} {r.notes && `· ${r.notes}`}</div>
                      </div>
                      <Badge className={cn("text-[10px]", STATUS_TONE[status].classes)}>{STATUS_TONE[status].label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

// ─── Sous-composants ──────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "secondary" | "accent" | "warning" }) {
  const toneCls = { primary: "text-primary bg-primary-soft", secondary: "text-secondary bg-secondary-soft", accent: "text-accent bg-accent-soft", warning: "text-warning bg-warning-soft" }[tone];
  return (
    <div className="squircle-lg bg-surface-0/70 backdrop-blur p-3 md:p-4">
      <div className={cn("size-8 squircle grid place-items-center mb-2", toneCls)}><Icon className="h-4 w-4" /></div>
      <div className="font-display text-[20px] md:text-[22px] font-semibold leading-none">{value}</div>
      <div className="text-[11px] text-ink-3 mt-1">{label}</div>
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone: "primary" | "secondary" | "accent" | "warning" }) {
  const toneCls = { primary: "text-primary", secondary: "text-secondary", accent: "text-accent", warning: "text-warning" }[tone];
  return (
    <div className="squircle-lg glass-strong ring-inner shadow-sm p-5">
      <div className="text-[11.5px] font-mono uppercase tracking-widest text-ink-3">{label}</div>
      <div className={cn("font-display text-[28px] font-semibold mt-1.5", toneCls)}>{value}</div>
    </div>
  );
}

export default Monitoring;
