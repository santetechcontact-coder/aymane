import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Pill,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileId = "doctor" | "structure" | "pharmacy" | "lab";

const profiles = [
  {
    id: "doctor",
    label: "Soignant",
    icon: Stethoscope,
    title: "Recevez un patient avec les bonnes informations.",
    intent: "Motif, constantes, antécédents et documents utiles arrivent dans un parcours lisible avant la consultation.",
    route: "/auth/provider?type=doctor",
    cta: "Créer mon espace soignant",
    actions: ["Voir les demandes", "Prioriser les cas urgents", "Compléter le dossier", "Suivre le patient"],
  },
  {
    id: "structure",
    label: "Structure",
    icon: Building2,
    title: "Montrez clairement ce que votre structure peut prendre en charge.",
    intent: "Services, horaires, contacts et disponibilités aident les patients à venir au bon endroit.",
    route: "/auth/provider?type=structure",
    cta: "Inscrire ma structure",
    actions: ["Présenter les services", "Recevoir les demandes", "Orienter les patients", "Suivre l’activité"],
  },
  {
    id: "pharmacy",
    label: "Pharmacie",
    icon: Pill,
    title: "Confirmez un stock avant que le patient se déplace.",
    intent: "Ordonnances, disponibilités et demandes restent regroupées pour répondre plus vite.",
    route: "/auth/provider?type=pharmacist",
    cta: "Créer mon espace pharmacie",
    actions: ["Publier le stock", "Recevoir une demande", "Vérifier l’ordonnance", "Préparer la commande"],
  },
  {
    id: "lab",
    label: "Laboratoire",
    icon: FlaskConical,
    title: "Organisez les demandes et rendez les résultats faciles à retrouver.",
    intent: "Le patient connaît les examens disponibles, prépare sa venue et retrouve ses résultats au même endroit.",
    route: "/auth/provider?type=lab_technician",
    cta: "Créer mon espace laboratoire",
    actions: ["Recevoir les demandes", "Planifier les prélèvements", "Suivre les analyses", "Partager les résultats"],
  },
] as const;

const StakeholderGateway = () => {
  const [activeId, setActiveId] = useState<ProfileId>("doctor");
  const active = useMemo(() => profiles.find((item) => item.id === activeId) ?? profiles[0], [activeId]);
  const ActiveIcon = active.icon;

  return (
    <section id="professionnels" className="px-4 sm:px-5 md:px-8 py-7 md:py-20 bg-surface-1/55 border-y border-hairline">
      <div className="max-w-6xl mx-auto">
        <div className="md:hidden">
          <p className="label text-primary mb-2">Pour les professionnels</p>
          <h2 className="font-display text-[25px] leading-[1.02] text-ink text-balance">
            Médecin, structure, pharmacie, labo : chacun son espace.
          </h2>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {profiles.map((item) => {
              const Icon = item.icon;
              const selected = item.id === active.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "min-h-[62px] rounded-[0.9rem] border p-1.5 text-left transition-colors tap min-[360px]:p-2",
                    selected
                      ? "bg-ink text-white border-ink"
                      : "bg-surface-0 text-ink-2 border-hairline",
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-1.5", selected ? "text-primary-glow" : "text-primary")} strokeWidth={2.3} />
                  <span className="block truncate text-[9.5px] font-semibold min-[360px]:text-[10.5px]">{item.label}</span>
                </button>
              );
            })}
          </div>

          <article className="mt-3 rounded-[1.15rem] bg-surface-0 border border-hairline p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="size-9 rounded-[0.8rem] bg-primary-soft text-primary grid place-items-center shrink-0">
                <ActiveIcon className="h-4 w-4" strokeWidth={2.35} />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-xl leading-[1.08] text-ink text-balance">
                  {active.title}
                </h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{active.intent}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {active.actions.slice(0, 2).map((action) => (
                <div key={action} className="rounded-[0.85rem] bg-surface-1 p-3">
                  <CheckCircle2 className="h-4 w-4 text-secondary" strokeWidth={2.5} />
                  <p className="mt-2 text-[11.5px] font-semibold leading-tight text-ink">{action}</p>
                </div>
              ))}
            </div>

            <Link
              to={active.route}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground tap"
            >
              {active.cta}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </article>
        </div>

        <div className="hidden md:grid lg:grid-cols-[0.72fr_1.28fr] gap-7 lg:gap-12 items-start">
          <div>
            <p className="label text-primary mb-3">Pour les professionnels</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.02] text-ink text-balance">
              Un espace adapté à votre activité.
            </h2>
            <p className="text-[15px] text-ink-3 leading-relaxed mt-4 max-w-md">
              Médecin, structure, pharmacie ou laboratoire : choisissez votre métier et commencez avec les outils utiles.
            </p>
          </div>

          <div className="min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {profiles.map((item) => {
                const Icon = item.icon;
                const selected = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "min-h-[74px] rounded-[1rem] border p-3 text-left transition-colors tap",
                      selected
                        ? "bg-ink text-white border-ink"
                        : "bg-surface-0 text-ink-2 border-hairline hover:border-primary/30",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mb-2", selected ? "text-primary-glow" : "text-primary")} strokeWidth={2.3} />
                    <span className="block text-[12.5px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <article className="mt-3 rounded-[1.35rem] bg-surface-0 border border-hairline p-5 md:p-6 shadow-sm">
              <div className="grid md:grid-cols-[1.08fr_0.92fr] gap-6">
                <div className="min-w-0">
                  <div className="size-10 rounded-[0.9rem] bg-primary-soft text-primary grid place-items-center mb-4">
                    <ActiveIcon className="h-5 w-5" strokeWidth={2.35} />
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl leading-[1.06] text-ink text-balance">
                    {active.title}
                  </h3>
                  <p className="text-[14.5px] text-ink-3 leading-relaxed mt-3">{active.intent}</p>
                  <Link
                    to={active.route}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground h-11 px-5 text-[13.5px] font-semibold shadow-sm tap"
                  >
                    {active.cta}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="rounded-[1.1rem] bg-ink text-white p-4">
                  <div className="flex items-center gap-2 text-white/64 text-[11.5px] mb-4">
                    <ClipboardList className="h-4 w-4" />
                    Dans votre espace
                  </div>
                  <div className="space-y-3">
                    {active.actions.map((action) => (
                      <div key={action} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-primary-glow mt-0.5 shrink-0" strokeWidth={2.5} />
                        <p className="text-[13px] text-white/84 leading-snug">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StakeholderGateway;
