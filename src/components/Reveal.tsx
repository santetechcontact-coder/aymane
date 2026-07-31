import { ReactNode } from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "blur" | "scale";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  className?: string;
  amount?: number; // viewport amount
  once?: boolean;
}

/**
 * Reveal — primitive motion component (Apple-grade enter animation).
 * Respecte prefers-reduced-motion automatiquement.
 */
const Reveal = ({
  children,
  delay = 0,
  duration = 0.85,
  direction = "up",
  className,
  amount = 0.2,
  once = true,
}: RevealProps) => {
  const reduce = useReducedMotion();

  const variants: Variants = (() => {
    if (reduce) return { hidden: { opacity: 0 }, show: { opacity: 1 } };
    switch (direction) {
      case "up":    return { hidden: { opacity: 0, y: 28, filter: "blur(8px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } };
      case "down":  return { hidden: { opacity: 0, y: -28, filter: "blur(8px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } };
      case "left":  return { hidden: { opacity: 0, x: 32 }, show: { opacity: 1, x: 0 } };
      case "right": return { hidden: { opacity: 0, x: -32 }, show: { opacity: 1, x: 0 } };
      case "blur":  return { hidden: { opacity: 0, filter: "blur(16px)" }, show: { opacity: 1, filter: "blur(0px)" } };
      case "scale": return { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } };
    }
  })();

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variants}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
