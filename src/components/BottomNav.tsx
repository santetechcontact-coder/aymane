import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Accueil" },
  { to: "/dashboard/consultations", label: "Soins" },
  { to: "/dashboard/sos", label: "SOS", accent: true },
  { to: "/dashboard/pharmacy", label: "Pharma" },
  { to: "/dashboard/medical-record", label: "Dossier" },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur-md border-t border-ink-10 pb-safe-bottom">
      <ul className="flex justify-between items-center px-6 pt-4 pb-3">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to !== "/dashboard" && pathname.startsWith(t.to));
          return (
            <li key={t.to} className="flex-1 flex justify-center">
              <Link
                to={t.to}
                className={cn(
                  "relative tap label py-1 transition-colors",
                  active
                    ? t.accent ? "text-accent font-semibold" : "text-ink font-semibold"
                    : "text-stone hover:text-ink"
                )}
                aria-label={t.label}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="bottomnav-rule"
                    className={cn(
                      "absolute -bottom-1 left-0 right-0 h-px",
                      t.accent ? "bg-accent" : "bg-ink"
                    )}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
