import logo from "@/assets/aymane-logo.png";
import { ShieldCheck, Lock, HeartPulse } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative border-t border-hairline bg-surface-1/40">
      <div className="px-5 md:px-8 max-w-6xl mx-auto pt-8 pb-24 md:py-16">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-7 md:gap-10">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={logo} alt="AYMANE" className="h-8 md:h-9 w-auto object-contain shrink-0" />
              <span className="font-display text-lg md:text-xl tracking-headline text-ink">AYMANE</span>
            </div>
            <p className="text-[13px] md:text-[14.5px] text-ink-3 leading-relaxed">
              La santé mobile pensée depuis le Sénégal : utile au quartier, à la famille et aux soignants.
            </p>

            <div className="hidden md:flex flex-wrap gap-2 mt-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-0 border border-hairline text-[11px] text-ink-2">
                <ShieldCheck className="h-3 w-3 text-primary" strokeWidth={2.4} /> Infos protégées
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-0 border border-hairline text-[11px] text-ink-2">
                <Lock className="h-3 w-3 text-primary" strokeWidth={2.4} /> Dossier confidentiel
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-0 border border-hairline text-[11px] text-ink-2">
                <HeartPulse className="h-3 w-3 text-accent" strokeWidth={2.4} /> Pensé avec des soignants
              </span>
            </div>
          </div>

          <div className="md:hidden flex flex-wrap gap-2 text-[12px] font-semibold text-ink-2">
            <a href="/confidentialite" className="rounded-full border border-hairline bg-surface-0 px-3 py-1.5">Confidentialité</a>
            <a href="/cgu" className="rounded-full border border-hairline bg-surface-0 px-3 py-1.5">CGU</a>
            <a href="mailto:santetech.contact@gmail.com" className="rounded-full border border-hairline bg-surface-0 px-3 py-1.5">Contact</a>
          </div>

          <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-10 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-4">Parcours</p>
              <ul className="space-y-2.5 text-[14px] text-ink-2">
                <li><a href="/#operations" className="hover:text-ink transition-colors">Autour de vous</a></li>
                <li><a href="/#professionnels" className="hover:text-ink transition-colors">Professionnels</a></li>
                <li><a href="/#a-propos" className="hover:text-ink transition-colors">À propos</a></li>
                <li><a href="/triage" className="hover:text-ink transition-colors">Orientation santé</a></li>
                <li><a href="/tarifs" className="hover:text-ink transition-colors">Tarifs</a></li>
              </ul>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-4">Audience</p>
              <ul className="space-y-2.5 text-[14px] text-ink-2">
                <li><a href="/auth" className="hover:text-ink transition-colors">Patients</a></li>
                <li><a href="/auth/provider" className="hover:text-ink transition-colors">Professionnels</a></li>
                <li><a href="/auth/provider" className="hover:text-ink transition-colors">Structures</a></li>
              </ul>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-4">Légal</p>
              <ul className="space-y-2.5 text-[14px] text-ink-2">
                <li><a href="/confidentialite" className="hover:text-ink transition-colors">Confidentialité</a></li>
                <li><a href="/cgu" className="hover:text-ink transition-colors">CGU</a></li>
                <li><a href="/mentions-legales" className="hover:text-ink transition-colors">Mentions légales</a></li>
                <li><a href="/securite" className="hover:text-ink transition-colors">Sécurité</a></li>
              </ul>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-4">Contact</p>
              <ul className="space-y-2.5 text-[13px] text-ink-2">
                <li>
                  <a
                    href="mailto:santetech.contact@gmail.com"
                    className="inline-flex items-center rounded-full bg-surface-0 border border-hairline px-3 py-1.5 text-[12px] font-semibold hover:text-ink hover:border-primary/30 transition-colors"
                  >
                    Nous écrire
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 mt-7 md:mt-12 pt-5 md:pt-6 border-t border-hairline">
          <p className="text-[12px] text-ink-3">© 2026 AYMANE — Tous droits réservés</p>
          <p className="text-[12px] text-ink-3">Dakar · Sénégal · Patients, familles et soignants</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
