import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Stethoscope, Wallet } from "lucide-react";

const proof = [
  "Orientation claire",
  "Paiement local",
  "Carnet prêt",
] as const;

const CTA = () => (
  <section id="contact" className="px-4 py-6 sm:px-5 md:px-8 md:py-18">
    <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.35rem] bg-ink text-white shadow-xl md:rounded-[1.6rem]">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-4 md:p-9">
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-primary-glow">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
            Un seul espace santé
          </span>
          <h2 className="mt-3 max-w-2xl text-balance font-display text-[27px] leading-[1.02] md:mt-4 md:text-5xl">
            Préparez le soin avant de sortir de la maison.
          </h2>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-white/64 md:mt-4 md:text-base">
            Le patient garde ses repères. Le professionnel reçoit les bonnes informations.
            La pharmacie confirme avant le déplacement.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-1.5 md:mt-5 md:gap-2">
            {proof.map((item) => (
              <div key={item} className="flex min-h-[66px] flex-col items-start justify-between gap-2 rounded-[0.8rem] border border-white/10 bg-white/6 p-2.5 md:min-h-0 md:flex-row md:items-center md:rounded-[0.9rem] md:px-3 md:py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-glow" strokeWidth={2.5} />
                <span className="text-[10.5px] font-semibold leading-tight text-white/82 md:text-[12px]">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 md:mt-6 md:flex md:flex-row">
            <Link
              to="/auth"
              className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-semibold text-ink tap md:h-12 md:px-5 md:text-[14px]"
            >
              <span className="md:hidden">Espace patient</span>
              <span className="hidden md:inline">Créer mon espace patient</span>
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
            </Link>
            <Link
              to="/auth/provider"
              className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/18 bg-white/8 px-3 text-[12px] font-semibold text-white tap md:h-12 md:px-5 md:text-[14px]"
            >
              <Stethoscope className="h-4 w-4" strokeWidth={2.3} />
              <span className="md:hidden">Espace pro</span>
              <span className="hidden md:inline">Espace professionnel</span>
            </Link>
          </div>
        </div>

        <aside className="border-t border-white/10 bg-white/[0.04] p-4 lg:border-l lg:border-t-0 md:p-7">
          <div className="rounded-[1rem] bg-white p-3.5 text-ink md:rounded-[1.1rem] md:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary">Paiement local</p>
                <h3 className="mt-2 font-display text-xl leading-none md:text-2xl">Wave, Orange Money, Free Money.</h3>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-[0.85rem] bg-primary-soft text-primary">
                <Wallet className="h-4 w-4" strokeWidth={2.35} />
              </span>
            </div>
            <div className="mt-4 divide-y divide-hairline">
              {["Demande préparée", "Numéro vérifié", "Suivi dans AYMANE"].map((item) => (
                <div key={item} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 md:py-3">
                  <span className="text-[13px] font-semibold text-ink-2">{item}</span>
                  <CheckCircle2 className="h-4 w-4 text-secondary" strokeWidth={2.5} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  </section>
);

export default CTA;
