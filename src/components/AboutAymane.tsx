import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  CreditCard,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const participants = [
  {
    icon: HeartPulse,
    title: "Patients et familles",
    text: "Comprendre le besoin, trouver la bonne adresse et garder les documents utiles au même endroit.",
  },
  {
    icon: Stethoscope,
    title: "Professionnels de santé",
    text: "Recevoir les informations importantes, confirmer la prise en charge et organiser le suivi.",
  },
  {
    icon: ClipboardCheck,
    title: "Cellule de gestion des dossiers",
    text: "Étudier les demandes des prestataires et rendre un avis motivé, favorable ou non favorable.",
  },
  {
    icon: ShieldCheck,
    title: "Administration générale",
    text: "Superviser les accès, la sécurité, l’activité et la qualité globale de la plateforme.",
  },
] as const;

const model = [
  {
    icon: CreditCard,
    title: "Abonnements accessibles",
    text: "Des formules individuelles, familiales et professionnelles adaptées aux usages locaux.",
  },
  {
    icon: HeartPulse,
    title: "Services de santé",
    text: "Une commission transparente et encadrée sur les services réellement réalisés dans la plateforme.",
  },
  {
    icon: Building2,
    title: "Partenariats utiles",
    text: "Des collaborations avec structures, pharmacies, laboratoires et organisations de santé.",
  },
] as const;

const AboutAymane = () => (
  <section id="a-propos" className="scroll-mt-24 border-y border-primary/10 bg-primary-soft/45 px-4 py-9 sm:px-5 md:px-8 md:py-24">
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-5 border-b border-primary/10 pb-8 md:grid-cols-[0.78fr_1.22fr] md:items-end md:gap-14 md:pb-12">
        <div>
          <p className="label text-primary">À propos d’AYMANE</p>
          <h2 className="mt-3 max-w-xl text-balance font-display text-[29px] leading-[1.02] text-ink md:text-5xl">
            Une santé plus simple, pensée depuis le Sénégal.
          </h2>
        </div>
        <div className="md:pb-1">
          <p className="max-w-2xl text-[14px] leading-7 text-ink-2 md:text-[17px]">
            AYMANE rapproche les patients, les soignants et les services de santé autour d’une même prochaine étape. La technologie prépare et relie. Le professionnel garde la décision médicale.
          </p>
          <Link
            to="/securite"
            className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-primary underline-magnetic md:text-[14px]"
          >
            Découvrir nos engagements
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.3} />
          </Link>
        </div>
      </div>

      <div className="grid gap-8 pt-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pt-12">
        <div>
          <p className="text-[12px] font-semibold text-primary">Une responsabilité claire pour chacun</p>
          <h3 className="mt-2 max-w-lg font-display text-2xl leading-[1.06] text-ink md:text-3xl">
            Quatre espaces, une seule continuité de service.
          </h3>

          <div className="mt-5 divide-y divide-primary/10 border-y border-primary/10">
            {participants.map(({ icon: Icon, title, text }) => (
              <article key={title} className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 py-4 md:grid-cols-[46px_0.72fr_1.28fr] md:items-start md:gap-5 md:py-5">
                <span className="grid size-10 place-items-center rounded-[0.8rem] bg-surface-0 text-primary shadow-xs md:size-11">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </span>
                <h4 className="pt-1 text-[14px] font-semibold leading-5 text-ink md:pt-2 md:text-[15px]">{title}</h4>
                <p className="col-start-2 text-[12.5px] leading-5 text-ink-3 md:col-start-3 md:pt-1.5 md:text-[14px] md:leading-6">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-[1.25rem] border border-white/80 bg-surface-0/85 p-5 shadow-md backdrop-blur md:rounded-[1.5rem] md:p-7">
          <p className="text-[12px] font-semibold text-primary">Un modèle fait pour durer</p>
          <h3 className="mt-2 max-w-md font-display text-2xl leading-[1.06] text-ink md:text-3xl">
            Grandir avec les usages, pas avec la complexité.
          </h3>
          <p className="mt-3 text-[13.5px] leading-6 text-ink-3 md:text-[14.5px]">
            Les revenus accompagnent les services utiles. L’accès au dossier reste contrôlé et chaque rôle voit uniquement ce qui lui est nécessaire.
          </p>

          <div className="mt-6 divide-y divide-hairline">
            {model.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink md:text-[14px]">{title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-ink-3 md:text-[13px]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  </section>
);

export default AboutAymane;
