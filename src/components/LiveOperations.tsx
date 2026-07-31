import { ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Droplets,
  Pill,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";
import { useLandingOperations } from "@/hooks/useLandingOperations";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  hospital: "Hôpital",
  clinic: "Clinique",
  medical_office: "Cabinet",
  dental_office: "Dentaire",
  lab: "Laboratoire",
  pharmacy: "Pharmacie",
  health_center: "Centre de santé",
  other: "Structure",
};

const LiveOperations = () => {
  const { operations, loading, refresh } = useLandingOperations();
  const updatedAt = useMemo(
    () =>
      operations.checkedAt
        ? operations.checkedAt.toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit" })
        : "en cours",
    [operations.checkedAt],
  );
  const statusLabel = loading
    ? "Vérification en cours"
    : operations.source === "live"
      ? "Informations actualisées"
      : "Services prêts à consulter";
  const isLive = operations.source === "live";

  return (
    <section id="operations" className="px-4 sm:px-5 md:px-8 pt-6 pb-7 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="md:hidden rounded-[1.25rem] bg-surface-0 border border-hairline p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label text-primary mb-2">Avant de vous déplacer</p>
              <h2 className="font-display text-[25px] leading-[1.02] text-ink text-balance">
                Les bons repères avant de partir.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="shrink-0 rounded-full bg-surface-1 border border-hairline px-3 py-2 text-[11.5px] font-semibold text-ink-2 tap"
            >
              Actualiser
            </button>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
            Annuaire, pharmacie et urgence restent à portée de main pour décider vite, sans détour inutile.
          </p>

          {(loading || isLive) && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <CompactMetric label="Structures" value={operations.counts.structures} loading={loading} />
              <CompactMetric label="Médicaments" value={operations.counts.medications} loading={loading} />
              <CompactMetric label="Sang" value={operations.counts.bloodUnits} loading={loading} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <CompactLink to="/annuaire" label="Annuaire" icon={Stethoscope} />
            <CompactLink to="/pharmacie" label="Pharma" icon={Pill} />
            <CompactLink to="/sos" label="SOS" icon={Siren} />
          </div>

          <div className="mt-4 rounded-[0.95rem] bg-surface-1 p-3">
            <p className="text-[12px] font-semibold text-ink">{statusLabel}</p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {isLive ? `Mise à jour à ${updatedAt}` : "La disponibilité se confirme dans chaque service"}
            </p>
          </div>
        </div>

        <div className="hidden md:grid lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24 min-w-0">
            <div className="space-y-4">
              <div>
                <p className="label text-primary mb-3">Avant de vous déplacer</p>
                <h2 className="font-display text-3xl md:text-5xl tracking-display leading-[1.02] text-ink text-balance">
                  Vérifiez l’essentiel depuis votre téléphone.
                </h2>
                <p className="text-[15px] text-ink-3 leading-relaxed mt-4">
                  Structure adaptée, médicament disponible ou besoin urgent : consultez d’abord
                  les informations utiles, puis partez avec une prochaine étape claire.
                </p>
              </div>

              <div className="rounded-[1.2rem] bg-surface-0 border border-hairline p-3 shadow-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-ink">{statusLabel}</p>
                  <p className="text-[11.5px] text-ink-3">
                    {isLive ? `Mise à jour à ${updatedAt}` : "Annuaire, pharmacie et urgence"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="rounded-full bg-surface-1 border border-hairline px-3 py-2 text-[12px] font-semibold text-ink-2 tap"
                >
                  Actualiser
                </button>
              </div>

            </div>
          </div>

          <div className="lg:col-span-8 space-y-4 min-w-0">
            {(loading || isLive) && (
              <div className="hidden sm:grid grid-cols-3 gap-2.5 min-w-0 max-w-full">
                <Metric label="Structures affichées" value={operations.counts.structures} icon={Building2} loading={loading} />
                <Metric label="Médicaments listés" value={operations.counts.medications} icon={Pill} loading={loading} />
                <Metric label="Poches signalées" value={operations.counts.bloodUnits} icon={Droplets} loading={loading} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0 max-w-full">
              <Panel
                title="Annuaire de confiance"
                subtitle="Poste, centre ou cabinet"
                icon={Stethoscope}
                to="/annuaire"
                cta="Ouvrir l'annuaire"
              >
                {loading ? <RowsSkeleton /> : isLive ? (
                  <div className="space-y-2.5">
                    {operations.structures.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-[1rem] bg-surface-1/80 p-3">
                        <span className="size-9 squircle bg-primary-soft text-primary grid place-items-center shrink-0">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-[11.5px] text-ink-3 truncate">
                            {typeLabels[item.type] ?? item.type} - {item.city}
                          </p>
                        </div>
                        {item.verified && <ShieldCheck className="h-4 w-4 text-secondary shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ServicePrompt
                    icon={Building2}
                    title="Cherchez par ville ou spécialité"
                    text="Les structures publiées apparaissent directement dans l'annuaire."
                  />
                )}
              </Panel>

              <Panel
                title="Pharmacie proche"
                subtitle="Stock et prix indicatifs"
                icon={Pill}
                to="/pharmacie"
                cta="Voir la pharmacie"
              >
                {loading ? <RowsSkeleton /> : isLive ? (
                  <div className="divide-y divide-hairline">
                    {operations.medications.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-[11.5px] text-ink-3">
                            {item.requires_prescription ? "Ordonnance requise" : "Sans ordonnance"} - stock {item.stock}
                          </p>
                        </div>
                        <p className="font-display text-lg tabular text-ink shrink-0">{Number(item.price).toLocaleString("fr-SN")} F</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ServicePrompt
                    icon={Pill}
                    title="Vérifiez avant le déplacement"
                    text="Recherchez le médicament pour consulter les offres publiées."
                  />
                )}
              </Panel>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

function CompactMetric({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="rounded-[0.9rem] bg-surface-1 p-3 min-w-0">
      {loading ? (
        <div className="h-6 w-10 rounded-lg bg-surface-2 animate-pulse" />
      ) : (
        <p className="font-display text-xl tabular text-ink">{value}</p>
      )}
      <p className="mt-1 truncate text-[10.5px] font-semibold text-ink-3">{label}</p>
    </div>
  );
}

function CompactLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Activity }) {
  return (
    <Link
      to={to}
      className="min-h-[64px] rounded-[0.9rem] bg-ink text-white p-2.5 tap flex flex-col justify-between"
    >
      <Icon className="h-4 w-4 text-primary-glow" strokeWidth={2.35} />
      <span className="text-[11.5px] font-semibold">{label}</span>
    </Link>
  );
}

const Metric = ({ label, value, icon: Icon, loading }: { label: string; value: number; icon: typeof Activity; loading?: boolean }) => (
  <div className="squircle-lg bg-surface-0/85 border border-hairline p-3.5 shadow-sm min-h-[104px]">
    <div className="size-8 squircle bg-primary-soft text-primary grid place-items-center mb-3">
      <Icon className="h-4 w-4" />
    </div>
    {loading ? (
      <div className="h-8 w-14 rounded-lg bg-surface-2 animate-pulse" />
    ) : (
      <p className="font-display text-2xl md:text-3xl tabular text-ink">{value}</p>
    )}
    <p className="text-[11.5px] text-ink-3 leading-tight mt-1">{label}</p>
  </div>
);

const RowsSkeleton = () => (
  <div className="space-y-2.5">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex items-center gap-3 rounded-[1rem] bg-surface-1/80 p-3">
        <div className="size-9 squircle bg-surface-2 animate-pulse shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-3/4 rounded-full bg-surface-2 animate-pulse" />
          <div className="h-2.5 w-1/2 rounded-full bg-surface-2 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

const ServicePrompt = ({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Activity;
  title: string;
  text: string;
}) => (
  <div className="flex items-start gap-3 rounded-[1rem] bg-surface-1 p-3.5">
    <span className="grid size-9 shrink-0 place-items-center rounded-[0.8rem] bg-primary-soft text-primary">
      <Icon className="h-4 w-4" strokeWidth={2.35} />
    </span>
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{text}</p>
    </div>
  </div>
);

const Panel = ({
  title,
  subtitle,
  icon: Icon,
  to,
  cta,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Activity;
  to: string;
  cta: string;
  className?: string;
  children: ReactNode;
}) => (
  <article className={cn("squircle-xl bg-surface-0 border border-hairline p-5 shadow-sm min-w-0 max-w-full", className)}>
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="size-10 squircle bg-ink text-white grid place-items-center shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-xl tracking-headline text-ink truncate">{title}</h3>
          <p className="text-[12.5px] text-ink-3">{subtitle}</p>
        </div>
      </div>
      <Link to={to} className="size-9 squircle bg-surface-1 border border-hairline grid place-items-center text-ink-3 hover:text-primary tap shrink-0" aria-label={cta}>
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
    {children}
    <Link to={to} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
      {cta}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  </article>
);

export default LiveOperations;
