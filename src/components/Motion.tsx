import { motion, MotionProps } from "framer-motion";
import { ReactNode } from "react";

// Reveal on scroll — sleek subtle entrance
export const Reveal = ({
  children,
  delay = 0,
  y = 24,
  className,
  as: Tag = "div" as any,
}: { children: ReactNode; delay?: number; y?: number; className?: string; as?: any }) => {
  const MotionTag = motion[Tag as keyof typeof motion] as any;
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.32, 0.72, 0, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  );
};

// Staggered children
export const Stagger = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-60px" }}
    variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: delay } } }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className, ...rest }: { children: ReactNode; className?: string } & MotionProps) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 24 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] } },
    }}
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);

// Page transition wrapper — iOS-like fade & subtle scale
export const PageTransition = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);
