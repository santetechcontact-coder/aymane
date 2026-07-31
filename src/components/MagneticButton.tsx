import { useRef, ReactNode, MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  strength?: number;
};

/**
 * Button magnétique — réagit subtilement au curseur (Apple-grade).
 * S'utilise comme un Link / a / button selon les props passées.
 */
export const MagneticButton = ({ children, to, href, onClick, className, strength = 0.25 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });
  const innerX = useTransform(sx, (v) => v * 0.5);
  const innerY = useTransform(sy, (v) => v * 0.5);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const inner = (
    <motion.span style={{ x: innerX, y: innerY }} className="relative z-10 inline-flex items-center gap-2">
      {children}
    </motion.span>
  );

  const wrapperClass = cn("inline-block", className);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy }}
      className={wrapperClass}
    >
      {to ? (
        <Link to={to} onClick={onClick} className="contents">
          {inner}
        </Link>
      ) : href ? (
        <a href={href} onClick={onClick} className="contents">
          {inner}
        </a>
      ) : (
        <button onClick={onClick} className="contents" type="button">
          {inner}
        </button>
      )}
    </motion.div>
  );
};

export default MagneticButton;
