import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Building2,
  ChevronRight,
  CircleHelp,
  Cross,
  ExternalLink,
  FlaskConical,
  Heart,
  Hospital,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PublicToolLayout from "@/components/PublicToolLayout";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  type DirectoryStructure,
  matchesDirectorySearch,
  mergeDirectoryStructures,
  publicHealthStructures,
  structureDirectionsUrl,
} from "@/data/public-health-structures";
import { useAuth } from "@/hooks/useAuth";
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

interface RoleRow {
  user_id: string;
  role: string;
}

type RawStructure = Omit<DirectoryStructure, "source" | "source_name" | "source_url"> & {
  manager_name: string;
};

type SourceFilter = "all" | "partners" | "favorites";

const FAVORITES_KEY = "aymane-directory-favorites";
const PUBLIC_MANAGER = "Repertoire public AYMANE";
const PAGE_SIZE = 8;

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
  other: "Poste de santé",
};

const STRUCTURE_FILTERS = [
  { value: "", label: "Tous", icon: Building2 },
  { value: "hospital", label: "Hôpitaux", icon: Hospital },
  { value: "health_center", label: "Centres", icon: Cross },
  { value: "other", label: "Postes", icon: MapPin },
  { value: "clinic", label: "Cliniques", icon: Stethoscope },
  { value: "pharmacy", label: "Pharmacies", icon: Pill },
  { value: "lab", label: "Laboratoires", icon: FlaskConical },
] as const;

const iconForStructure = (type: string) => {
  if (type === "hospital") return Hospital;
  if (type === "health_center") return Cross;
  if (type === "pharmacy") return Pill;
  if (type === "lab") return FlaskConical;
  if (type === "clinic" || type === "medical_office" || type === "dental_office") return Stethoscope;
  return MapPin;
};

const readFavorites = () => {
  try {
    const stored = window.localStorage.getItem(FAVORITES_KEY);
    return new Set<string>(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set<string>();
  }
};

const Directory = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"pros" | "structures">("structures");
  const [search, setSearch] = useState(searchParams.get("spec") ?? "");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [structures, setStructures] = useState<DirectoryStructure[]>(publicHealthStructures);
  const [selectedStructure, setSelectedStructure] = useState<DirectoryStructure | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(readFavorites);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [catalogueNotice, setCatalogueNotice] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = "Annuaire santé au Sénégal — AYMANE";
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setCatalogueNotice(false);

      if (import.meta.env.VITE_PUBLIC_LANDING_DATA !== "true") {
        setProviders([]);
        setStructures(publicHealthStructures);
        setCatalogueNotice(true);
        setLoading(false);
        return;
      }

      const [profilesResult, structuresResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, speciality, city, phone, professional_photo_url, professional_address"),
        supabase
          .from("health_structures")
          .select("id, name, type, city, region, address, phone_landline, phone_mobile, email, logo_url, description, manager_name")
          .eq("verified", true),
      ]);
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

      const liveStructures = (structuresResult.error ? [] : structuresResult.data ?? []) as RawStructure[];
      const normalizedStructures = liveStructures.map((structure): DirectoryStructure => {
        const isPublicReference = structure.manager_name === PUBLIC_MANAGER;
        return {
          ...structure,
          region: structure.region ?? structure.city,
          phone_mobile: structure.phone_mobile ?? "",
          description: structure.description ?? null,
          source: isPublicReference ? "public_reference" : "aymane_partner",
          source_name: isPublicReference ? "SanteMap" : "AYMANE",
          source_url: isPublicReference ? "https://santemap.com/" : "",
        };
      });

      setProviders(
        profileRows
          .map((profile) => ({ ...profile, roles: rolesMap.get(profile.id) ?? [] }))
          .filter((profile) => profile.roles.some((role) => role !== "patient" && role !== "admin")),
      );
      setStructures(mergeDirectoryStructures(normalizedStructures));
      setCatalogueNotice(Boolean(structuresResult.error || profilesResult.error || rolesResult.error));
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [tab, search, cityFilter, typeFilter, sourceFilter]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const cities = useMemo(
    () => Array.from(new Set(structures.map((structure) => structure.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")),
    [structures],
  );

  const filteredPros = useMemo(
    () => providers.filter((provider) => {
      const query = search.toLocaleLowerCase("fr");
      if (query && !`${provider.full_name ?? ""} ${provider.speciality ?? ""}`.toLocaleLowerCase("fr").includes(query)) return false;
      if (cityFilter && provider.city !== cityFilter) return false;
      if (typeFilter && !provider.roles.includes(typeFilter)) return false;
      return true;
    }),
    [providers, search, cityFilter, typeFilter],
  );

  const filteredStructures = useMemo(
    () => structures.filter((structure) => {
      if (!matchesDirectorySearch(structure, search)) return false;
      if (cityFilter && structure.city !== cityFilter) return false;
      if (typeFilter && structure.type !== typeFilter) return false;
      if (sourceFilter === "partners" && structure.source !== "aymane_partner") return false;
      if (sourceFilter === "favorites" && !favorites.has(structure.id)) return false;
      return true;
    }),
    [structures, search, cityFilter, typeFilter, sourceFilter, favorites],
  );

  const visibleStructures = filteredStructures.slice(0, visibleLimit);
  const visiblePros = filteredPros.slice(0, visibleLimit);
  const resultCount = tab === "structures" ? filteredStructures.length : filteredPros.length;

  const clearFilters = () => {
    setSearch("");
    setCityFilter("");
    setTypeFilter("");
    setSourceFilter("all");
  };

  const content = (
    <div className="pb-8">
      <header className="border-b border-hairline pb-5 pt-2 sm:pb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase text-primary">Annuaire santé · Sénégal</p>
            <h1 className="mt-2 max-w-2xl text-[clamp(1.75rem,7vw,3rem)] font-bold leading-[1.02] text-ink">
              Trouver le bon soin, près de chez vous.
            </h1>
            <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3 sm:text-[15px]">
              Hôpital, centre, poste, clinique ou pharmacie : cherchez, vérifiez la fiche, puis appelez ou lancez l'itinéraire.
            </p>
          </div>
          <div className="hidden size-14 shrink-0 place-items-center rounded-[0.8rem] bg-primary text-white sm:grid">
            <Navigation className="h-6 w-6" strokeWidth={1.8} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <a
            href="https://www.google.com/maps/search/?api=1&query=structure+de+sante+pres+de+moi"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.7rem] bg-ink px-4 text-[12.5px] font-semibold text-white tap"
          >
            <Navigation className="h-4 w-4" />
            Autour de moi
          </a>
          <Link
            to="/auth/provider?type=structure"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.7rem] border border-hairline bg-surface-0 px-4 text-[12.5px] font-semibold text-ink-2 tap"
          >
            <Building2 className="h-4 w-4" />
            Inscrire ma structure
          </Link>
        </div>
      </header>

      {catalogueNotice && !loading ? (
        <div className="mt-4 flex items-start gap-3 rounded-[0.75rem] border border-hairline bg-surface-0 px-3.5 py-3 text-[12px] leading-relaxed text-ink-3">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>Les repères publics restent consultables. Confirmez les coordonnées et horaires avant votre déplacement.</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="ml-auto shrink-0 font-semibold text-primary">
            Actualiser
          </button>
        </div>
      ) : null}

      <section aria-label="Recherche dans l'annuaire" className="mt-5">
        <div className="grid grid-cols-2 rounded-[0.75rem] bg-surface-1 p-1 sm:w-fit">
          {(["structures", "pros"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                setTypeFilter("");
                setCityFilter("");
              }}
              className={cn(
                "h-10 rounded-[0.55rem] px-4 text-[12.5px] font-semibold transition-colors tap",
                tab === value ? "bg-surface-0 text-ink shadow-xs" : "text-ink-3",
              )}
            >
              {value === "structures" ? "Structures" : "Professionnels"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="relative">
            <span className="sr-only">Rechercher par nom, quartier ou spécialité</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === "pros" ? "Nom ou spécialité" : "Nom, quartier ou commune"}
              className="h-12 w-full rounded-[0.75rem] border border-hairline bg-surface-0 pl-10 pr-10 text-[14px] outline-none transition-colors placeholder:text-ink-4 focus:border-primary/60"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[0.55rem] text-ink-3 tap"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <label>
            <span className="sr-only">Filtrer par localité</span>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="h-12 w-full rounded-[0.75rem] border border-hairline bg-surface-0 px-3 text-[13.5px] outline-none transition-colors focus:border-primary/60"
            >
              <option value="">Toutes les localités</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        </div>

        {tab === "structures" ? (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {STRUCTURE_FILTERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value || "all"}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[0.65rem] border px-3 text-[11.5px] font-semibold transition-colors tap",
                  typeFilter === value
                    ? "border-primary bg-primary text-white"
                    : "border-hairline bg-surface-0 text-ink-3",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        ) : (
          <label className="mt-3 block sm:max-w-xs">
            <span className="sr-only">Filtrer par profession</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 w-full rounded-[0.7rem] border border-hairline bg-surface-0 px-3 text-[13px] outline-none focus:border-primary/60"
            >
              <option value="">Toutes les professions</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        )}

        {tab === "structures" ? (
          <div className="mt-4 flex items-center gap-1 border-b border-hairline pb-3">
            {([
              ["all", "Tout le réseau"],
              ["partners", "Partenaires AYMANE"],
              ["favorites", `Mes favoris${favorites.size ? ` ${favorites.size}` : ""}`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSourceFilter(value)}
                className={cn(
                  "min-h-9 rounded-[0.55rem] px-2.5 text-[11px] font-semibold transition-colors tap sm:px-3 sm:text-[11.5px]",
                  sourceFilter === value ? "bg-ink text-white" : "text-ink-3 hover:bg-surface-1",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : <div className="mt-4 border-b border-hairline" />}

        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-hairline py-3">
          <p className="text-[11.5px] text-ink-3">
            {loading ? "Recherche en cours" : `${resultCount} résultat${resultCount > 1 ? "s" : ""}`}
          </p>
          {(search || cityFilter || typeFilter || sourceFilter !== "all") ? (
            <button type="button" onClick={clearFilters} className="text-[11.5px] font-semibold text-primary tap">
              Effacer les filtres
            </button>
          ) : null}
        </div>

        {loading ? (
          <DirectorySkeleton />
        ) : tab === "pros" ? (
          <ProList items={visiblePros} />
        ) : (
          <StructureList
            items={visibleStructures}
            favorites={favorites}
            onFavorite={toggleFavorite}
            onSelect={setSelectedStructure}
          />
        )}

        {!loading && resultCount > visibleLimit ? (
          <div className="border-b border-hairline py-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleLimit((value) => value + PAGE_SIZE)}
              className="h-11 rounded-[0.7rem] border border-hairline bg-surface-0 px-5 text-[12.5px] font-semibold text-ink-2 tap"
            >
              Voir {Math.min(PAGE_SIZE, resultCount - visibleLimit)} résultats de plus
            </button>
          </div>
        ) : null}
      </section>

      <StructureDetails
        structure={selectedStructure}
        favorite={selectedStructure ? favorites.has(selectedStructure.id) : false}
        onFavorite={toggleFavorite}
        onClose={() => setSelectedStructure(null)}
      />
    </div>
  );

  return user ? (
    <DashboardLayout title="Annuaire" back>{content}</DashboardLayout>
  ) : (
    <PublicToolLayout title="Annuaire">{content}</PublicToolLayout>
  );
};

const StructureList = ({
  items,
  favorites,
  onFavorite,
  onSelect,
}: {
  items: DirectoryStructure[];
  favorites: Set<string>;
  onFavorite: (id: string) => void;
  onSelect: (structure: DirectoryStructure) => void;
}) => {
  if (items.length === 0) return <Empty />;

  return (
    <div className="divide-y divide-hairline border-b border-hairline">
      {items.map((structure) => {
        const Icon = iconForStructure(structure.type);
        const isPartner = structure.source === "aymane_partner";
        const isFavorite = favorites.has(structure.id);

        return (
          <article key={structure.id} className="grid min-h-[5.5rem] grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] items-center gap-3 py-3.5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-4">
            <div className={cn(
              "grid size-11 place-items-center rounded-[0.7rem]",
              isPartner ? "bg-primary text-white" : "bg-primary-soft text-primary",
            )}>
              <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.8} />
            </div>

            <button type="button" onClick={() => onSelect(structure)} className="min-w-0 text-left tap">
              <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink sm:text-[15px]">{structure.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3">
                <span>{STRUCTURE_LABELS[structure.type] ?? "Structure de santé"}</span>
                <span aria-hidden="true">·</span>
                <span>{structure.city}</span>
              </div>
              <p className={cn("mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold", isPartner ? "text-secondary" : "text-ink-4")}>
                {isPartner ? <ShieldCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                {isPartner ? "Partenaire AYMANE" : "Référence publique"}
              </p>
            </button>

            <div className="flex items-center sm:gap-1">
              <button
                type="button"
                onClick={() => onFavorite(structure.id)}
                className={cn("grid size-10 place-items-center rounded-[0.6rem] tap", isFavorite ? "text-accent" : "text-ink-4")}
                aria-label={isFavorite ? `Retirer ${structure.name} des favoris` : `Ajouter ${structure.name} aux favoris`}
              >
                <Heart className={cn("h-[1.1rem] w-[1.1rem]", isFavorite && "fill-current")} />
              </button>
              <button
                type="button"
                onClick={() => onSelect(structure)}
                className="hidden size-10 place-items-center rounded-[0.6rem] text-ink-3 tap sm:grid"
                aria-label={`Voir la fiche de ${structure.name}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const StructureDetails = ({
  structure,
  favorite,
  onFavorite,
  onClose,
}: {
  structure: DirectoryStructure | null;
  favorite: boolean;
  onFavorite: (id: string) => void;
  onClose: () => void;
}) => (
  <Drawer open={Boolean(structure)} onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
    <DrawerContent className="max-h-[86dvh] overflow-y-auto border-hairline bg-surface-0 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-t-[0.8rem]">
      {structure ? (
        <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <DrawerHeader className="px-0 pb-4 pt-5 text-left">
            <div className="flex items-center gap-3">
              <div className={cn(
                "grid size-12 shrink-0 place-items-center rounded-[0.75rem]",
                structure.source === "aymane_partner" ? "bg-primary text-white" : "bg-primary-soft text-primary",
              )}>
                {(() => {
                  const Icon = iconForStructure(structure.type);
                  return <Icon className="h-5 w-5" strokeWidth={1.8} />;
                })()}
              </div>
              <div className="min-w-0">
                <DrawerTitle className="text-left text-[20px] leading-tight text-ink">{structure.name}</DrawerTitle>
                <DrawerDescription className="mt-1 text-left text-[12px] text-ink-3">
                  {STRUCTURE_LABELS[structure.type] ?? "Structure de santé"} · {structure.city}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="border-y border-hairline py-4">
            <p className={cn(
              "inline-flex items-center gap-1.5 text-[11.5px] font-semibold",
              structure.source === "aymane_partner" ? "text-secondary" : "text-ink-3",
            )}>
              {structure.source === "aymane_partner" ? <ShieldCheck className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
              {structure.source === "aymane_partner" ? "Partenaire validé par AYMANE" : "Référence publique à confirmer"}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
              {structure.source === "aymane_partner"
                ? "Cette structure a complété le parcours de validation AYMANE."
                : "Cette fiche facilite votre recherche. Vérifiez les coordonnées, les horaires et la disponibilité du service avant de partir."}
            </p>
          </div>

          <dl className="divide-y divide-hairline">
            <DetailRow icon={MapPin} label="Zone" value={`${structure.address}, ${structure.region}`} />
            <DetailRow
              icon={Phone}
              label="Téléphone"
              value={structure.phone_mobile || structure.phone_landline || "À confirmer"}
            />
            <DetailRow icon={Mail} label="Contact" value={structure.email || "À confirmer"} />
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <a
              href={structureDirectionsUrl(structure)}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-[0.7rem] bg-ink text-[13px] font-semibold text-white tap"
            >
              <Navigation className="h-4 w-4" />
              Lancer l'itinéraire
            </a>
            {structure.phone_mobile || structure.phone_landline ? (
              <a
                href={`tel:${structure.phone_mobile || structure.phone_landline}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.7rem] border border-hairline text-[12px] font-semibold text-ink-2 tap"
              >
                <Phone className="h-4 w-4" />
                Appeler
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => onFavorite(structure.id)}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-[0.7rem] border border-hairline text-[12px] font-semibold tap",
                favorite ? "bg-accent-soft text-accent" : "text-ink-2",
                !(structure.phone_mobile || structure.phone_landline) && "col-span-2",
              )}
            >
              <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
              {favorite ? "Enregistrée" : "Garder en favori"}
            </button>
          </div>

          {structure.source_url ? (
            <a
              href={structure.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-[11.5px] font-semibold text-primary"
            >
              Consulter la source publique
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}
    </DrawerContent>
  </Drawer>
);

const DetailRow = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) => (
  <div className="grid grid-cols-[1.5rem_5rem_minmax(0,1fr)] gap-2 py-3.5 text-[12px]">
    <Icon className="mt-0.5 h-4 w-4 text-primary" />
    <dt className="font-semibold text-ink-3">{label}</dt>
    <dd className="min-w-0 text-right text-ink-2">{value}</dd>
  </div>
);

const ProList = ({ items }: { items: Provider[] }) => {
  if (items.length === 0) return <Empty message="Aucun professionnel ne correspond à cette recherche." />;

  return (
    <div className="divide-y divide-hairline border-b border-hairline">
      {items.map((provider) => {
        const photo = provider.professional_photo_url
          ? supabase.storage.from("public-profiles").getPublicUrl(provider.professional_photo_url).data.publicUrl
          : null;
        const role = provider.roles.find((value) => value !== "patient" && value !== "admin");

        return (
          <article key={provider.id} className="grid min-h-[5.5rem] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-4">
            <div className="size-11 overflow-hidden rounded-[0.7rem] bg-primary-soft sm:size-12">
              {photo ? (
                <img src={photo} alt={provider.full_name ?? "Professionnel de santé"} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-primary">
                  <Stethoscope className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink sm:text-[15px]">{provider.full_name ?? "Professionnel de santé"}</p>
              <p className="mt-1 text-[11px] font-semibold text-primary">{TYPE_LABELS[role ?? ""] ?? role}</p>
              <p className="mt-1 line-clamp-1 text-[11px] text-ink-3">
                {[provider.speciality, provider.city].filter(Boolean).join(" · ")}
              </p>
            </div>
            {provider.phone ? (
              <a href={`tel:${provider.phone}`} className="grid size-10 place-items-center rounded-[0.65rem] bg-ink text-white tap" aria-label={`Appeler ${provider.full_name ?? "ce professionnel"}`}>
                <Phone className="h-4 w-4" />
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

const DirectorySkeleton = () => (
  <div className="divide-y divide-hairline border-b border-hairline" aria-label="Chargement de l'annuaire">
    {[0, 1, 2, 3].map((item) => (
      <div key={item} className="flex min-h-[5.5rem] items-center gap-3 py-3.5">
        <div className="size-11 shrink-0 animate-pulse rounded-[0.7rem] bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-surface-2" />
          <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-surface-1" />
        </div>
      </div>
    ))}
  </div>
);

const Empty = ({ message = "Aucune structure ne correspond à cette recherche." }: { message?: string }) => (
  <div className="state-panel my-4">
    <Search className="mb-3 h-6 w-6 text-primary" />
    <p className="font-semibold text-ink">{message}</p>
    <p className="mt-1 text-[13px] text-ink-3">Essayez une autre localité ou retirez un filtre.</p>
  </div>
);

export default Directory;
