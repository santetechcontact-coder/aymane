import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/aymane-logo.png";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "AYMANE";
    const seen = localStorage.getItem("st_onboarded");
    const timer = window.setTimeout(() => navigate(seen ? "/auth" : "/onboarding", { replace: true }), 1300);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main id="main-content" className="min-h-[100dvh] grid place-items-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-xs"
      >
        <div className="flex items-center gap-3 border-b border-hairline pb-5">
          <img src={logo} alt="AYMANE" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="font-display text-2xl text-ink">AYMANE</h1>
            <p className="mt-1 text-[12.5px] text-ink-3">Le bon soin, plus vite</p>
          </div>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full bg-primary"
          />
        </div>
        <p className="mt-3 text-[11.5px] text-ink-4">Préparation de votre espace santé</p>
      </motion.div>
    </main>
  );
};

export default Splash;
