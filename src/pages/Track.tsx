import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Ambulance,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logo from "@/assets/aymane-logo.png";

type PublicStatus = {
  status: "open" | "dispatched" | "resolved" | string;
  severity: string;
  emergency_type: string;
  location: string;
  created_at: string;
  dispatched_at: string | null;
  resolved_at: string | null;
  eta_minutes: number | null;
};

const steps = [
  { key: "open", label: "Alerte reçue", icon: Siren },
  { key: "dispatched", label: "Secours en route", icon: Ambulance },
  { key: "resolved", label: "Prise en charge", icon: CheckCircle2 },
] as const;

const severityLabel: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

const stepIndex = (status: string) => Math.max(0, steps.findIndex((step) => step.key === status));

const Track = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!token) return;
    const { data: rows, error } = await supabase.rpc("get_emergency_public_status", { _token: token });
    if (error || !rows || (rows as unknown[]).length === 0) {
      setNotFound(true);
      setData(null);
    } else {
      setData((rows as PublicStatus[])[0]);
      setNotFound(false);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    document.title = "Suivi SOS — AYMANE";
    void load();
  }, [load]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => void load(), 15_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [load]);

  if (loading) {
    return (
      <main id="main-content" className="min-h-[100dvh] bg-background px-4 py-20">
        <div className="mx-auto max-w-xl animate-pulse">
          <div className="h-8 w-36 rounded-[0.7rem] bg-surface-2" />
          <div className="mt-10 h-56 rounded-[1rem] border border-hairline bg-surface-0" />
        </div>
      </main>
    );
  }

  if (notFound || !data) {
    return (
      <main id="main-content" className="min-h-[100dvh] bg-background px-4 py-16 grid place-items-center">
        <section className="w-full max-w-md border-t-2 border-accent bg-surface-0 p-6 shadow-sm">
          <ShieldAlert className="h-6 w-6 text-accent" strokeWidth={2.3} />
          <h1 className="mt-5 font-display text-3xl text-ink">Lien de suivi indisponible.</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
            Cette alerte est introuvable ou le lien a expiré. Demandez un nouveau lien à la personne qui a lancé le SOS.
          </p>
          <Link to="/" className="btn-pill mt-6 h-11 bg-ink text-white text-[13px] font-semibold">
            Retour à l’accueil
          </Link>
        </section>
      </main>
    );
  }

  const activeIndex = stepIndex(data.status);
  const progress = data.status === "resolved" ? 100 : data.status === "dispatched" ? 66 : 33;
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(data.created_at).getTime()) / 60_000));

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="px-4 sm:px-6 border-b border-hairline bg-surface-0">
        <div className="mx-auto max-w-3xl h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="AYMANE" className="h-7 w-auto object-contain" />
            <span className="font-display text-[15px]">AYMANE</span>
          </Link>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink-3 hover:text-ink tap">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-4 border-b border-hairline pb-6">
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-accent">Suivi de l’alerte SOS</p>
              <h1 className="mt-3 font-display text-3xl md:text-4xl text-ink">{data.emergency_type}</h1>
              <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-3">
                <MapPin className="h-4 w-4 text-primary" />
                {data.location}
              </p>
            </div>
            <span className={cn(
              "rounded-[0.55rem] px-2.5 py-1 text-[11px] font-semibold",
              data.status === "resolved" && "bg-secondary-soft text-secondary",
              data.status === "dispatched" && "bg-primary-soft text-primary",
              data.status === "open" && "bg-accent-soft text-accent",
            )}>
              {data.status === "resolved" ? "Prise en charge" : data.status === "dispatched" ? "Secours en route" : "Alerte reçue"}
            </span>
          </div>

          <section className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center rounded-[1rem] border border-hairline bg-surface-0 p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-[0.75rem] bg-primary-soft text-primary grid place-items-center">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11.5px] text-ink-3">Estimation d’arrivée</p>
                <p className="mt-1 font-display text-2xl text-ink">
                  {data.status === "resolved"
                    ? "Pris en charge"
                    : data.eta_minutes != null
                      ? `Environ ${data.eta_minutes} min`
                      : "En attente d’estimation"}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] text-ink-4">Temps écoulé</p>
              <p className="mt-1 font-mono text-[14px] font-semibold tabular text-ink">{elapsedMinutes} min</p>
            </div>
            <div className="sm:col-span-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </section>

          <ol className="mt-8 border-y border-hairline divide-y divide-hairline">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const reached = index <= activeIndex;
              return (
                <li key={step.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4">
                  <span className={cn(
                    "size-9 rounded-[0.7rem] grid place-items-center",
                    reached ? "bg-ink text-white" : "bg-surface-1 text-ink-4",
                  )}>
                    <Icon className="h-4 w-4" strokeWidth={2.3} />
                  </span>
                  <div>
                    <p className={cn("text-[13.5px] font-semibold", reached ? "text-ink" : "text-ink-4")}>{step.label}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-4">
                      {step.key === "open" && new Date(data.created_at).toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit" })}
                      {step.key === "dispatched" && (data.dispatched_at ? new Date(data.dispatched_at).toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit" }) : "En attente")}
                      {step.key === "resolved" && (data.resolved_at ? new Date(data.resolved_at).toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit" }) : "En attente")}
                    </p>
                  </div>
                  {reached ? <CheckCircle2 className="h-4 w-4 text-secondary" strokeWidth={2.5} /> : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex items-start gap-3 rounded-[0.85rem] bg-surface-1 p-4">
            <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed text-ink-3">
              Gravité signalée : <span className="font-semibold text-ink">{severityLabel[data.severity] ?? data.severity}</span>.
              Cette page se met à jour automatiquement et n’affiche aucune donnée médicale personnelle.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Track;
