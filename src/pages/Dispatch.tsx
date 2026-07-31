import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Siren,
  MapPin,
  Clock,
  Ambulance,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RefreshCcw,
  Radio,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate } from "react-router-dom";

type Emergency = {
  id: string;
  patient_id: string;
  emergency_type: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "dispatched" | "resolved" | "cancelled";
  created_at: string;
  resolved_at: string | null;
  responder_id: string | null;
};

const SEVERITY: Record<Emergency["severity"], { label: string; cls: string; ring: string; rank: number }> = {
  critical: { label: "Critique", cls: "bg-accent text-accent-foreground", ring: "ring-accent/40", rank: 0 },
  high: { label: "Élevée", cls: "bg-warning text-warning-foreground", ring: "ring-warning/40", rank: 1 },
  medium: { label: "Moyenne", cls: "bg-primary text-primary-foreground", ring: "ring-primary/40", rank: 2 },
  low: { label: "Faible", cls: "bg-secondary text-secondary-foreground", ring: "ring-secondary/40", rank: 3 },
};

const STATUS: Record<Emergency["status"], { label: string; cls: string; dot: string }> = {
  open: { label: "Nouvelle", cls: "bg-warning-soft text-warning", dot: "bg-warning" },
  dispatched: { label: "Secours en route", cls: "bg-primary-soft text-primary", dot: "bg-primary" },
  resolved: { label: "Résolue", cls: "bg-secondary-soft text-secondary", dot: "bg-secondary" },
  cancelled: { label: "Annulée", cls: "bg-surface-2 text-ink-3", dot: "bg-ink-4" },
};

const elapsed = (iso: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h ${m % 60} min`;
};

const Dispatch = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Emergency[]>([]);
  const [statusFilter, setStatusFilter] = useState<"active" | Emergency["status"] | "all">("active");
  const [severityFilter, setSeverityFilter] = useState<"all" | Emergency["severity"]>("all");
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const isDispatcher = hasRole("doctor") || hasRole("admin");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("emergencies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as Emergency[]);
  };

  useEffect(() => {
    document.title = "SOS en cours · AYMANE";
    if (!user || !isDispatcher) return;
    load();
    const channel = supabase
      .channel("emergencies-dispatch")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergencies" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as Emergency;
          setItems((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
          toast({
            title: `Nouvelle alerte · ${SEVERITY[row.severity].label}`,
            description: `${row.emergency_type} — ${row.location}`,
          });
          if ("vibrate" in navigator) navigator.vibrate?.([60, 40, 120]);
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as Emergency;
          setItems((prev) => prev.map((p) => (p.id === row.id ? row : p)));
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          setItems((prev) => prev.filter((p) => p.id !== old.id));
        }
      })
      .subscribe();

    // Refresh elapsed labels every 30s
    const interval = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDispatcher]);

  const update = async (id: string, patch: Partial<Emergency>) => {
    const { error } = await supabase.from("emergencies").update(patch as any).eq("id", id);
    if (error) toast({ title: "Mise à jour impossible", description: error.message, variant: "destructive" });
  };

  const dispatchEmergency = (e: Emergency) =>
    update(e.id, { status: "dispatched", responder_id: user!.id } as any);
  const resolveEmergency = (e: Emergency) =>
    update(e.id, { status: "resolved", resolved_at: new Date().toISOString() } as any);

  const filtered = useMemo(() => {
    return items
      .filter((e) =>
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? e.status === "open" || e.status === "dispatched"
            : e.status === statusFilter,
      )
      .filter((e) => (severityFilter === "all" ? true : e.severity === severityFilter))
      .sort((a, b) => {
        // active first, then by severity rank, then by recency
        const aActive = a.status === "open" || a.status === "dispatched" ? 0 : 1;
        const bActive = b.status === "open" || b.status === "dispatched" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        const sev = SEVERITY[a.severity].rank - SEVERITY[b.severity].rank;
        if (sev !== 0) return sev;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [items, statusFilter, severityFilter]);

  const stats = useMemo(() => {
    const open = items.filter((i) => i.status === "open").length;
    const dispatched = items.filter((i) => i.status === "dispatched").length;
    const critical = items.filter(
      (i) => (i.status === "open" || i.status === "dispatched") && i.severity === "critical",
    ).length;
    const today = items.filter(
      (i) => new Date(i.created_at).toDateString() === new Date().toDateString(),
    ).length;
    return { open, dispatched, critical, today };
  }, [items]);

  if (authLoading) {
    return (
      <DashboardLayout title="SOS en cours">
        <div className="text-ink-3 text-sm">Chargement…</div>
      </DashboardLayout>
    );
  }

  if (!isDispatcher) {
    return <Navigate to="/dashboard/sos" replace />;
  }

  return (
    <DashboardLayout title="SOS en cours">
      <PageHeader
        eyebrow="Urgences · temps réel"
        title="SOS"
        italic="en cours."
        description="Suivez les alertes envoyées par les patients : heure, niveau de gravité et position partagée."
        actions={
          <button
            onClick={load}
            className="btn-pill glass h-10 px-4 text-[13px] text-ink"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Rafraîchir
          </button>
        }
      />

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Nouvelles", value: stats.open, icon: Siren, tone: "bg-warning-soft text-warning" },
          { label: "En cours", value: stats.dispatched, icon: Ambulance, tone: "bg-primary-soft text-primary" },
          { label: "Critiques actives", value: stats.critical, icon: AlertTriangle, tone: "bg-accent-soft text-accent" },
          { label: "Aujourd'hui", value: stats.today, icon: Clock, tone: "bg-secondary-soft text-secondary" },
        ].map((s) => (
          <div key={s.label} className="squircle-lg glass ring-inner p-4">
            <div className="flex items-center justify-between">
              <span className="label text-ink-3">{s.label}</span>
              <div className={cn("size-8 squircle flex items-center justify-center", s.tone)}>
                <s.icon className="h-4 w-4" strokeWidth={2.4} />
              </div>
            </div>
            <p className="font-display text-3xl tracking-display tabular text-ink mt-2">{s.value}</p>
          </div>
        ))}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 mr-2">
          <Filter className="h-3.5 w-3.5" /> Filtres
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-9 w-44 squircle text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actives (en cours)</SelectItem>
            <SelectItem value="open">Nouvelles</SelectItem>
            <SelectItem value="dispatched">Secours en route</SelectItem>
            <SelectItem value="resolved">Résolues</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
          <SelectTrigger className="h-9 w-44 squircle text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes gravités</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Élevée</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-secondary">
          <Radio className="h-3.5 w-3.5 animate-pulse" /> Connecté · temps réel
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="state-panel">Chargement des alertes…</div>
      ) : filtered.length === 0 ? (
        <div className="state-panel">
          <Siren className="h-8 w-8 text-ink-4 mx-auto mb-3" strokeWidth={1.6} />
          <p className="text-ink-3">Aucune alerte correspondant à ces filtres.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((e) => {
              const sev = SEVERITY[e.severity];
              const stat = STATUS[e.status];
              const active = e.status === "open" || e.status === "dispatched";
              const mapsHref = e.latitude != null && e.longitude != null
                ? `https://www.google.com/maps?q=${e.latitude},${e.longitude}`
                : `https://www.google.com/maps/search/${encodeURIComponent(e.location)}`;
              return (
                <motion.article
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "squircle-lg glass ring-inner p-4 md:p-5 relative overflow-hidden",
                    active && e.severity === "critical" && "ring-2 ring-accent/30",
                  )}
                >
                  {active && e.severity === "critical" && (
                    <div aria-hidden className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/20 blur-2xl animate-pulse" />
                  )}
                  <div className="relative flex flex-col md:flex-row md:items-start gap-4">
                    {/* Severity badge */}
                    <div className={cn("size-12 squircle flex items-center justify-center shrink-0", sev.cls)}>
                      <Siren className="h-5 w-5" strokeWidth={2.4} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg tracking-headline text-ink truncate">
                          {e.emergency_type}
                        </h3>
                        <span className={cn("text-[10.5px] uppercase font-medium tracking-wider px-2 py-0.5 squircle", sev.cls)}>
                          {sev.label}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 text-[10.5px] uppercase font-medium tracking-wider px-2 py-0.5 squircle", stat.cls)}>
                          <span className={cn("size-1.5 rounded-full", stat.dot)} />
                          {stat.label}
                        </span>
                      </div>

                      <div className="mt-2 grid sm:grid-cols-2 gap-x-5 gap-y-1.5 text-[13px] text-ink-2">
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                          <span className="truncate">{e.location}</span>
                          {e.latitude != null && e.longitude != null && (
                            <span className="text-[11px] text-ink-3 tabular shrink-0">
                              · {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                            </span>
                          )}
                        </p>
                        <p className="flex items-center gap-1.5 text-ink-3">
                          <Clock className="h-3.5 w-3.5" />
                          {elapsed(e.created_at)}
                          <span className="text-[11px] tabular">
                            · {new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </p>
                      </div>

                      {e.description && (
                        <p className="text-[13.5px] text-ink mt-2 leading-relaxed line-clamp-2">{e.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-pill glass h-9 px-3 text-[12.5px] text-ink"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Itinéraire
                        </a>
                        {e.status === "open" && (
                          <button
                            onClick={() => dispatchEmergency(e)}
                            className="btn-pill bg-primary text-primary-foreground h-9 px-3 text-[12.5px]"
                          >
                            <Ambulance className="h-3.5 w-3.5" /> Prendre en charge
                          </button>
                        )}
                        {e.status === "dispatched" && (
                          <button
                            onClick={() => resolveEmergency(e)}
                            className="btn-pill bg-secondary text-secondary-foreground h-9 px-3 text-[12.5px]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Marquer résolue
                          </button>
                        )}
                        {e.status === "resolved" && e.resolved_at && (
                          <span className="text-[11.5px] text-ink-3 inline-flex items-center gap-1 px-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                            Résolue à {new Date(e.resolved_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dispatch;
