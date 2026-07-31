import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileHeart,
  HeartPulse,
  Menu,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/aymane-logo.png";
import { cn } from "@/lib/utils";

type AudienceKey = "patient" | "provider" | "reviewer" | "admin";

type Audience = {
  key: AudienceKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  greeting: string;
  focus: string;
  metric: string;
  metricLabel: string;
  secondaryMetric: string;
  secondaryLabel: string;
  actions: { label: string; detail: string; icon: LucideIcon; tone: string }[];
  next: string;
  outcome: string;
};

const audiences: Audience[] = [
  {
    key: "patient",
    label: "Parcours patient",
    shortLabel: "Patient",
    icon: HeartPulse,
    greeting: "Bonjour Awa",
    focus: "Votre santé aujourd'hui",
    metric: "3 min",
    metricLabel: "pour être orientée",
    secondaryMetric: "14:30",
    secondaryLabel: "consultation confirmée",
    actions: [
      { label: "Décrire mes symptômes", detail: "Une orientation claire, sans jargon", icon: Activity, tone: "bg-primary-soft text-primary" },
      { label: "Consulter un médecin", detail: "Dr Aminata Sow, disponible à 14:30", icon: Stethoscope, tone: "bg-success-soft text-success" },
      { label: "Retrouver mon dossier", detail: "Ordonnances, vaccins et analyses", icon: FileHeart, tone: "bg-warning-soft text-warning" },
    ],
    next: "Awa confirme son créneau et reçoit son rappel sur son téléphone.",
    outcome: "Moins d'hésitation, un soin trouvé plus vite.",
  },
  {
    key: "provider",
    label: "Espace prestataire",
    shortLabel: "Prestataire",
    icon: Stethoscope,
    greeting: "Dr Aminata Sow",
    focus: "Consultations du jour",
    metric: "11",
    metricLabel: "patients planifiés",
    secondaryMetric: "2",
    secondaryLabel: "dossiers à compléter",
    actions: [
      { label: "Awa Ndiaye", detail: "14:30 · Téléconsultation", icon: CalendarCheck2, tone: "bg-primary-soft text-primary" },
      { label: "Moussa Fall", detail: "15:10 · Suivi tension", icon: Activity, tone: "bg-success-soft text-success" },
      { label: "Fatou Bâ", detail: "16:00 · Résultats d'analyse", icon: ClipboardCheck, tone: "bg-warning-soft text-warning" },
    ],
    next: "Le médecin ouvre le résumé utile avant la consultation et rédige son compte rendu.",
    outcome: "Une journée organisée et des dossiers mieux suivis.",
  },
  {
    key: "reviewer",
    label: "Agent dossiers",
    shortLabel: "Dossiers",
    icon: ClipboardCheck,
    greeting: "Cellule d'agrément",
    focus: "Demandes à étudier",
    metric: "8",
    metricLabel: "dossiers en attente",
    secondaryMetric: "3",
    secondaryLabel: "compléments reçus",
    actions: [
      { label: "Cabinet Keur Santé", detail: "Pièces complètes · À examiner", icon: Building2, tone: "bg-primary-soft text-primary" },
      { label: "Pharmacie Ndar", detail: "Diplôme complémentaire reçu", icon: BadgeCheck, tone: "bg-success-soft text-success" },
      { label: "Labo Baobab", detail: "Justificatif d'adresse demandé", icon: MessageCircle, tone: "bg-warning-soft text-warning" },
    ],
    next: "L'agent motive son avis puis transmet le dossier complet à l'administrateur.",
    outcome: "Une validation traçable, équitable et plus rapide.",
  },
  {
    key: "admin",
    label: "Pilotage administrateur",
    shortLabel: "Admin",
    icon: ShieldCheck,
    greeting: "Pilotage AYMANE",
    focus: "Activité de la plateforme",
    metric: "74",
    metricLabel: "demandes ce mois",
    secondaryMetric: "92,4%",
    secondaryLabel: "dossiers traités à temps",
    actions: [
      { label: "Agrément prestataire", detail: "5 décisions finales à rendre", icon: UserRoundCheck, tone: "bg-primary-soft text-primary" },
      { label: "Paiements et retraits", detail: "3 opérations à contrôler", icon: Banknote, tone: "bg-success-soft text-success" },
      { label: "Qualité de service", detail: "Délai moyen : 1 j 8 h", icon: Activity, tone: "bg-warning-soft text-warning" },
    ],
    next: "L'administrateur décide, contrôle les opérations et suit la qualité globale.",
    outcome: "Des responsabilités séparées et une gouvernance lisible.",
  },
];

const businessLines = [
  { label: "Abonnements", detail: "Formules individuelles et familiales", icon: UsersRound },
  { label: "Services", detail: "Commission encadrée sur les prestations", icon: WalletCards },
  { label: "Partenariats", detail: "Structures, laboratoires et pharmacies", icon: Building2 },
];

const productSteps = [
  { number: "01", title: "Choisir son besoin", detail: "Le bon point d'entrée apparaît immédiatement selon le profil." },
  { number: "02", title: "Agir sans détour", detail: "Chaque écran met en avant une seule prochaine action." },
  { number: "03", title: "Suivre le résultat", detail: "Rappels, décisions et documents restent accessibles au même endroit." },
];

const spring = { type: "spring" as const, stiffness: 180, damping: 24 };

function ProductPreview({ audience }: { audience: Audience }) {
  return (
    <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-[hsl(var(--primary-deep))] text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-success" />
          <span className="text-xs font-semibold text-white/75">Démonstration AYMANE</span>
        </div>
        <span className="font-mono text-[10px] text-white/45">Sénégal · aujourd'hui</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={audience.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
          className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]"
        >
          <section className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <p className="text-xs font-semibold text-white/55">{audience.greeting}</p>
            <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-white md:text-[2rem]">
              {audience.focus}
            </h2>

            <div className="mt-8 grid grid-cols-2 gap-4 border-y border-white/10 py-5">
              <div>
                <p className="font-mono text-2xl font-semibold text-white">{audience.metric}</p>
                <p className="mt-1 text-xs leading-4 text-white/50">{audience.metricLabel}</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold text-white">{audience.secondaryMetric}</p>
                <p className="mt-1 text-xs leading-4 text-white/50">{audience.secondaryLabel}</p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[0.55rem] bg-white/10">
                <Check className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <p className="text-sm leading-5 text-white/70">{audience.outcome}</p>
            </div>
          </section>

          <section className="bg-white p-4 text-ink md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-ink-3">À faire maintenant</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">Actions prioritaires</p>
              </div>
              <button type="button" className="flex size-9 items-center justify-center rounded-[0.65rem] border border-hairline bg-surface-1 text-ink-3 transition-transform active:scale-[0.98]" aria-label="Ouvrir le menu de démonstration">
                <Menu className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-4 divide-y divide-hairline border-y border-hairline">
              {audience.actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} type="button" className="group flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-surface-1 active:bg-surface-2">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[0.7rem]", action.tone)}>
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{action.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-3">{action.detail}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-[0.8rem] bg-primary-soft p-3.5">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
              <p className="text-xs leading-5 text-ink-2">{audience.next}</p>
            </div>
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function InvestorTour() {
  const [activeKey, setActiveKey] = useState<AudienceKey>("patient");
  const location = useLocation();
  const activeAudience = useMemo(
    () => audiences.find((audience) => audience.key === activeKey) ?? audiences[0],
    [activeKey],
  );

  useEffect(() => {
    document.title = "AYMANE · Visite investisseurs";
  }, []);

  const isPreview = new URLSearchParams(location.search).has("apercu");

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface-0/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:h-[4.5rem] md:px-8">
          <Link to="/investisseurs" className="flex min-w-0 items-center gap-2.5" aria-label="AYMANE, visite investisseurs">
            <img src={logo} alt="AYMANE" className="h-8 w-auto md:h-9" />
            <span className="hidden border-l border-hairline pl-2.5 text-xs font-semibold text-ink-3 sm:block">Visite investisseurs</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Navigation investisseurs">
            <a href="#parcours" className="hidden text-sm font-semibold text-ink-3 transition-colors hover:text-ink md:inline">Parcours</a>
            <a href="#modele" className="hidden text-sm font-semibold text-ink-3 transition-colors hover:text-ink md:inline">Modèle</a>
            <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-[0.7rem] bg-ink px-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]">
              Ouvrir AYMANE
              <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl content-center gap-8 px-4 pb-14 pt-9 md:grid-cols-[0.78fr_1.22fr] md:gap-10 md:px-8 md:pb-16 md:pt-12">
          <div className="max-w-xl self-center">
            <div className="inline-flex items-center gap-2 rounded-[0.55rem] border border-hairline bg-surface-0 px-2.5 py-1.5 text-xs font-semibold text-ink-3 shadow-xs">
              <span className="size-1.5 rounded-full bg-success" />
              {isPreview ? "Aperçu produit" : "Présentation autonome · 4 parcours"}
            </div>
            <h1 className="mt-5 text-[2.7rem] font-bold leading-[0.96] text-ink sm:text-[3.5rem] md:text-[4.5rem]">
              AYMANE
            </h1>
            <p className="mt-4 max-w-[38rem] text-xl font-semibold leading-tight text-ink-2 md:text-2xl">
              La santé devient plus simple à comprendre, à trouver et à suivre.
            </p>
            <p className="mt-4 max-w-[58ch] text-sm leading-6 text-ink-3 md:text-base md:leading-7">
              Découvrez comment un patient, un professionnel et les équipes de contrôle travaillent dans une même plateforme pensée pour les réalités du Sénégal.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#parcours" className="inline-flex h-11 items-center gap-2 rounded-[0.75rem] bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]">
                Voir les parcours
                <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
              </a>
              <Link to="/tarifs" className="inline-flex h-11 items-center rounded-[0.75rem] border border-hairline bg-surface-0 px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-1 active:scale-[0.98]">
                Comprendre le modèle
              </Link>
            </div>

            <dl className="mt-8 grid grid-cols-3 divide-x divide-hairline border-y border-hairline py-4">
              <div className="pr-3">
                <dt className="text-[11px] leading-4 text-ink-3">Profils reliés</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-ink">4</dd>
              </div>
              <div className="px-3">
                <dt className="text-[11px] leading-4 text-ink-3">Services clés</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-ink">12+</dd>
              </div>
              <div className="pl-3">
                <dt className="text-[11px] leading-4 text-ink-3">Accès</dt>
                <dd className="mt-1 text-sm font-semibold text-success">Mobile d'abord</dd>
              </div>
            </dl>
          </div>

          <div id="parcours" className="min-w-0 self-center scroll-mt-24">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choisir un parcours AYMANE">
              {audiences.map((audience) => {
                const Icon = audience.icon;
                const active = audience.key === activeKey;
                return (
                  <button
                    key={audience.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveKey(audience.key)}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-[0.65rem] border px-3 text-xs font-semibold transition-colors active:scale-[0.98]",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-hairline bg-surface-0 text-ink-3 hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    <span className="md:hidden">{audience.shortLabel}</span>
                    <span className="hidden md:inline">{audience.label}</span>
                  </button>
                );
              })}
            </div>
            <ProductPreview audience={activeAudience} />
            <p className="mt-3 text-center text-[11px] leading-4 text-ink-4 md:text-left">
              Données illustratives conçues pour présenter le fonctionnement de la plateforme.
            </p>
          </div>
        </section>

        <section className="border-y border-hairline bg-surface-0" aria-labelledby="simple-title">
          <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
            <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
              <div>
                <p className="text-xs font-semibold text-primary">Une logique commune</p>
                <h2 id="simple-title" className="mt-3 text-3xl font-bold leading-tight text-ink md:text-4xl">Trois gestes suffisent.</h2>
                <p className="mt-4 max-w-[48ch] text-sm leading-6 text-ink-3 md:text-base md:leading-7">
                  Peu importe le profil, AYMANE conserve la même logique : comprendre, agir, suivre.
                </p>
              </div>
              <div className="divide-y divide-hairline border-y border-hairline">
                {productSteps.map((step) => (
                  <article key={step.number} className="grid grid-cols-[2.5rem_1fr] gap-3 py-5 md:grid-cols-[3rem_0.7fr_1fr] md:items-center md:gap-5">
                    <span className="font-mono text-xs font-semibold text-primary">{step.number}</span>
                    <h3 className="text-base font-semibold leading-5 text-ink">{step.title}</h3>
                    <p className="col-start-2 text-sm leading-6 text-ink-3 md:col-start-3">{step.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="modele" className="scroll-mt-24" aria-labelledby="model-title">
          <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
            <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-14">
              <div>
                <p className="text-xs font-semibold text-primary">Modèle durable</p>
                <h2 id="model-title" className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-ink md:text-4xl">
                  Une plateforme utile à chaque partie prenante.
                </h2>
                <div className="mt-8 divide-y divide-hairline border-y border-hairline">
                  {businessLines.map((line) => {
                    const Icon = line.icon;
                    return (
                      <div key={line.label} className="flex items-center gap-4 py-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.7rem] bg-primary-soft text-primary">
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ink">{line.label}</p>
                          <p className="mt-0.5 text-xs leading-5 text-ink-3">{line.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-[1rem] bg-primary-soft p-5 md:p-7">
                <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={2} />
                <h3 className="mt-6 text-xl font-semibold leading-tight text-ink">La confiance avant la croissance.</h3>
                <p className="mt-3 text-sm leading-6 text-ink-3">
                  Les rôles sont séparés, les avis sont motivés et l'accès au dossier médical reste contrôlé par le patient.
                </p>
                <Link to="/securite" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Lire nos engagements
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-t border-hairline bg-[hsl(var(--primary-deep))] text-white">
          <div className="mx-auto grid max-w-7xl gap-7 px-4 py-12 md:grid-cols-[1fr_auto] md:items-center md:px-8 md:py-16">
            <div>
              <p className="text-xs font-semibold text-white/55">La suite de la visite</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-white md:text-4xl">Explorez AYMANE à votre rythme.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Les pages publiques restent accessibles sans compte. Les espaces de santé demandent une connexion sécurisée.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Link to="/directory" className="inline-flex h-11 items-center gap-2 rounded-[0.7rem] bg-white px-4 text-sm font-semibold text-[hsl(var(--primary-deep))] transition-transform active:scale-[0.98]">
                Voir l'annuaire
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link to="/triage" className="inline-flex h-11 items-center rounded-[0.7rem] border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98]">
                Tester l'orientation
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-surface-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>AYMANE · La santé, simplement.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/cgu">Conditions</Link>
            <Link to="/mentions-legales">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
