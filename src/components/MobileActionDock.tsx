import { Link, useLocation } from "react-router-dom";
import { Brain, House, Pill, ShieldCheck, Siren } from "lucide-react";

const actions = [
  { label: "Accueil", to: "/", icon: House, tone: "text-primary", bg: "bg-primary-soft" },
  { label: "Soin", to: "/triage", icon: Brain, tone: "text-primary", bg: "bg-primary-soft" },
  { label: "Pharma", to: "/pharmacie", icon: Pill, tone: "text-secondary", bg: "bg-secondary-soft" },
  { label: "SOS", to: "/sos", icon: Siren, tone: "text-accent", bg: "bg-accent-soft" },
  { label: "Compte", to: "/auth", icon: ShieldCheck, tone: "text-ink", bg: "bg-surface-1" },
] as const;

const MobileActionDock = () => {
  const location = useLocation();

  return (
    <nav aria-label="Actions rapides" className="md:hidden fixed inset-x-4 bottom-2 z-40 safe-bottom">
      <div className="rounded-[1.15rem] bg-surface-0/96 backdrop-blur-xl border border-hairline shadow-lg px-1 py-0.5 grid grid-cols-5 gap-0.5">
        {actions.map(({ label, to, icon: Icon, tone, bg }) => (
          <Link
            key={label}
            to={to}
            aria-current={location.pathname === to ? "page" : undefined}
            className={`min-h-[46px] rounded-[0.9rem] grid place-items-center gap-0.5 text-[9.5px] font-semibold tap ${
              location.pathname === to ? "bg-ink text-white" : "text-ink-3"
            }`}
          >
            <span className={`size-6 rounded-full grid place-items-center ${location.pathname === to ? "bg-white/12" : bg}`}>
              <Icon className={`h-3.5 w-3.5 ${location.pathname === to ? "text-white" : tone}`} strokeWidth={2.35} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileActionDock;
