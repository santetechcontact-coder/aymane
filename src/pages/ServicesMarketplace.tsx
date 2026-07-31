import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import {
  BriefcaseMedical,
  Building2,
  Check,
  Clock3,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Video,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  LOCAL_PAYMENT_METHODS,
  type LocalPaymentProviderId,
  isValidPaymentPhone,
  normalizePaymentPhone,
} from "@/lib/local-payments";
import { cn } from "@/lib/utils";

type ServiceRow = {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  category: string;
  delivery_mode: "onsite" | "remote" | "home";
  duration_minutes: number | null;
  price_fcfa: number;
  promotion_type: "percentage" | "fixed" | null;
  promotion_value: number | null;
  promotion_starts_at: string | null;
  promotion_ends_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  speciality: string | null;
  city: string | null;
  avatar_url: string | null;
};

const categories: Record<string, string> = {
  all: "Tous",
  consultation: "Consultation",
  teleconsultation: "Téléconsultation",
  home_care: "À domicile",
  diagnostic: "Diagnostic",
  pharmacy_delivery: "Pharmacie",
  ambulance: "Ambulance",
  maternal_care: "Maternité",
  vaccination: "Vaccination",
  other: "Autre",
};

const modeMeta = {
  onsite: { label: "Sur place", icon: Building2 },
  remote: { label: "À distance", icon: Video },
  home: { label: "À domicile", icon: Home },
};

const money = (value: number) => `${new Intl.NumberFormat("fr-SN").format(value)} FCFA`;

const currentPrice = (service: ServiceRow) => {
  const now = Date.now();
  const promotionActive = service.promotion_value
    && service.promotion_starts_at
    && service.promotion_ends_at
    && new Date(service.promotion_starts_at).getTime() <= now
    && new Date(service.promotion_ends_at).getTime() > now;
  if (!promotionActive) return service.price_fcfa;
  return service.promotion_type === "percentage"
    ? Math.max(100, service.price_fcfa - Math.round(service.price_fcfa * service.promotion_value! / 100))
    : Math.max(100, service.price_fcfa - service.promotion_value!);
};

const ServicesMarketplace = () => {
  const db: SupabaseClient = supabase;
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<LocalPaymentProviderId>("wave");
  const [phone, setPhone] = useState("+221");
  const [paymentReady, setPaymentReady] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("provider_services").select("*").eq("active", true).order("created_at", { ascending: false }).limit(100);
    if (error) {
      setLoading(false);
      toast({ title: "Services indisponibles", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    const nextServices = (data ?? []) as ServiceRow[];
    setServices(nextServices);
    const providerIds = Array.from(new Set(nextServices.map((service) => service.provider_id)));
    if (providerIds.length) {
      const { data: profileData } = await db.from("profiles").select("id, full_name, speciality, city, avatar_url").in("id", providerIds);
      setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile])));
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Services de santé - AYMANE";
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((service) => {
      if (category !== "all" && service.category !== category) return false;
      const profile = profiles[service.provider_id];
      return !query || `${service.title} ${service.description ?? ""} ${profile?.full_name ?? ""} ${profile?.city ?? ""}`.toLowerCase().includes(query);
    });
  }, [services, profiles, search, category]);

  const startPayment = (service: ServiceRow) => {
    setSelected(service);
    setPhone("+221");
    setPaymentProvider("wave");
    setPaymentReady(false);
  };

  const submitPayment = async () => {
    if (!selected) return;
    const normalizedPhone = normalizePaymentPhone(phone);
    if (!isValidPaymentPhone(normalizedPhone)) {
      toast({ title: "Numéro à vérifier", description: "Indiquez le numéro utilisé pour le paiement mobile.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { data, error } = await db.rpc("create_provider_service_payment", {
      _service_id: selected.id,
      _provider: paymentProvider,
      _payer_phone: normalizedPhone,
    });
    setWorking(false);
    if (error || !data) {
      toast({ title: "Demande non enregistrée", description: "Vérifiez le numéro puis réessayez.", variant: "destructive" });
      return;
    }
    setPaymentReady(true);
    toast({ title: "Demande de paiement enregistrée", description: "Vous pouvez suivre sa confirmation dans vos paiements." });
  };

  return (
    <DashboardLayout title="Services santé" back>
      <header className="mb-5">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Prestataires vérifiés</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Trouvez le bon service, au bon prix.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Comparez les services disponibles et payez avec le moyen que vous utilisez déjà au Sénégal.
        </p>
      </header>

      <div className="sticky top-14 z-20 -mx-4 mb-5 border-y border-hairline bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-full border border-hairline bg-surface-0 pl-10 pr-4 text-[13.5px] outline-none focus:border-primary/40" placeholder="Service, professionnel ou ville" />
        </label>
        <div className="mt-2 overflow-x-auto no-scrollbar">
          <div className="flex min-w-max gap-1">
            {Object.entries(categories).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setCategory(value)} className={cn("h-8 rounded-full px-3 text-[11px] font-semibold", category === value ? "bg-ink text-white" : "bg-surface-1 text-ink-3")}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Recherche des services disponibles…</p></div>
      ) : filtered.length === 0 ? (
        <section className="rounded-[1rem] border border-dashed border-hairline bg-surface-0 px-5 py-10 text-center">
          <BriefcaseMedical className="mx-auto h-6 w-6 text-ink-4" />
          <h2 className="mt-3 font-display text-xl text-ink">Aucun service ne correspond.</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">Essayez une autre catégorie ou une recherche plus courte.</p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((service) => {
            const profile = profiles[service.provider_id];
            const ModeIcon = modeMeta[service.delivery_mode].icon;
            const price = currentPrice(service);
            return (
              <article key={service.id} className="flex min-h-64 flex-col rounded-[1rem] border border-hairline bg-surface-0 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-[0.75rem] bg-primary-soft text-primary"><BriefcaseMedical className="h-4 w-4" /></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-1 px-2.5 py-1 text-[10px] font-semibold text-ink-3"><ModeIcon className="h-3 w-3" />{modeMeta[service.delivery_mode].label}</span>
                </div>
                <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.08em] text-primary">{categories[service.category] ?? "Santé"}</p>
                <h2 className="mt-1 font-display text-xl leading-tight text-ink">{service.title}</h2>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{service.description || "Service proposé sur rendez-vous."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] text-ink-3">
                  {service.duration_minutes && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{service.duration_minutes} min</span>}
                  {profile?.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.city}</span>}
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 border-t border-hairline pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-ink-2">{profile?.full_name || "Prestataire AYMANE"}</p>
                    <p className="mt-1 text-[15px] font-bold text-primary">{money(price)}</p>
                  </div>
                  <button type="button" onClick={() => startPayment(service)} className="h-10 shrink-0 rounded-full bg-ink px-4 text-[11.5px] font-semibold text-white">Choisir</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <>
          <button type="button" aria-label="Fermer" onClick={() => setSelected(null)} className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm" />
          <section className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[1.2rem] bg-surface-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1rem] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-primary">Paiement du service</p>
                <h2 className="mt-1 font-display text-2xl leading-tight text-ink">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-1 text-ink-3" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>

            {paymentReady ? (
              <div className="mt-6 rounded-[0.95rem] bg-emerald-50 p-5 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-emerald-700 text-white"><Check className="h-5 w-5" /></span>
                <h3 className="mt-3 font-display text-xl text-emerald-950">Demande bien enregistrée</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-800">Suivez la confirmation et retrouvez le reçu dans votre espace.</p>
                <Link to="/dashboard/payments" className="mt-4 flex h-10 items-center justify-center rounded-full bg-emerald-700 px-4 text-[12px] font-semibold text-white">Voir mes paiements</Link>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between rounded-[0.85rem] bg-surface-1 p-3">
                  <div><p className="text-[10px] uppercase text-ink-4">Total</p><p className="mt-1 text-[15px] font-bold text-ink">{money(currentPrice(selected))}</p></div>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Paiement suivi</span>
                </div>
                <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">Moyen de paiement</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {LOCAL_PAYMENT_METHODS.map((method) => (
                    <button key={method.id} type="button" onClick={() => setPaymentProvider(method.id)} className={cn("flex h-11 items-center gap-2 rounded-[0.75rem] border px-3 text-left text-[11.5px] font-semibold", paymentProvider === method.id ? "border-primary bg-primary-soft text-primary" : "border-hairline text-ink-2")}>
                      <Smartphone className="h-3.5 w-3.5" />{method.label}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">Numéro du payeur</span>
                  <input type="tel" inputMode="tel" className="h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] outline-none focus:border-primary/50" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+221 77 000 00 00" />
                </label>
                <button type="button" disabled={working} onClick={() => void submitPayment()} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                  <Check className="h-4 w-4" /> Enregistrer la demande
                </button>
              </>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
};

export default ServicesMarketplace;
