import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/aymane-logo.png";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location.pathname === "/";

  const links = [
    { href: "#produit", label: "Produit" },
    { href: "#operations", label: "Autour de vous" },
    { href: "#professionnels", label: "Professionnels" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 safe-top px-3 md:px-6 pt-3">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "mx-auto max-w-6xl flex items-center justify-between h-14 px-4 md:px-5 squircle-full transition-all duration-500 ease-smooth",
            scrolled ? "glass-strong shadow-md" : "bg-transparent"
          )}
        >
          <Link to="/" className="flex items-center gap-2 tap min-w-0">
            <img src={logo} alt="AYMANE" className="h-8 md:h-9 w-auto object-contain shrink-0" />
            <span className="font-display text-[16px] md:text-[17px] tracking-headline text-ink truncate">AYMANE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <a key={l.href} href={isHome ? l.href : "/" + l.href} className="text-[13.5px] font-medium text-ink-2 hover:text-ink underline-magnetic transition-colors">
                {l.label}
              </a>
            ))}
            <Link to="/tarifs" className="text-[13.5px] font-medium text-ink-2 hover:text-ink underline-magnetic transition-colors">
              Tarifs
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <button onClick={signOut} className="text-[13.5px] font-medium text-ink-3 hover:text-ink px-3">Déconnexion</button>
                <button onClick={() => navigate("/dashboard")} className="btn-pill bg-ink text-white text-[13.5px] hover:bg-ink-2 transition-colors">
                  Mon espace
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/auth/provider")} className="text-[13.5px] font-medium text-ink-2 hover:text-ink px-3">
                  Espace pro
                </button>
                <button onClick={() => navigate("/auth")} className="text-[13.5px] font-medium text-ink-2 hover:text-ink px-3">
                  Se connecter
                </button>
                <button onClick={() => navigate("/auth")} className="btn-pill bg-ink text-white text-[13.5px] hover:bg-ink-2 shadow-sm transition-colors">
                  Créer mon compte
                </button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 -mr-1 tap"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <motion.span animate={{ rotate: open ? 45 : 0, y: open ? 7 : 0 }} className="block h-0.5 w-full bg-ink rounded-full" />
              <motion.span animate={{ opacity: open ? 0 : 1 }} className="block h-0.5 w-full bg-ink rounded-full" />
              <motion.span animate={{ rotate: open ? -45 : 0, y: open ? -7 : 0 }} className="block h-0.5 w-full bg-ink rounded-full" />
            </div>
          </button>
        </motion.div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-[45] glass-strong safe-top pt-24 px-6"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
              className="flex flex-col gap-1"
            >
              {links.map((l) => (
                <motion.a
                  key={l.href}
                  href={isHome ? l.href : "/" + l.href}
                  onClick={() => setOpen(false)}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  className="font-display text-3xl tracking-display text-ink py-3 tap"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <Link
                  to="/tarifs"
                  onClick={() => setOpen(false)}
                  className="font-display text-3xl tracking-display text-ink py-3 tap block"
                >
                  Tarifs
                </Link>
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                className="mt-8 flex flex-col gap-3"
              >
                {user ? (
                  <button onClick={() => { setOpen(false); navigate("/dashboard"); }} className="btn-pill bg-ink text-white h-14 text-base">
                    Aller à mon espace
                  </button>
                ) : (
                  <>
                    <button onClick={() => { setOpen(false); navigate("/auth"); }} className="btn-pill bg-ink text-white h-14 text-base">
                      Commencer
                    </button>
                    <button onClick={() => { setOpen(false); navigate("/auth"); }} className="btn-pill h-14 text-base text-ink-2 bg-surface-1">
                      J'ai déjà un compte
                    </button>
                  </>
                )}
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
