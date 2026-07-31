import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Pill, Siren, Stethoscope, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/aymane-logo.png";

const slides = [
  {
    icon: Stethoscope,
    eyebrow: "Orientation santé",
    title: "Savoir quoi faire avant de bouger.",
    desc: "Décrivez le souci avec vos mots. AYMANE propose une prochaine étape et le type de soin à chercher.",
    proof: ["Niveau d’urgence lisible", "Spécialité recommandée", "Adresse utile à proximité"],
  },
  {
    icon: Pill,
    eyebrow: "Pharmacie",
    title: "Vérifier un médicament avant le déplacement.",
    desc: "Consultez le stock et le prix indicatif, puis gardez votre ordonnance à portée de main.",
    proof: ["Stock disponible", "Ordonnance regroupée", "Demande préparée"],
  },
  {
    icon: Siren,
    eyebrow: "Urgence SOS",
    title: "Partager les bonnes informations quand chaque minute compte.",
    desc: "La position, le motif et les contacts utiles restent réunis pour faciliter la prise en charge.",
    proof: ["Position transmise", "Proche informé", "Suivi de l’alerte"],
  },
] as const;

const Onboarding = () => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Bienvenue — AYMANE";
  }, []);

  const finish = () => {
    localStorage.setItem("st_onboarded", "1");
    navigate("/auth");
  };

  const slide = slides[index];
  const Icon = slide.icon;

  return (
    <main id="main-content" className="app-page-gradient min-h-[100dvh]">
      <header className="px-4 sm:px-6 md:px-8 safe-top">
        <div className="mx-auto max-w-6xl h-16 flex items-center justify-between border-b border-hairline">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="AYMANE" className="h-7 w-auto object-contain" />
            <span className="font-display text-[15px] text-ink">AYMANE</span>
          </Link>
          <button onClick={finish} className="text-[13px] font-semibold text-ink-3 hover:text-ink tap">
            Passer
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 py-8 md:py-12 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:items-center">
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-primary">{slide.eyebrow}</p>
              <h1 className="mt-4 max-w-xl font-display text-4xl md:text-5xl leading-[1.02] text-ink text-balance">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] md:text-base leading-relaxed text-ink-3">{slide.desc}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-2" aria-label={`Étape ${index + 1} sur ${slides.length}`}>
            {slides.map((_, itemIndex) => (
              <button
                key={itemIndex}
                onClick={() => setIndex(itemIndex)}
                aria-label={`Aller à l’étape ${itemIndex + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  itemIndex === index ? "w-10 bg-primary" : "w-5 bg-surface-2",
                )}
              />
            ))}
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
            {index < slides.length - 1 ? (
              <button onClick={() => setIndex((current) => current + 1)} className="btn-pill h-12 bg-ink text-white text-[14px] font-semibold">
                Continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={finish} className="btn-pill h-12 bg-ink text-white text-[14px] font-semibold">
                Créer mon espace
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <Link to="/auth" className="btn-pill h-12 border border-hairline bg-surface-0 text-ink text-[14px] font-semibold">
              J’ai déjà un compte
            </Link>
          </div>
        </div>

        <div className="mt-10 lg:mt-0 rounded-[1.25rem] bg-ink p-3 text-white shadow-lg">
          <div className="rounded-[1rem] bg-white p-5 text-ink">
            <div className="flex items-center justify-between gap-3 border-b border-hairline pb-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-primary">Aperçu du parcours</p>
                <p className="mt-2 font-display text-2xl">{slide.eyebrow}</p>
              </div>
              <span className="size-11 rounded-[0.85rem] bg-primary-soft text-primary grid place-items-center">
                <Icon className="h-5 w-5" strokeWidth={2.35} />
              </span>
            </div>

            <div className="mt-5 divide-y divide-hairline">
              {slide.proof.map((item) => (
                <div key={item} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" strokeWidth={2.5} />
                  <span className="text-[13.5px] font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { icon: Stethoscope, label: "Soin" },
              { icon: Video, label: "À distance" },
              { icon: Siren, label: "SOS" },
            ].map(({ icon: ItemIcon, label }) => (
              <div key={label} className="rounded-[0.8rem] border border-white/10 bg-white/6 px-3 py-3">
                <ItemIcon className="h-4 w-4 text-primary-glow" strokeWidth={2.25} />
                <p className="mt-2 text-[11.5px] font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Onboarding;
