// Constantes vitales — référentiels cliniques + génération mock + moteur d'analyse
import type { Database } from "@/integrations/supabase/types";

export type VitalType = Database["public"]["Enums"]["vital_type"];
export type AlertSeverity = Database["public"]["Enums"]["alert_severity"];

export type VitalStatus = "normal" | "warning" | "critical";

export interface VitalSpec {
  type: VitalType;
  label: string;
  short: string;
  unit: string;
  unitSecondary?: string;
  icon: string; // lucide name (utilisé via map ailleurs)
  tone: "primary" | "secondary" | "accent" | "warning";
  ranges: {
    criticalLow?: number;
    warnLow?: number;
    warnHigh?: number;
    criticalHigh?: number;
    target?: [number, number];
  };
  format: (v: number, v2?: number) => string;
}

export const VITAL_SPECS: Record<VitalType, VitalSpec> = {
  glucose: {
    type: "glucose", label: "Glycémie", short: "Glycémie", unit: "mg/dL",
    icon: "Droplet", tone: "warning",
    ranges: { criticalLow: 54, warnLow: 70, warnHigh: 180, criticalHigh: 250, target: [80, 130] },
    format: (v) => `${v.toFixed(0)} mg/dL`,
  },
  insulin: {
    type: "insulin", label: "Insuline", short: "Insuline", unit: "UI",
    icon: "Syringe", tone: "primary",
    ranges: {},
    format: (v) => `${v.toFixed(1)} UI`,
  },
  blood_pressure: {
    type: "blood_pressure", label: "Tension artérielle", short: "Tension", unit: "mmHg", unitSecondary: "mmHg",
    icon: "Activity", tone: "accent",
    ranges: { criticalLow: 80, warnLow: 100, warnHigh: 140, criticalHigh: 180, target: [110, 130] },
    format: (v, v2) => `${v.toFixed(0)}/${(v2 ?? 0).toFixed(0)}`,
  },
  heart_rate: {
    type: "heart_rate", label: "Fréquence cardiaque", short: "FC", unit: "bpm",
    icon: "HeartPulse", tone: "accent",
    ranges: { criticalLow: 40, warnLow: 50, warnHigh: 100, criticalHigh: 130, target: [60, 90] },
    format: (v) => `${v.toFixed(0)} bpm`,
  },
  spo2: {
    type: "spo2", label: "Saturation O₂", short: "SpO₂", unit: "%",
    icon: "Wind", tone: "secondary",
    ranges: { criticalLow: 88, warnLow: 92, warnHigh: 100, target: [95, 100] },
    format: (v) => `${v.toFixed(0)}%`,
  },
  temperature: {
    type: "temperature", label: "Température", short: "Temp.", unit: "°C",
    icon: "Thermometer", tone: "warning",
    ranges: { criticalLow: 35, warnLow: 36, warnHigh: 38, criticalHigh: 39.5, target: [36.5, 37.5] },
    format: (v) => `${v.toFixed(1)}°C`,
  },
  respiratory_rate: {
    type: "respiratory_rate", label: "Fréquence respiratoire", short: "FR", unit: "/min",
    icon: "Wind", tone: "secondary",
    ranges: { criticalLow: 8, warnLow: 12, warnHigh: 20, criticalHigh: 28, target: [12, 18] },
    format: (v) => `${v.toFixed(0)} /min`,
  },
  weight: {
    type: "weight", label: "Poids", short: "Poids", unit: "kg",
    icon: "Scale", tone: "primary",
    ranges: {},
    format: (v) => `${v.toFixed(1)} kg`,
  },
  bmi: {
    type: "bmi", label: "IMC", short: "IMC", unit: "kg/m²",
    icon: "Gauge", tone: "primary",
    ranges: { criticalLow: 16, warnLow: 18.5, warnHigh: 25, criticalHigh: 30, target: [18.5, 25] },
    format: (v) => `${v.toFixed(1)}`,
  },
  steps: {
    type: "steps", label: "Activité", short: "Pas", unit: "pas",
    icon: "Footprints", tone: "secondary",
    ranges: { warnLow: 3000, target: [8000, 12000] },
    format: (v) => `${Math.round(v).toLocaleString("fr-FR")}`,
  },
};

export function evaluateStatus(type: VitalType, value: number, value2?: number): VitalStatus {
  const r = VITAL_SPECS[type].ranges;
  // Pour la tension, on utilise systolique (value) en priorité
  const v = value;
  if (r.criticalLow !== undefined && v <= r.criticalLow) return "critical";
  if (r.criticalHigh !== undefined && v >= r.criticalHigh) return "critical";
  if (r.warnLow !== undefined && v < r.warnLow) return "warning";
  if (r.warnHigh !== undefined && v > r.warnHigh) return "warning";
  if (type === "blood_pressure" && value2 !== undefined) {
    if (value2 >= 110) return "critical";
    if (value2 >= 90) return "warning";
    if (value2 < 60) return "warning";
  }
  return "normal";
}

export const STATUS_TONE: Record<VitalStatus, { label: string; classes: string; dot: string }> = {
  normal:   { label: "Normal",   classes: "bg-success-soft text-success",   dot: "bg-success" },
  warning:  { label: "Attention",classes: "bg-warning-soft text-warning",   dot: "bg-warning" },
  critical: { label: "Critique", classes: "bg-accent-soft text-accent",     dot: "bg-accent" },
};

// Genere une serie locale pour les ecrans de suivi sans donnees recentes.
export function generateMockSeries(type: VitalType, days = 14): { ts: number; v: number; v2?: number }[] {
  const spec = VITAL_SPECS[type];
  const target = spec.ranges.target ?? [70, 100];
  const center = (target[0] + target[1]) / 2;
  const amp = (target[1] - target[0]) * 0.6;
  const out: { ts: number; v: number; v2?: number }[] = [];
  const now = Date.now();
  const points = type === "blood_pressure" || type === "weight" ? days * 2 : days * 4;
  for (let i = points; i >= 0; i--) {
    const ts = now - i * (days * 86400000) / points;
    const noise = (Math.sin(i / 3) + Math.sin(i / 7) * 0.5 + (Math.random() - 0.5) * 0.8) * amp;
    let v = center + noise;
    let v2: number | undefined;
    if (type === "blood_pressure") { v2 = (v * 0.65) + (Math.random() - 0.5) * 6; }
    if (type === "steps") v = Math.max(0, 6000 + Math.sin(i / 2) * 4000 + Math.random() * 3000);
    if (type === "spo2") v = Math.min(100, 96 + Math.random() * 3);
    if (type === "temperature") v = 36.6 + (Math.random() - 0.5) * 0.8;
    out.push({ ts, v: Number(v.toFixed(1)), v2: v2 ? Number(v2.toFixed(1)) : undefined });
  }
  return out;
}

export interface AiInsight {
  severity: AlertSeverity;
  title: string;
  message: string;
}

export function analyzeTrend(type: VitalType, series: { ts: number; v: number; v2?: number }[]): AiInsight | null {
  if (series.length < 4) return null;
  const last = series[series.length - 1];
  const prev = series.slice(-7);
  const avg = prev.reduce((a, b) => a + b.v, 0) / prev.length;
  const status = evaluateStatus(type, last.v, last.v2);
  const spec = VITAL_SPECS[type];

  if (status === "critical") {
    if (type === "spo2") return { severity: "critical", title: "SpO₂ critique", message: `Saturation à ${last.v}% — consultez immédiatement un médecin ou les urgences.` };
    if (type === "blood_pressure") return { severity: "critical", title: "Crise hypertensive possible", message: `Tension à ${spec.format(last.v, last.v2)} — risque AVC, contactez les secours.` };
    if (type === "glucose") return { severity: "critical", title: "Glycémie critique", message: `Valeur ${last.v} mg/dL — risque hypo/hyperglycémie sévère.` };
    return { severity: "critical", title: `${spec.label} critique`, message: `Valeur ${spec.format(last.v, last.v2)} hors seuil critique.` };
  }
  if (status === "warning") {
    if (avg > (spec.ranges.warnHigh ?? Infinity)) {
      return { severity: "warning", title: `${spec.label} élevée depuis plusieurs jours`, message: `Moyenne 7j: ${spec.format(avg)}. Prenez rendez-vous avec votre médecin.` };
    }
    return { severity: "warning", title: `${spec.label} en alerte`, message: `Valeur ${spec.format(last.v, last.v2)} hors plage cible.` };
  }
  return { severity: "info", title: `${spec.label} stable`, message: `Tendance normale, continuez ainsi.` };
}
