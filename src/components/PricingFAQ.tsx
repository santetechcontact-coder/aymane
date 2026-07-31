import { ArrowUpRight, LifeBuoy } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Reveal from "@/components/Reveal";

const faqs = [
  {
    q: "Puis-je utiliser AYMANE sans payer ?",
    a: "Oui. La création de compte, l'orientation publique et le carnet santé de base restent accessibles sans abonnement. Les plans ajoutent des services selon vos besoins.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Le paiement mobile local : Wave, Orange Money et Free Money. Le montant est affiché en FCFA, sans frais cachés. La demande est enregistrée puis suivie dans votre espace.",
  },
  {
    q: "Puis-je changer ou arrêter mon plan ?",
    a: "À tout moment. Le passage mensuel ou annuel se fait depuis votre espace. Un plan non renouvelé revient simplement à l'accès gratuit de base.",
  },
  {
    q: "Mes données de santé sont-elles protégées ?",
    a: "Votre dossier reste confidentiel : vous choisissez les soignants qui peuvent le consulter. Aucune donnée n'est revendue.",
  },
  {
    q: "Le plan Famille, comment ça marche ?",
    a: "Un espace unique pour jusqu'à 5 membres, chacun avec son dossier séparé — pratique pour suivre enfants, parents et proches, avec alertes coordonnées.",
  },
] as const;

const PricingFAQ = () => (
  <section id="faq" className="px-5 md:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr] lg:items-stretch lg:gap-6">
        <Reveal direction="scale">
          <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[1.6rem] p-7 text-white shadow-lg md:p-9 animate-gradient-pan bg-[linear-gradient(120deg,hsl(var(--primary-deep)),hsl(var(--primary)),hsl(var(--secondary)))] bg-[length:200%_200%]">
            <span className="grid size-11 place-items-center rounded-[1rem] bg-white/15 backdrop-blur-sm">
              <LifeBuoy className="h-5 w-5" strokeWidth={2.35} />
            </span>
            <h2 className="mt-5 text-balance font-display text-3xl leading-[1.02] md:text-[2.6rem]">
              Une question avant de choisir ?
            </h2>
            <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-white/80">
              L'équipe AYMANE vous répond en français simple et vous aide à choisir
              uniquement les services utiles au patient ou à la famille.
            </p>
            <a
              href="mailto:santetech.contact@gmail.com"
              className="btn-pill mt-6 h-11 w-fit bg-white px-5 text-[14px] font-semibold text-ink"
            >
              Parler à l'équipe
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
            </a>
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.08}>
          <div className="rounded-[1.6rem] border border-hairline bg-surface-0 p-5 shadow-sm md:p-7">
            <p className="label mb-3 text-primary">Questions fréquentes</p>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem key={item.q} value={`faq-${i}`} className="border-hairline">
                  <AccordionTrigger className="text-left font-display text-[16px] leading-snug text-ink hover:no-underline md:text-lg">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[13.5px] leading-relaxed text-ink-3">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

export default PricingFAQ;
