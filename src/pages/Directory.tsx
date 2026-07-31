import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Mail, MapPin, Phone, Search, Stethoscope } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PublicToolLayout from "@/components/PublicToolLayout";
import { useAuth } from "@/hooks/useAuth";
import { publicFallbackData } from "@/hooks/useLandingOperations";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  full_name: string | null;
  speciality: string | null;
  city: string | null;
  phone: string | null;
  professional_photo_url: string | null;
  professional_address: string | null;
  roles: string[];
}

interface Structure {
  id: string;
  name: string;
  type: string;
  city: string;
  address: string;
  phone_landline: string;
  email: string;
  logo_url: string | null;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const TYPE_LABELS: Record<string, string> = {
  doctor: "Médecin",
  dentist: "Dentiste",
  nurse: "Infirmier(ère)",
  midwife: "Sage-femme",
  pharmacist: "Pharmacien",
  lab_technician: "Technicien de laboratoire",
  other_provider: "Professionnel de santé",
};

const STRUCTURE_LABELS: Record<string, string> = {
  hospital: "Hôpital",
  clinic: "Clinique",
  medical_office: "Cabinet médical",
  dental_office: "Cabinet dentaire",
  lab: "Laboratoire",
  pharmacy: "Pharmacie",
  health_center: "Centre de santé",
  other: "Structure de santé",
};

const Directory = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"pros" | "structures">("structures");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("live");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = "Annuaire santé au Sénégal — AYMANE";
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      const fallbackStructures: Structure[] = publicFallbackData.structures.map((structure) => ({
        id: structure.id,
        name: structure.name,
        type: structure.type,
        city: structure.city,
        address: structure.city,
        phone_landline: "",
        email: "",
        logo_url: null,
      }));

      if (import.meta.env.VITE_PUBLIC_LANDING_DATA !== "true") {
        setProviders([]);
        setStructures(fallbackStructures);
        setDataSource("fallback");
        setLoading(false);
        return;
      }

      const profilesPromise = supabase
        .from("profiles")
        .select("id, full_name, speciality, city, phone, professional_photo_url, professional_address");
      const structuresPromise = supabase
        .from("health_structures")
        .select("*")
        .eq("verified", true);

      const [profilesResult, structuresResult] = await Promise.all([profilesPromise, structuresPromise]);
      if (!active) return;

      const profileRows = profilesResult.error ? [] : profilesResult.data ?? [];
      const ids = profileRows.map((profile) => profile.id);
      const rolesResult = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as RoleRow[], error: null };

      if (!active) return;
      const rolesMap = new Map<string, string[]>();
      ((rolesResult.error ? [] : rolesResult.data) as RoleRow[]).forEach((row) => {
        rolesMap.set(row.user_id, [...(rolesMap.get(row.user_id) ?? []), row.role]);
      });

      const liveStructures = structuresResult.error ? [] : structuresResult.data ?? [];
      setProviders(
        profileRows
          .map((profile) => ({ ...profile, roles: rolesMap.get(profile.id) ?? [] }))
          .filter((profile) => profile.roles.some((role) => role !== "patient" && role !== "admin")),
      );
      setStructures((liveStructures.length ? liveStructures : fallbackStructures) as Structure[]);
      setDataSource(liveStructures.length || profileRows.length ? "live" : "fallback");
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const cities = useMemo(() => {
    const values = new Set<string>();
    providers.forEach((provider) => provider.city && values.add(provider.city));
    structures.forEach((structure) => structure.city && values.add(structure.city));
    return Array.from(values).sort();
  }, [providers, structures]);

  const filteredPros = useMemo(
    () =>
      providers.filter((provider) => {
        const query = search.toLowerCase();
        if (query && !`${provider.full_name} ${provider.speciality}`.toLowerCase().includes(query)) return false;
        if (cityFilter && provider.city !== cityFilter) return false;
        if (typeFilter && !provider.roles.includes(typeFilter)) return false;
        return true;
      }),
    [providers, search, cityFilter, typeFilter],
  );

  const filteredStructures = useMemo(
    () =>
      structures.filter((structure) => {
        const query = search.toLowerCase();
        if (query && !`${structure.name} ${structure.address}`.toLowerCase().includes(query)) return false;
        if (cityFilter && structure.city !== cityFilter) return false;
        if (typeFilter && structure.type !== typeFilter) return false;
        return true;
      }),
    [structures, search, cityFilter, typeFilter],
  );

  const content = (
    <>
      <PageHeader
        eyebrow="Réseau de santé"
        title="Trouvez un"
        italic="soin vérifié."
        description="Cherchez une structure ou un professionnel par activité et par ville avant de vous déplacer."
      />

      {!user ? (
        <div className="mb-6 flex items-start gap-3 border-y border-hairline py-3 text-[12.5px] text-ink-3">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-secondary" />
          <p>Consultation libre. La connexion sera demandée uniquement pour vos actions personnelles.</p>
        </div>
      ) : null}

      {dataSource === "fallback" && !loading ? (
        <div className="mb-6 rounded-[0.9rem] border border-hairline bg-surface-0 p-4 text-[12.5px] leading-relaxed text-ink-3">
          Les partenaires vérifiés sont en cours de publication. AYMANE affiche pour l'instant les repères de service disponibles.
        </div>
      ) : null}

      <section aria-label="Recherche dans l'annuaire">
        <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="inline-flex w-full rounded-[0.8rem] bg-surface-1 p-1 sm:w-auto">
            {(["structures", "pros"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setTypeFilter("");
                }}
                className={cn(
                  "relative min-h-10 flex-1 rounded-[0.65rem] px-4 text-[12.5px] font-semibold transition-colors tap sm:flex-none",
                  tab === value ? "text-ink" : "text-ink-3",
                )}
              >
                {tab === value ? (
                  <motion.span
                    layoutId="directory-tab"
                    className="absolute inset-0 rounded-[0.65rem] border border-hairline bg-surface-0 shadow-xs"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                ) : null}
                <span className="relative">
                  {value === "structures" ? `Structures ${structures.length}` : `Professionnels ${providers.length}`}
                </span>
              </button>
            ))}
          </div>

          <p className="text-[11.5px] text-ink-4">
            {loading ? "Mise à jour en cours" : `${tab === "structures" ? filteredStructures.length : filteredPros.length} résultat(s)`}
          </p>
        </div>

        <div className="grid gap-2 border-b border-hairline py-4 sm:grid-cols-3">
          <label className="relative">
            <span className="sr-only">Rechercher par nom ou spécialité</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === "pros" ? "Nom ou spécialité" : "Nom ou quartier"}
              className="h-11 w-full rounded-[0.7rem] border border-hairline bg-surface-0 pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-primary/50"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par ville</span>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="h-11 w-full rounded-[0.7rem] border border-hairline bg-surface-0 px-3 text-[13.5px] outline-none transition-colors focus:border-primary/50"
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrer par activité</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 w-full rounded-[0.7rem] border border-hairline bg-surface-0 px-3 text-[13.5px] outline-none transition-colors focus:border-primary/50"
            >
              <option value="">{tab === "pros" ? "Toutes les professions" : "Tous les types"}</option>
              {Object.entries(tab === "pros" ? TYPE_LABELS : STRUCTURE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <DirectorySkeleton />
        ) : loadError ? (
          <div className="state-panel">
            <p className="font-semibold text-ink">L'annuaire ne peut pas être chargé pour le moment.</p>
            <p className="mt-1 text-[13px] text-ink-3">Vérifiez votre connexion puis réessayez.</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-4 rounded-[0.7rem] bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white tap"
            >
              Réessayer
            </button>
          </div>
        ) : tab === "pros" ? (
          <ProList items={filteredPros} />
        ) : (
          <StructureList items={filteredStructures} />
        )}
      </section>
    </>
  );

  return user ? (
    <DashboardLayout title="Annuaire" back>{content}</DashboardLayout>
  ) : (
    <PublicToolLayout title="Annuaire">{content}</PublicToolLayout>
  );
};

const ProList = ({ items }: { items: Provider[] }) => {
  if (items.length === 0) return <Empty />;

  return (
    <div className="divide-y divide-hairline border-b border-hairline">
      {items.map((provider) => {
        const photo = provider.professional_photo_url
          ? supabase.storage.from("public-profiles").getPublicUrl(provider.professional_photo_url).data.publicUrl
          : null;
        const role = provider.roles.find((value) => value !== "patient" && value !== "admin");

        return (
          <article key={provider.id} className="grid gap-4 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center">
            <div className="size-14 overflow-hidden rounded-[0.9rem] bg-surface-1">
              {photo ? (
                <img src={photo} alt={provider.full_name ?? "Professionnel de santé"} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-primary">
                  <Stethoscope className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-[18px] text-ink">{provider.full_name ?? "Professionnel de santé"}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-primary">{TYPE_LABELS[role ?? ""] ?? role}</p>
              {provider.speciality ? <p className="mt-1 text-[12.5px] text-ink-3">{provider.speciality}</p> : null}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
                {provider.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.city}</span> : null}
                {provider.professional_address ? <span>{provider.professional_address}</span> : null}
              </div>
            </div>
            {provider.phone ? (
              <a
                href={`tel:${provider.phone}`}
                className="inline-flex min-h-10 w-fit items-center gap-2 rounded-[0.7rem] border border-hairline px-3 text-[12px] font-semibold text-ink-2 tap"
              >
                <Phone className="h-3.5 w-3.5" />
                Appeler
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

const StructureList = ({ items }: { items: Structure[] }) => {
  if (items.length === 0) return <Empty />;

  return (
    <div className="divide-y divide-hairline border-b border-hairline">
      {items.map((structure) => {
        const image = structure.logo_url
          ? supabase.storage.from("public-profiles").getPublicUrl(structure.logo_url).data.publicUrl
          : null;

        return (
          <article key={structure.id} className="grid gap-4 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center">
            <div className="size-14 overflow-hidden rounded-[0.9rem] bg-surface-1">
              {image ? (
                <img src={image} alt={structure.name} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-[18px] text-ink">{structure.name}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-primary">
                {STRUCTURE_LABELS[structure.type] ?? structure.type}
              </p>
              <p className="mt-1 inline-flex items-start gap-1 text-[12px] text-ink-3">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                {structure.address}, {structure.city}
              </p>
            </div>
            <div className="flex gap-2 sm:justify-end">
              {structure.phone_landline ? (
                <a
                  href={`tel:${structure.phone_landline}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[0.7rem] bg-ink px-3 text-[12px] font-semibold text-white tap"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Appeler
                </a>
              ) : null}
              {structure.email ? (
                <a
                  href={`mailto:${structure.email}`}
                  className="grid size-10 place-items-center rounded-[0.7rem] border border-hairline text-ink-2 tap"
                  aria-label={`Écrire à ${structure.name}`}
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
};

const DirectorySkeleton = () => (
  <div className="divide-y divide-hairline border-b border-hairline">
    {[0, 1, 2, 3].map((item) => (
      <div key={item} className="flex items-center gap-4 py-5">
        <div className="size-14 shrink-0 animate-pulse rounded-[0.9rem] bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/5 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-1/4 animate-pulse rounded-full bg-surface-1" />
          <div className="h-3 w-3/5 animate-pulse rounded-full bg-surface-1" />
        </div>
      </div>
    ))}
  </div>
);

const Empty = () => (
  <div className="state-panel">
    <p className="font-semibold text-ink">Aucun résultat avec ces critères.</p>
    <p className="mt-1 text-[13px] text-ink-3">Essayez une autre ville ou élargissez votre recherche.</p>
  </div>
);

export default Directory;
