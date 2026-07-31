import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { Stethoscope, Pill, Siren, FileLock2 } from "lucide-react";
import { ScrollShapes, ScrollPath, ScrollScene, type ShapeDef } from "@/components/Scroll2D";

const CONVERGENCE_SHAPES: ShapeDef[] = [
  { kind: "ring", top: "8%", left: "10%", size: 56, color: "hsl(var(--primary))", range: 180, rotateRange: 200 },
  { kind: "triangle", top: "14%", left: "86%", size: 32, color: "hsl(var(--accent))", range: -160, rotateRange: -240 },
  { kind: "plus", top: "78%", left: "8%", size: 26, color: "hsl(var(--halo-lilac))", range: 200, rotateRange: 360 },
  { kind: "dot", top: "82%", left: "90%", size: 14, color: "hsl(var(--secondary))", range: -160 },
];

/**
 * Convergence — scrollytelling court.
 * Quatre services arrivent depuis les bords et convergent vers le centre (l'utilisateur).
 * Métaphore: « la santé qui vient à vous ».
 */

const orbits = [
  { icon: Stethoscope, label: "Consultations", from: { x: -240, y: -80 }, tone: "primary" },
  { icon: Pill, label: "Pharmacie", from: { x: 240, y: -100 }, tone: "mint" },
  { icon: Siren, label: "Urgences", from: { x: -260, y: 120 }, tone: "accent" },
  { icon: FileLock2, label: "Dossier", from: { x: 260, y: 100 }, tone: "lilac" },
] as const;

const tones: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  mint: "bg-[hsl(var(--halo-mint)/0.30)] text-[hsl(162_60%_28%)]",
  accent: "bg-accent-soft text-accent",
  lilac: "bg-[hsl(var(--halo-lilac)/0.30)] text-primary",
};

const OrbitItem = ({
  progress,
  data,
  index,
}: {
  progress: MotionValue<number>;
  data: (typeof orbits)[number];
  index: number;
}) => {
  const Icon = data.icon;
  // Au scroll: viens depuis le bord → orbite proche du centre, en se valorisant
  const t = useTransform(progress, [0.05 + index * 0.02, 0.7], [0, 1]);
  // Position finale: orbite resserrée autour de l'anneau (≈ 35% de la distance d'origine)
  const x = useTransform(t, [0, 1], [data.from.x, data.from.x * 0.38]);
  const y = useTransform(t, [0, 1], [data.from.y, data.from.y * 0.38]);
  const scale = useTransform(t, [0, 0.6, 1], [0.9, 1.05, 1.12]);
  const opacity = useTransform(t, [0, 0.3, 1], [0.6, 1, 1]);
  const glow = useTransform(t, [0, 1], [0, 0.55]);
  const boxShadow = useTransform(
    glow,
    (g) => `0 10px 40px -10px hsl(var(--primary) / ${g}), 0 0 0 1px hsl(var(--primary) / ${g * 0.4})`
  );

  return (
    <motion.div
      style={{ x, y, scale, opacity, boxShadow }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 squircle-full"
    >
      <div className="glass-strong squircle-full sheen ring-inner shadow-md pl-2 pr-4 py-2 flex items-center gap-2.5">
        <span className={`size-9 squircle-full flex items-center justify-center ${tones[data.tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <span className="font-display text-[14px] tracking-headline text-ink">{data.label}</span>
      </div>
    </motion.div>
  );
};

const Convergence = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Le « point » central — le patient — s'amplifie au scroll
  const coreScale = useTransform(scrollYProgress, [0.1, 0.85], [0.8, 1.6]);
  const coreGlow = useTransform(scrollYProgress, [0.1, 0.85], [0.2, 1]);
  const ringOpacity = useTransform(scrollYProgress, [0.1, 0.7], [0.5, 1]);
  const ringScale = useTransform(scrollYProgress, [0.1, 0.85], [0.95, 1.15]);
  const titleY = useTransform(scrollYProgress, [0, 0.5], [40, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section ref={ref} className="relative py-32 md:py-44 overflow-hidden">
      <ScrollScene progress={scrollYProgress} rootRef={ref}>
        {(p) => (
          <>
            <ScrollPath
              progress={p}
              d="M0,220 C250,60 500,380 750,180 S1200,100 1200,300"
              className="text-primary/25"
              strokeWidth={1.2}
            />
            <ScrollShapes progress={p} shapes={CONVERGENCE_SHAPES} />
          </>
        )}
      </ScrollScene>
      {/* Halo décor */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-br from-primary/10 via-transparent to-halo-lilac/10 blur-3xl" />
      </div>

      <div className="relative px-5 md:px-8 max-w-6xl mx-auto">
        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="max-w-3xl mx-auto text-center mb-16 md:mb-24"
        >
          <p className="label text-primary mb-4">Coordination des soins</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-display text-ink leading-[0.95] text-balance">
            Le système de santé
            <br />
            <span className="text-ink-3">se coordonne autour</span>
            <br />
            <span className="text-gradient-primary">du patient.</span>
          </h2>
        </motion.div>

        {/* Stage de convergence */}
        <div className="relative mx-auto h-[440px] md:h-[520px] max-w-3xl">
          {/* Pulses concentriques au centre */}
          <motion.div
            style={{ opacity: coreGlow }}
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[420px] rounded-full bg-primary/10 blur-2xl"
          />
          <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-44 rounded-full border border-hairline" />
          <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-72 rounded-full border border-hairline opacity-70" />
          <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] rounded-full border border-hairline opacity-40" />

          {/* Centre = l'utilisateur */}
          <motion.div
            style={{ scale: coreScale }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              style={{ scale: ringScale, opacity: ringOpacity }}
              className="relative size-32 md:size-36 squircle-full p-[3px] ring-conic animate-gradient-pan shadow-2xl"
            >
              <div className="relative size-full squircle-full bg-ink text-white flex items-center justify-center sheen overflow-hidden">
                <div className="absolute inset-0 squircle-full bg-gradient-to-br from-primary/40 to-transparent" />
                <div className="absolute inset-0 squircle-full noise" />
                <span className="relative font-display text-xl tracking-headline">Vous</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Orbites */}
          {orbits.map((o, i) => (
            <OrbitItem key={o.label} data={o} index={i} progress={scrollYProgress} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center text-[15px] md:text-base text-ink-3 max-w-xl mx-auto mt-12 leading-relaxed"
        >
          Médecins, pharmacies, laboratoires, urgences, banques de sang et dossier médical avancent ensemble vers un même point : votre téléphone.
        </motion.p>
      </div>
    </section>
  );
};

export default Convergence;
