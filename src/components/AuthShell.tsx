import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MapPin, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import logo from "@/assets/aymane-logo.png";
import Reveal from "@/components/Reveal";

interface AuthShellProps {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  compact?: boolean;
}

const proofSteps = [
  { icon: Stethoscope, label: "Orientation claire", detail: "Savoir quel soin chercher" },
  { icon: MapPin, label: "Adresse utile", detail: "Quartier, ville ou région" },
  { icon: Pill, label: "Suite regroupée", detail: "Dossier, pharmacie et rendez-vous" },
] as const;

const AuthShell = ({
  children,
  backTo = "/",
  backLabel = "Accueil",
  compact = false,
}: AuthShellProps) => (
  <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
    <div className="min-w-0">
      <header className="px-4 sm:px-6 md:px-8 pt-4">
        <div className={compact ? "mx-auto max-w-md" : "mx-auto max-w-3xl"}>
          <div className="flex h-12 items-center justify-between border-b border-hairline">
            <Link to={backTo} className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-3 hover:text-ink tap">
              <ArrowLeft className="h-4 w-4" strokeWidth={2.3} />
              {backLabel}
            </Link>
            <Link to="/" className="flex items-center gap-2 tap">
              <img src={logo} alt="AYMANE" className="h-7 w-auto object-contain" />
              <span className="font-display text-[15px] text-ink">AYMANE</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="px-4 sm:px-6 md:px-8 py-7 md:py-10">
        <div className={compact ? "mx-auto max-w-md" : "mx-auto max-w-3xl"}>{children}</div>
      </main>
    </div>

    <aside className="relative hidden lg:flex sticky top-0 h-[100dvh] flex-col justify-between overflow-hidden bg-ink p-8 text-white">
      {/* Aurora — halo gradient qui dérive lentement (signature aurora-onboard) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 animate-aurora-drift blur-[70px] opacity-80 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.55),transparent_45%),radial-gradient(circle_at_70%_60%,hsl(var(--secondary)/0.42),transparent_50%),radial-gradient(circle_at_50%_90%,hsl(var(--halo-lilac)/0.35),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--ink))_0%,transparent_35%,transparent_65%,hsl(var(--ink))_100%)]"
      />

      <Reveal direction="up" className="relative">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-primary-glow">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.3} />
          Parcours protégé
        </div>
        <h2 className="mt-7 font-display text-4xl leading-[1.02] text-balance">
          Vos informations servent à préparer le bon soin.
        </h2>
        <p className="mt-4 text-[14px] leading-relaxed text-white/62">
          AYMANE garde le motif, les documents et les prochaines étapes dans un parcours lisible pour le patient et le soignant.
        </p>
      </Reveal>

      <div className="relative divide-y divide-white/12 border-y border-white/12">
        {proofSteps.map(({ icon: Icon, label, detail }, i) => (
          <Reveal key={label} direction="left" delay={0.12 + i * 0.1}>
            <div className="flex items-center gap-3 py-4">
              <span className="size-9 rounded-[0.7rem] bg-white/10 grid place-items-center text-primary-glow">
                <Icon className="h-4 w-4" strokeWidth={2.3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{label}</p>
                <p className="mt-0.5 text-[11.5px] text-white/52">{detail}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-secondary" strokeWidth={2.4} />
            </div>
          </Reveal>
        ))}
      </div>

      <p className="relative text-[11.5px] leading-relaxed text-white/42">
        Pensé pour le téléphone, les familles et les réalités de soin au Sénégal.
      </p>
    </aside>
  </div>
);

export default AuthShell;
