import { ShieldCheck, Lock, HeartPulse, Stethoscope, Building2, Sparkles } from "lucide-react";

const tokens = [
  { icon: ShieldCheck, label: "Infos protégées" },
  { icon: Lock, label: "Accès maîtrisé" },
  { icon: HeartPulse, label: "Suivi au quotidien" },
  { icon: Stethoscope, label: "Professionnels vérifiés" },
  { icon: Building2, label: "Postes, centres, cabinets" },
  { icon: Sparkles, label: "Orientation claire" },
];

const Row = () => (
  <div className="flex items-center gap-10 px-5 shrink-0">
    {tokens.map(({ icon: Icon, label }) => (
      <div key={label} className="flex items-center gap-2.5 shrink-0">
        <Icon className="h-3.5 w-3.5 text-ink-3" strokeWidth={2.2} />
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 whitespace-nowrap">
          {label}
        </span>
        <span className="size-1 rounded-full bg-ink/20" aria-hidden />
      </div>
    ))}
  </div>
);

const TrustMarquee = () => (
  <section className="relative py-10 overflow-hidden border-y border-hairline bg-surface-1/50">
    <div
      className="flex w-max animate-marquee will-change-transform"
      style={{ animationDuration: "42s" }}
    >
      <Row />
      <Row />
    </div>
    {/* edge fade masks */}
    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
  </section>
);

export default TrustMarquee;
