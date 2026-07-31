import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Home, MapPinned, Pill, Stethoscope } from "lucide-react";
import logo from "@/assets/aymane-logo.png";
import { cn } from "@/lib/utils";

interface PublicToolLayoutProps {
  children: ReactNode;
  title: string;
  mobileAction?: ReactNode;
}

const publicNav = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/triage", label: "Orientation", icon: Stethoscope },
  { to: "/annuaire", label: "Annuaire", icon: MapPinned },
  { to: "/pharmacie", label: "Pharmacie", icon: Pill },
] as const;

const PublicToolLayout = ({ children, title, mobileAction }: PublicToolLayoutProps) => {
  const { pathname } = useLocation();

  return (
    <div className="app-page-gradient min-h-[100dvh] text-ink">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface-0/94 backdrop-blur-xl safe-top">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/"
              className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] text-ink-2 transition-colors hover:bg-surface-1 tap sm:hidden"
              aria-label="Retour à l'accueil"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
            </Link>
            <Link to="/" className="hidden items-center gap-2.5 tap sm:flex">
              <img src={logo} alt="AYMANE" className="h-8 w-auto object-contain" />
              <span className="font-display text-[16px]">AYMANE</span>
            </Link>
          </div>

          <span className="absolute left-1/2 max-w-[42%] -translate-x-1/2 truncate text-[13px] font-semibold text-ink-2 sm:hidden">
            {title}
          </span>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation publique">
            {publicNav.slice(1).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-[0.7rem] px-3 py-2 text-[12.5px] font-semibold transition-colors tap",
                  pathname === item.to ? "bg-ink text-white" : "text-ink-3 hover:bg-surface-1 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {mobileAction}
            <Link
              to="/auth"
              state={{ from: { pathname } }}
              className="rounded-[0.7rem] bg-primary px-3 py-2 text-[12px] font-semibold text-white tap sm:px-4 sm:text-[12.5px]"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[1180px] px-4 py-6 pb-28 sm:px-6 md:px-8 md:py-9 md:pb-12">
        {children}
      </main>

      <nav
        className="fixed bottom-3 left-3 right-3 z-40 rounded-[1rem] border border-hairline bg-surface-0/96 p-1.5 shadow-lg backdrop-blur-xl pb-safe-bottom md:hidden"
        aria-label="Navigation santé"
      >
        <ul className="grid grid-cols-4">
          {publicNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[0.75rem] px-1 text-[9.5px] font-semibold tap",
                    active ? "bg-ink text-white" : "text-ink-3",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default PublicToolLayout;
