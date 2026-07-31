import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Stagger, StaggerItem } from "@/components/Motion";
import { motion } from "framer-motion";
import {
  Siren,
  Phone,
  MapPin,
  Loader2,
  AlertTriangle,
  HeartPulse,
  Activity,
  Brain,
  Droplets,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Emergency = {
  id: string;
  emergency_type: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};
type Stock = { id: string; center_name: string; city: string; blood_group: string; units_available: number };

const severityMap: Record<string, { label: string; cls: string }> = {
  low: { label: "Faible", cls: "bg-secondary-soft text-secondary" },
  medium: { label: "Moyenne", cls: "bg-warning-soft text-warning" },
  high: { label: "Élevée", cls: "bg-warning-soft text-warning" },
  critical: { label: "Critique", cls: "bg-accent-soft text-accent" },
};

const statusMap: Record<string, { label: string; cls: string }> = {
  open: { label: "En attente", cls: "bg-warning-soft text-warning" },
  dispatched: { label: "Secours en route", cls: "bg-primary-soft text-primary" },
  resolved: { label: "Résolue", cls: "bg-secondary-soft text-secondary" },
  cancelled: { label: "Annulée", cls: "bg-surface-2 text-ink-3" },
};

const QUICK_TYPES = [
  { id: "malaise", label: "Malaise", icon: HeartPulse },
  { id: "accident", label: "Accident", icon: AlertTriangle },
  { id: "douleur", label: "Douleur intense", icon: Activity },
  { id: "respiration", label: "Difficulté respiratoire", icon: Activity },
  { id: "saignement", label: "Saignement", icon: Droplets },
  { id: "neuro", label: "Symptôme neurologique", icon: Brain },
];

const RED_FLAGS = [
  { icon: HeartPulse, label: "Douleur thoracique oppressante", desc: "Surtout si elle irradie au bras ou à la mâchoire." },
  { icon: Brain, label: "Trouble brutal de la parole ou paralysie", desc: "Visage qui s'affaisse, faiblesse soudaine d'un côté." },
  { icon: Activity, label: "Difficulté à respirer importante", desc: "Essoufflement au repos ou lèvres bleutées." },
  { icon: Droplets, label: "Hémorragie qui ne s'arrête pas", desc: "Compresser fermement et alerter immédiatement." },
  { icon: AlertTriangle, label: "Perte de connaissance", desc: "Vérifier la respiration, mettre en position latérale." },
  { icon: HeartPulse, label: "Convulsions", desc: "Protéger la tête, ne rien mettre dans la bouche." },
];

const HOLD_DURATION = 1500; // ms

const SOS = () => {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [tab, setTab] = useState<"alerts" | "blood">("alerts");

  // Alert form
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [severity, setSeverity] = useState<keyof typeof severityMap>("high");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Hold-to-trigger
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  const loadEmergencies = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("emergencies")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });
    setEmergencies((data ?? []) as Emergency[]);
  };

  useEffect(() => {
    document.title = "SOS — Urgences · AYMANE";
    if (!user) return;
    loadEmergencies();
    supabase.from("blood_bank").select("*").order("city").then(({ data }) => setStocks((data ?? []) as Stock[]));

    // Realtime: live updates for this patient's alerts (status, dispatch, resolution)
    const channel = supabase
      .channel(`emergencies-patient-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergencies", filter: `patient_id=eq.${user.id}` },
        () => loadEmergencies(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const captureGeolocation = (): Promise<{ text: string; lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLoading(false);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          resolve({ text: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
        },
        () => {
          setGeoLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 },
      );
    });

  const requestLocation = async () => {
    const c = await captureGeolocation();
    if (c) {
      setLocation(c.text);
      setCoords({ lat: c.lat, lng: c.lng });
      toast({ title: "Position captée", description: c.text });
    } else {
      toast({ title: "Localisation indisponible", description: "Saisis l'adresse manuellement.", variant: "destructive" });
    }
  };

  const openAlertDialog = async (preset?: { type?: string; severity?: keyof typeof severityMap }) => {
    if (preset?.type) setType(preset.type);
    if (preset?.severity) setSeverity(preset.severity);
    setOpen(true);
    if (!location) {
      const c = await captureGeolocation();
      if (c) {
        setLocation(c.text);
        setCoords({ lat: c.lat, lng: c.lng });
      }
    }
  };

  const submit = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connecte-toi pour envoyer une alerte.", variant: "destructive" });
      return;
    }
    if (!type.trim() || type.trim().length > 80) {
      toast({ title: "Type d'urgence requis", variant: "destructive" });
      return;
    }
    if (!location.trim() || location.trim().length > 200) {
      toast({ title: "Localisation requise", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("emergencies").insert({
      patient_id: user.id,
      emergency_type: type.trim(),
      location: location.trim(),
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      severity: severity as any,
      description: description.trim().slice(0, 1000) || null,
    }).select("public_token").single();
    setSubmitting(false);
    if (error) {
      toast({ title: "Échec de l'alerte", description: error.message, variant: "destructive" });
      return;
    }
    const token = (inserted as any)?.public_token as string | undefined;
    const trackUrl = token ? `${window.location.origin}/track/${token}` : null;
    if (trackUrl) {
      try { await navigator.clipboard?.writeText(trackUrl); } catch { /* ignore */ }
    }
    toast({
      title: "Alerte envoyée",
      description: trackUrl
        ? `Lien de suivi copié : ${trackUrl}`
        : "Les secours sont notifiés.",
    });
    setOpen(false);
    setType("");
    setDescription("");
    setSeverity("high");
    loadEmergencies();
  };

  // ─── Hold-to-trigger SOS ───
  const cancelHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    holdTimer.current = null;
    rafId.current = null;
    setHolding(false);
    setProgress(0);
  };

  const startHold = () => {
    setHolding(true);
    holdStart.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - holdStart.current;
      const p = Math.min(1, elapsed / HOLD_DURATION);
      setProgress(p);
      if (p < 1) rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    holdTimer.current = window.setTimeout(() => {
      cancelHold();
      void openAlertDialog({ type: type || "Urgence", severity: "critical" });
      // Haptic feedback if available
      if ("vibrate" in navigator) navigator.vibrate?.(120);
    }, HOLD_DURATION);
  };

  return (
    <DashboardLayout title="SOS · Urgences">
      <PageHeader
        eyebrow="Urgences · 24/7"
        title="Une alerte"
        italic="en un geste."
        description="Maintenez le bouton 1,5 s pour déclencher une alerte géolocalisée. Vos contacts de confiance reçoivent les informations utiles."
      />

      {/* Hero alert action */}
      <section className="grid lg:grid-cols-12 gap-5 mb-10">
        {/* Big SOS button — hold to trigger */}
        <div className="lg:col-span-7 squircle-xl glass-strong ring-inner p-6 md:p-8 relative overflow-hidden">
          <div className="relative flex flex-col items-center text-center">
            <div className="label text-accent flex items-center gap-2 mb-4">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              Urgence vitale · 24/7
            </div>

            <button
              type="button"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={(e) => {
                e.preventDefault();
                startHold();
              }}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              aria-label="Maintenir pour déclencher une alerte SOS"
              className={cn(
                "relative size-44 md:size-52 rounded-full bg-accent text-accent-foreground select-none touch-none",
                "flex flex-col items-center justify-center shadow-xl tap",
                "ring-8 ring-accent/15 transition-transform",
                holding && "scale-95",
              )}
            >
              {/* Progress ring */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(0 0% 100% / 0.25)" strokeWidth="4" />
                <circle
                  cx="50" cy="50" r="46" fill="none"
                  stroke="white" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
                  className="transition-[stroke-dashoffset] duration-75"
                />
              </svg>
              <Siren className="h-10 w-10 mb-1" strokeWidth={2.4} />
              <span className="font-display text-3xl tracking-display">SOS</span>
              <span className="text-[11px] mt-1 opacity-90">{holding ? "Maintenez…" : "Maintenir 1,5 s"}</span>
            </button>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
              <button
                type="button"
                onClick={() => void openAlertDialog({ severity: "high" })}
                className="btn-pill bg-ink text-white h-11 px-5 text-[14px] flex-1 shadow-sm hover:bg-ink-2"
              >
                <Siren className="h-4 w-4" /> Déclencher l'alerte
              </button>
              <a
                href="tel:15"
                className="btn-pill glass h-11 px-5 text-[14px] text-ink flex-1"
              >
                <Phone className="h-4 w-4" /> Appeler le 15
              </a>
            </div>

            <p className="text-[12px] text-ink-3 mt-4 max-w-md">
              En cas de danger immédiat, appelez directement les secours. La position peut être partagée si vous autorisez l'accès.
            </p>
          </div>
        </div>

        {/* Quick types + trust */}
        <div className="lg:col-span-5 space-y-4">
          <div className="squircle-lg glass ring-inner p-5">
            <p className="label text-primary mb-4">Type d'urgence</p>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_TYPES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => void openAlertDialog({ type: q.label, severity: "high" })}
                  className="group squircle p-3 bg-surface-1 hover:bg-surface-2 border border-hairline text-left tap"
                >
                  <q.icon className="h-4 w-4 text-accent mb-1.5" strokeWidth={2.4} />
                  <p className="text-[13px] font-medium text-ink">{q.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="squircle-lg glass ring-inner p-5">
            <p className="label text-ink-3 mb-3">Comment ça marche</p>
            <ul className="space-y-2.5 text-[13.5px] text-ink-2">
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Votre position est captée automatiquement et protégée.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Les secours et structures proches sont notifiés en moins de 30 s.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <HeartPulse className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Tes données vitales du dossier sont partagées au médecin régulateur.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Red flags — signes d'alerte */}
      <section className="mb-12">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="label text-accent mb-1">Signes d'alerte</p>
            <h2 className="font-display text-2xl md:text-3xl tracking-headline text-ink">
              Quand déclencher une alerte&nbsp;?
            </h2>
          </div>
          <span className="text-[12px] text-ink-3 hidden md:inline">Si l'un de ces signes apparaît, agis sans tarder.</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RED_FLAGS.map((f) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="squircle-lg p-4 bg-accent-soft/60 border border-accent/15"
            >
              <div className="flex items-start gap-3">
                <div className="size-9 squircle bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{f.label}</p>
                  <p className="text-[12.5px] text-ink-3 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-baseline gap-6 mb-6 pb-3 border-b border-hairline">
        {([["alerts", "Mes alertes"], ["blood", "Banque de sang"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "label transition-colors tap pb-3 -mb-3 border-b-2",
              tab === k ? "text-ink border-ink" : "text-ink-3 border-transparent hover:text-ink",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "alerts" ? (
        emergencies.length === 0 ? (
          <div className="state-panel">
            <Siren className="h-8 w-8 text-ink-4 mx-auto mb-3" strokeWidth={1.6} />
            <p className="text-ink-3">Aucune alerte enregistrée pour le moment.</p>
          </div>
        ) : (
          <Stagger className="space-y-3">
            {emergencies.map((e) => {
              const sev = severityMap[e.severity] ?? severityMap.medium;
              const stat = statusMap[e.status] ?? statusMap.open;
              return (
                <StaggerItem key={e.id}>
                  <article className="squircle-lg glass ring-inner p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="size-11 squircle bg-accent-soft text-accent flex items-center justify-center shrink-0">
                      <Siren className="h-5 w-5" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg tracking-headline text-ink truncate">{e.emergency_type}</h3>
                        <span className={cn("text-[10.5px] uppercase font-medium tracking-wider px-2 py-0.5 squircle", sev.cls)}>{sev.label}</span>
                        <span className={cn("text-[10.5px] uppercase font-medium tracking-wider px-2 py-0.5 squircle", stat.cls)}>{stat.label}</span>
                      </div>
                      <p className="text-[13px] text-ink-3 mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {e.location}
                      </p>
                      {e.description && <p className="text-[13.5px] text-ink-2 mt-2 leading-relaxed">{e.description}</p>}
                    </div>
                    <div className="md:text-right text-[11.5px] text-ink-3 tabular shrink-0">
                      {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        )
      ) : stocks.length === 0 ? (
        <div className="state-panel">
          <Droplets className="h-8 w-8 text-ink-4 mx-auto mb-3" strokeWidth={1.6} />
          <p className="text-ink-3">Aucun stock renseigné pour le moment.</p>
        </div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stocks.map((s) => {
            const low = s.units_available < 10;
            return (
              <StaggerItem key={s.id}>
                <div className="squircle-lg glass ring-inner p-5 h-full">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="label text-ink-3">{s.city}</span>
                    <span className="font-display text-3xl tracking-display text-accent">{s.blood_group}</span>
                  </div>
                  <h3 className="font-display text-lg tracking-headline text-ink">{s.center_name}</h3>
                  <div className="divider-line my-3" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-4xl tabular tracking-display text-ink">{s.units_available}</span>
                    <span className="label text-ink-3">poches</span>
                  </div>
                  {low && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase font-medium tracking-wider px-2 py-0.5 squircle bg-accent-soft text-accent">
                      <AlertTriangle className="h-3 w-3" /> Stock faible
                    </div>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Alert dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="squircle-xl border-hairline max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-headline">
              Nouvelle <span className="text-accent">alerte</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-ink-3">Type d'urgence *</Label>
              <Input
                placeholder="Malaise, accident…"
                maxLength={80}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-ink-3">Localisation *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adresse ou coordonnées GPS"
                  maxLength={200}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={geoLoading}
                  className="btn-pill glass h-10 px-3 text-[12.5px] text-ink shrink-0"
                  title="Capter ma position"
                >
                  {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  GPS
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-ink-3">Gravité</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as keyof typeof severityMap)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(severityMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-ink-3">Description (optionnel)</Label>
              <Textarea
                rows={3}
                maxLength={1000}
                placeholder="Décris la situation pour le médecin régulateur…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-pill bg-accent text-accent-foreground h-12 w-full text-[15px] shadow-md disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…
                </>
              ) : (
                <>
                  <Siren className="h-4 w-4" /> Envoyer l'alerte
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SOS;
