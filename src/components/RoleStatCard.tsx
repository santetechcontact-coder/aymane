import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  num: string;
  label: string;
  value: ReactNode;
  hint?: string;
  to?: string;
}

const RoleStatCard = ({ num, label, value, hint, to }: Props) => {
  const inner = (
    <motion.div
      whileHover={to ? { y: -2 } : undefined}
      className="group block p-6 md:p-7 h-full hover:bg-paper-dark/50 transition-colors"
    >
      <div className="label text-stone tabular mb-3">{num}</div>
      <div className="font-display text-5xl md:text-6xl tracking-tighter tabular text-ink leading-none">
        {value}
      </div>
      <div className="rule mt-4 mb-2" />
      <div className="serif-italic text-base text-ink-soft group-hover:text-primary transition-colors">
        {label}
      </div>
      {hint && <div className="label text-stone mt-2">{hint}</div>}
    </motion.div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
};

export default RoleStatCard;
