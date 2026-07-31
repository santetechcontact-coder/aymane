import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ScrollShapes, ScrollPath, ScrollGrid, ScrollScene, type ShapeDef } from "@/components/Scroll2D";

const VISION_SHAPES: ShapeDef[] = [
  { kind: "ring", top: "10%", left: "8%", size: 64, color: "hsl(var(--primary))", range: 180, rotateRange: 220 },
  { kind: "plus", top: "20%", left: "85%", size: 28, color: "hsl(var(--accent))", range: 220, rotateRange: 360 },
  { kind: "triangle", top: "70%", left: "12%", size: 36, color: "hsl(var(--secondary))", range: -160, rotateRange: -180 },
  { kind: "dot", top: "78%", left: "78%", size: 14, color: "hsl(var(--primary))", range: 140 },
  { kind: "ring", top: "45%", left: "92%", size: 44, color: "hsl(var(--halo-lilac))", range: -200, rotateRange: 180 },
  { kind: "square", top: "60%", left: "4%", size: 22, color: "hsl(var(--halo-peach))", range: 160, rotateRange: 240 },
];

const Vision = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const blobY = useTransform(scrollYProgress, [0, 1], ["-20%", "30%"]);
  const blobScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 0.9]);
  const quoteY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} id="vision" className="relative py-24 md:py-36 overflow-hidden">
      <ScrollScene progress={scrollYProgress} rootRef={ref}>
        {(p) => (
          <>
            <ScrollGrid progress={p} className="text-primary/[0.05]" />
            <ScrollPath
              progress={p}
              d="M0,300 C200,100 400,500 600,250 S1000,100 1200,300"
              className="text-primary/30"
              strokeWidth={1.2}
            />
            <ScrollShapes progress={p} shapes={VISION_SHAPES} />
          </>
        )}
      </ScrollScene>
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          style={{ y: blobY, scale: blobScale }}
          className="absolute top-0 right-1/4 w-[40vw] h-[40vw] rounded-full bg-halo-mint opacity-25 blur-3xl"
        />
      </div>

      <div className="relative px-5 md:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-14 md:mb-20"
        >
          <p className="text-[12px] font-mono uppercase tracking-widest text-primary mb-4">Vision</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-display leading-[0.95] text-ink text-balance">
            Devenir le réflexe santé
            <br />
            <span className="text-primary">de la famille</span>{" "}
            <span className="text-ink-3">et du quartier.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-12 gap-6 md:gap-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
            className="md:col-span-7 space-y-5 text-[16px] md:text-lg leading-[1.7] text-ink-2"
          >
            {[
              "AYMANE rassemble orientation, dossier, pharmacie, laboratoire, urgence et suivi dans un parcours clair.",
              "Le produit doit rester utile à la famille, au patient, au soignant et à la structure, du quartier jusqu'au centre de santé.",
            ].map((t) => (
              <motion.p
                key={t}
                variants={{
                  hidden: { opacity: 0, x: -30, filter: "blur(6px)" },
                  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                {t}
              </motion.p>
            ))}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
              }}
              className="flex flex-wrap gap-2 pt-4"
            >
              {["Orientation", "Carnet", "Pharmacie", "Urgence", "Suivi"].map((tag) => (
                <motion.span
                  key={tag}
                  variants={{
                    hidden: { opacity: 0, scale: 0.7, y: 10 },
                    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                  }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className="squircle-full glass px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 cursor-default"
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            style={{ y: quoteY }}
            initial={{ opacity: 0, x: 40, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-5"
          >
            <figure className="squircle-lg p-7 md:p-8 glass sheen ring-inner shadow-md">
              <svg className="h-7 w-7 text-primary mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5 6c-3 0-5.5 2.4-5.5 5.5 0 1.4.5 2.7 1.4 3.7L9.5 18V14h.5c2.5 0 4.5-2 4.5-4.5S12 6 9.5 6zm9 0c-3 0-5.5 2.4-5.5 5.5 0 1.4.5 2.7 1.4 3.7L18.5 18V14h.5c2.5 0 4.5-2 4.5-4.5S21 6 18.5 6z" transform="rotate(180 12 12)" />
              </svg>
              <blockquote className="font-display text-2xl md:text-3xl tracking-headline text-ink leading-tight">
                Mettre la technologie au service des familles — pour qu'une bonne décision santé ne dépende pas
                seulement de la distance, du temps ou du hasard.
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-hairline">
                <p className="font-display text-base text-ink">Ass Yoro Mane</p>
                <p className="text-[12px] text-ink-3 mt-0.5">CEO & Fondateur — AYMANE</p>
              </figcaption>
            </figure>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Vision;
