import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  Pill,
  Siren,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const flows = [
  {
    step: "01",
    title: "Patient",
    text: "Décrit le besoin, reçoit une prochaine étape claire et garde son dossier à portée de main.",
    icon: Stethoscope,
    to: "/triage",
    cta: "Tester l'orientation",
    tone: "bg-primary-soft text-primary",
    preview: ["Besoin compris", "Orientation proposée", "Avis médical si nécessaire"],
  },
  {
    step: "02",
    title: "Pharmacie",
    text: "Vérifie le médicament, prépare la demande et suit le paiement local sans détour.",
    icon: Pill,
    to: "/pharmacie",
    cta: "Voir la pharmacie",
    tone: "bg-secondary-soft text-secondary",
    preview: ["Stock indicatif", "Ordonnance liée", "Wave ou Orange Money"],
  },
  {
    step: "03",
    title: "Soignant",
    text: "Reçoit les informations utiles, vérifie l'orientation et garde la décision médicale.",
    icon: FileText,
    to: "/auth/provider",
    cta: "Espace professionnel",
    tone: "bg-surface-2 text-ink",
    preview: ["Dossier préparé", "Décision du soignant", "Suivi sécurisé"],
  },
  {
    step: "04",
    title: "Urgence",
    text: "Partage la position, le besoin et les proches à prévenir quand la situation presse.",
    icon: Siren,
    to: "/sos",
    cta: "Préparer SOS",
    tone: "bg-accent-soft text-accent",
    preview: ["Position prête", "Type d'urgence", "Suivi visible"],
  },
] as const;

const highlights = [
  { label: "FCFA", detail: "tarifs lisibles", icon: Wallet },
  { label: "Dakar", detail: "repères locaux", icon: CalendarClock },
  { label: "Carnet", detail: "toujours à portée", icon: FileText },
] as const;

const Modules = () => (
  <section id="produit" className="px-4 py-7 sm:px-5 md:px-8 md:py-18">
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[0.74fr_1.26fr] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-24">
          <p className="label mb-3 text-primary">Le produit</p>
          <h2 className="max-w-xl text-balance font-display text-[28px] leading-[1.02] text-ink md:text-5xl">
            Prévenir, orienter, consulter et suivre sans compliquer la journée.
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-3 md:text-[15px]">
            Du premier besoin à l'urgence, AYMANE prépare la prochaine étape. Le professionnel de
            santé vérifie et décide, la pharmacie peut préparer l'essentiel avant le déplacement.
          </p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-hairline border-y border-hairline py-3 md:mt-5">
            {highlights.map(({ label, detail, icon: Icon }) => (
              <div key={label} className="min-w-0 px-2 first:pl-0 last:pr-0 md:px-3">
                <Icon className="h-4 w-4 text-primary" strokeWidth={2.35} />
                <p className="mt-2 font-display text-base leading-none text-ink md:text-lg">{label}</p>
                <p className="mt-1 text-[10.5px] leading-tight text-ink-3">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid auto-cols-[minmax(250px,78vw)] grid-flow-col gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory md:auto-cols-auto md:grid-flow-row md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none">
          {flows.map((flow, index) => (
            <FlowCard key={flow.title} flow={flow} large={index === 0 || index === 3} />
          ))}
        </div>
      </div>
    </div>
  </section>
);

const FlowCard = ({
  flow,
  large,
}: {
  flow: (typeof flows)[number];
  large?: boolean;
}) => {
  const Icon: LucideIcon = flow.icon;

  return (
    <article
      className={`group h-full snap-start rounded-[1.25rem] border border-hairline bg-surface-0 p-4 shadow-sm transition-transform duration-300 hover:-translate-y-1 md:p-5 ${
        large ? "md:min-h-[258px]" : "md:min-h-[238px]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-[0.9rem] ${flow.tone}`}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.35} />
        </span>
        <span className="font-mono text-[11px] font-semibold text-ink-4">{flow.step}</span>
      </div>

      <h3 className="mt-4 font-display text-2xl leading-none text-ink">{flow.title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{flow.text}</p>

      <div className="mt-4 divide-y divide-hairline rounded-[1rem] bg-surface-1 px-3">
        {flow.preview.map((item) => (
          <div key={item} className="flex items-center gap-2 py-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.5} />
            <span className="text-[12px] font-semibold text-ink-2">{item}</span>
          </div>
        ))}
      </div>

      <Link
        to={flow.to}
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary transition-colors group-hover:text-ink"
      >
        {flow.cta}
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.35} />
      </Link>
    </article>
  );
};

export default Modules;
