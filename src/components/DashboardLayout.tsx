import { ReactNode, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  BriefcaseMedical,
  Building2,
  Calendar,
  ChevronLeft,
  ClipboardList,
  Compass,
  FileText,
  FlaskConical,
  FolderLock,
  HeartPulse,
  Home,
  LogOut,
  MessageCircle,
  Pill,
  ReceiptText,
  ShieldCheck,
  Siren,
  UserCircle2,
  Video,
  Wallet,
  Users,
} from "lucide-react";
import { ROLE_LABELS, useAuth, type AppRole } from "@/hooks/useAuth";
import logo from "@/assets/aymane-logo.png";
import { cn } from "@/lib/utils";
import { PageTransition } from "./Motion";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  dateLabel?: string;
  back?: boolean;
  mobileAction?: ReactNode;
}

type NavItem = { to: string; label: string; icon: typeof Home; accent?: boolean };
type SpaceTone = "patient" | "doctor" | "pharmacist" | "admin";

const buildNav = (
  roles: AppRole[],
): { primary: NavItem[]; secondary: NavItem[]; spaceLabel: string; tone: SpaceTone } => {
  if (roles.includes("admin")) {
    return {
      tone: "admin",
      spaceLabel: "Administration",
      primary: [
        { to: "/dashboard", label: "Vue d’ensemble", icon: Home },
        { to: "/dashboard/admin", label: "Validations", icon: ShieldCheck },
        { to: "/dashboard/admin-finance", label: "Finance", icon: Wallet },
        { to: "/dashboard/dispatch", label: "SOS en cours", icon: Siren, accent: true },
        { to: "/dashboard/directory", label: "Annuaire", icon: Compass },
      ],
      secondary: [
        { to: "/dashboard/health-content", label: "Contenus santé", icon: FileText },
        { to: "/dashboard/security", label: "Sécurité", icon: ShieldCheck },
        { to: "/dashboard/messages", label: "Messagerie", icon: MessageCircle },
        { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle2 },
      ],
    };
  }

  if (roles.includes("application_reviewer")) {
    return {
      tone: "admin",
      spaceLabel: "Étude des dossiers",
      primary: [
        { to: "/dashboard/admin", label: "Dossiers à étudier", icon: ShieldCheck },
        { to: "/dashboard/admin-finance", label: "Pièces KYC", icon: FileText },
      ],
      secondary: [
        { to: "/dashboard/security", label: "Sécurité", icon: ShieldCheck },
        { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle2 },
      ],
    };
  }

  if (roles.some((role) => ["doctor", "dentist", "nurse", "midwife"].includes(role))) {
    return {
      tone: "doctor",
      spaceLabel: "Espace soignant",
      primary: [
        { to: "/dashboard", label: "Vue d’ensemble", icon: Home },
        { to: "/dashboard/doctor", label: "Agenda et patients", icon: Calendar },
        { to: "/dashboard/teleconsultation", label: "Téléconsultation", icon: Video },
        { to: "/dashboard/messages", label: "Messagerie", icon: MessageCircle },
      ],
      secondary: [
        { to: "/dashboard/triage", label: "Orientation santé", icon: HeartPulse },
        { to: "/dashboard/monitoring", label: "Télésurveillance", icon: HeartPulse },
        { to: "/dashboard/dispatch", label: "SOS en cours", icon: Siren, accent: true },
        { to: "/dashboard/structure", label: "Ma structure", icon: Building2 },
        { to: "/dashboard/directory", label: "Annuaire", icon: Compass },
        { to: "/dashboard/wallet", label: "Services et revenus", icon: Wallet },
        { to: "/dashboard/invoices", label: "Factures", icon: ReceiptText },
        { to: "/dashboard/security", label: "Sécurité", icon: ShieldCheck },
        { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle2 },
      ],
    };
  }

  if (roles.includes("pharmacist")) {
    return {
      tone: "pharmacist",
      spaceLabel: "Espace pharmacie",
      primary: [
        { to: "/dashboard", label: "Vue d’ensemble", icon: Home },
        { to: "/dashboard/pharmacist", label: "Commandes", icon: ClipboardList },
        { to: "/dashboard/pharmacy", label: "Médicaments", icon: Pill },
        { to: "/dashboard/messages", label: "Messagerie", icon: MessageCircle },
      ],
      secondary: [
        { to: "/dashboard/structure", label: "Mon officine", icon: Building2 },
        { to: "/dashboard/wallet", label: "Services et revenus", icon: Wallet },
        { to: "/dashboard/invoices", label: "Factures", icon: ReceiptText },
        { to: "/dashboard/security", label: "Sécurité", icon: ShieldCheck },
        { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle2 },
      ],
    };
  }

  if (roles.includes("lab_technician")) {
    return {
      tone: "doctor",
      spaceLabel: "Espace laboratoire",
      primary: [
        { to: "/dashboard", label: "Vue d’ensemble", icon: Home },
        { to: "/dashboard/lab", label: "Analyses", icon: FlaskConical },
        { to: "/dashboard/messages", label: "Messagerie", icon: MessageCircle },
      ],
      secondary: [
        { to: "/dashboard/structure", label: "Mon laboratoire", icon: Building2 },
        { to: "/dashboard/wallet", label: "Services et revenus", icon: Wallet },
        { to: "/dashboard/invoices", label: "Factures", icon: ReceiptText },
        { to: "/dashboard/security", label: "Sécurité", icon: ShieldCheck },
        { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle2 },
      ],
    };
  }

  return {
    tone: "patient",
    spaceLabel: "Espace patient",
    primary: [
      { to: "/dashboard", label: "Aujourd’hui", icon: Home },
      { to: "/dashboard/monitoring", label: "Surveillance", icon: HeartPulse },
      { to: "/dashboard/consultations", label: "Rendez-vous", icon: Calendar },
      { to: "/dashboard/messages", label: "Messagerie", icon: MessageCircle },
      { to: "/dashboard/medical-record", label: "Dossier médical", icon: FileText },
      { to: "/dashboard/pharmacy", label: "Pharmacie", icon: Pill },
      { to: "/dashboard/sos", label: "Urgence SOS", icon: Siren, accent: true },
    ],
    secondary: [
      { to: "/dashboard/teleconsultation", label: "Téléconsultation", icon: Video },
      { to: "/dashboard/services", label: "Services de santé", icon: BriefcaseMedical },
      { to: "/dashboard/care", label: "Mes suivis santé", icon: HeartPulse },
      { to: "/dashboard/health-vault", label: "Coffre santé", icon: FolderLock },
      { to: "/dashboard/subscription", label: "Abonnement et famille", icon: Users },
      { to: "/dashboard/payments", label: "Paiements", icon: Wallet },
      { to: "/dashboard/invoices", label: "Factures", icon: ReceiptText },
      { to: "/dashboard/directory", label: "Annuaire", icon: Compass },
      { to: "/dashboard/security", label: "Sécurité", icon: ShieldCheck },
      { to: "/dashboard/profile", label: "Mon profil", icon: UserCircle2 },
    ],
  };
};

const DashboardLayout = ({
  children,
  title = "AYMANE",
  back = false,
  mobileAction,
}: DashboardLayoutProps) => {
  const { signOut, roles, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { primary, secondary, spaceLabel, tone } = useMemo(() => buildNav(roles), [roles]);

  const isActive = (to: string) =>
    pathname === to || (to !== "/dashboard" && pathname.startsWith(to));

  const accountLabel = ROLE_LABELS[roles[0] ?? "patient"] ?? "Patient";
  const initials = (user?.email ?? "AY").slice(0, 2).toUpperCase();
  const roleMark = {
    patient: "bg-primary-soft text-primary",
    doctor: "bg-primary-deep text-white",
    pharmacist: "bg-secondary-soft text-secondary",
    admin: "bg-ink text-white",
  }[tone];

  const firstPrimary = primary.slice(0, 4);
  const emergency = primary.find((item) => item.accent);
  const bottom =
    emergency && !firstPrimary.some((item) => item.to === emergency.to)
      ? [...firstPrimary, emergency]
      : primary.slice(0, 5);

  return (
    <div className="min-h-[100dvh] bg-background text-ink lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="hidden lg:flex sticky top-0 h-[100dvh] flex-col border-r border-hairline bg-surface-0">
        <Link to="/" className="flex items-center gap-3 px-5 h-20 border-b border-hairline">
          <img src={logo} alt="AYMANE" className="h-9 w-auto object-contain" />
          <div className="min-w-0">
            <p className="font-display text-[17px] leading-none">AYMANE</p>
            <p className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-ink-3">
              {spaceLabel}
            </p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-5 no-scrollbar" aria-label="Navigation principale">
          <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-4">Travail</p>
          {primary.map((item) => (
            <SidebarLink key={item.to} item={item} active={isActive(item.to)} />
          ))}

          {secondary.length > 0 ? (
            <>
              <p className="px-3 mt-7 mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-4">Outils</p>
              {secondary.map((item) => (
                <SidebarLink key={item.to} item={item} active={isActive(item.to)} compact />
              ))}
            </>
          ) : null}
        </nav>

        <div className="border-t border-hairline p-3">
          <div className="flex items-center gap-3 rounded-[0.85rem] bg-surface-1 px-3 py-3">
            <span className={cn("size-9 rounded-[0.7rem] grid place-items-center text-[11px] font-bold shrink-0", roleMark)}>
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold truncate">{user?.email}</p>
              <p className="text-[10.5px] text-ink-3 truncate">{accountLabel}</p>
            </div>
            <button
              onClick={signOut}
              aria-label="Déconnexion"
              className="size-8 rounded-[0.65rem] grid place-items-center text-ink-3 hover:bg-surface-2 hover:text-accent tap"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </aside>

      <main id="main-content" className="min-w-0">
        <header className="lg:hidden sticky top-0 z-30 glass-nav safe-top">
          <div className="relative flex items-center justify-between h-14 px-4">
            {back ? (
              <button
                onClick={() => navigate(-1)}
                className="-ml-1 size-9 rounded-[0.7rem] grid place-items-center text-ink hover:bg-surface-1 tap"
                aria-label="Retour"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
              </button>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2 tap">
                <img src={logo} alt="AYMANE" className="h-7 w-auto object-contain" />
                <span className="font-display text-[15px]">AYMANE</span>
              </Link>
            )}

            <span className="absolute left-1/2 -translate-x-1/2 max-w-[42%] truncate text-[13px] font-semibold text-ink-2">
              {title}
            </span>

            <div className="flex items-center gap-1">
              {mobileAction}
              <Link
                to="/dashboard/notifications"
                className="size-9 rounded-[0.7rem] grid place-items-center text-ink-2 hover:bg-surface-1 tap"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        </header>

        <PageTransition>
          <div className="mx-auto max-w-[1180px] px-4 sm:px-6 md:px-8 xl:px-10 py-6 md:py-9 pb-28 lg:pb-10">
            {children}
          </div>
        </PageTransition>

        <nav
          className="lg:hidden fixed bottom-3 left-3 right-3 z-40 rounded-[1.15rem] border border-hairline bg-surface-0/96 backdrop-blur-xl shadow-lg pb-safe-bottom"
          aria-label="Navigation mobile"
        >
          <ul className="grid items-stretch px-1.5 py-1.5" style={{ gridTemplateColumns: `repeat(${bottom.length}, minmax(0, 1fr))` }}>
            {bottom.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative min-h-[50px] rounded-[0.85rem] flex flex-col items-center justify-center gap-1 text-[9.5px] font-semibold tap",
                      active
                        ? item.accent
                          ? "bg-accent-soft text-accent"
                          : "bg-ink text-white"
                        : "text-ink-3",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                    <span className="max-w-full truncate px-1">{item.label.split(" ")[0]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </main>
    </div>
  );
};

const SidebarLink = ({
  item,
  active,
  compact = false,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-[0.7rem] px-3 my-0.5 transition-colors",
        compact ? "h-9 text-[12.5px]" : "h-10 text-[13.5px] font-medium",
        active
          ? item.accent
            ? "bg-accent-soft text-accent"
            : "bg-ink text-white"
          : "text-ink-3 hover:bg-surface-1 hover:text-ink",
      )}
    >
      {active && !item.accent ? (
        <motion.span
          layoutId="dashboard-active-nav"
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary-glow"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      ) : null}
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
};

export default DashboardLayout;
