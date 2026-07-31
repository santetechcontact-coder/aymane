import { motion } from "framer-motion";

interface Props {
  label?: string;
  index?: string;
}

/**
 * SectionDivider — fine ligne animée + index éditorial.
 * Apporte un rythme typographique entre les sections.
 */
const SectionDivider = ({ label, index }: Props) => (
  <div className="relative max-w-6xl mx-auto px-5 md:px-8">
    <div className="flex items-center gap-4 py-6">
      {index && (
        <span className="font-mono text-[10.5px] tracking-widest uppercase text-ink-3 tabular shrink-0">
          {index}
        </span>
      )}
      <motion.div
        initial={{ scaleX: 0, transformOrigin: "left" }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 h-px bg-gradient-to-r from-ink/20 via-ink/10 to-transparent"
      />
      {label && (
        <span className="font-mono text-[10.5px] tracking-widest uppercase text-ink-3 shrink-0">
          {label}
        </span>
      )}
    </div>
  </div>
);

export default SectionDivider;
