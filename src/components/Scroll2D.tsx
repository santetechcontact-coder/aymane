import { useRef, ReactNode, memo, useMemo } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
  MotionValue,
} from "framer-motion";

/**
 * Scroll2D — synchronized 2D motion design driven by a single scroll progress.
 *
 * Design goals:
 *  - One `scrollYProgress` per section drives every visual (path, shapes, grid).
 *  - Identical reveal/hide timing across all primitives so they feel "in sync".
 *  - Lazy: nothing animates until the section is actually in the viewport.
 *  - Memoized: shape arrays / configs don't trigger re-renders on parent updates.
 *  - Respects `prefers-reduced-motion`.
 */

// ── Shared timing curve (used by every primitive) ────────────────────────────
// Reveal in the first 15%, hold, fade out in the last 15%.
const REVEAL_STOPS = [0, 0.15, 0.85, 1] as const;
const REVEAL_VALUES = [0, 1, 1, 0] as const;
// Movement spans the full scroll range so drift + path tracing share the same clock.
const MOVE_STOPS = [0, 1] as const;

// ── Drawn SVG path that traces itself synchronized with section scroll ───────
type ScrollPathProps = {
  progress: MotionValue<number>;
  d: string;
  className?: string;
  strokeWidth?: number;
  viewBox?: string;
};

export const ScrollPath = memo(function ScrollPath({
  progress,
  d,
  className = "text-primary/40",
  strokeWidth = 1.5,
  viewBox = "0 0 1200 400",
}: ScrollPathProps) {
  // Path length follows the SAME movement clock (0 → 1) as shape drift.
  const pathLength = useTransform(progress, MOVE_STOPS as unknown as number[], [0, 1]);
  const opacity = useTransform(progress, REVEAL_STOPS as unknown as number[], REVEAL_VALUES as unknown as number[]);
  return (
    <motion.svg
      style={{ opacity }}
      viewBox={viewBox}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    >
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ pathLength }}
      />
    </motion.svg>
  );
});

// ── 2D shapes (lightweight, no per-shape SVG when avoidable) ─────────────────
type ShapeKind = "circle" | "ring" | "square" | "triangle" | "plus" | "dot";

export type ShapeDef = {
  kind: ShapeKind;
  top: string;
  left: string;
  size: number;
  color: string;
  /** Vertical drift in px across full scroll range. */
  range?: number;
  /** Rotation in degrees across full scroll range. */
  rotateRange?: number;
};

const Shape = memo(function Shape({ kind, size, color }: { kind: ShapeKind; size: number; color: string }) {
  const s = size;
  switch (kind) {
    case "circle":
    case "dot":
      return <div style={{ width: s, height: s, background: color }} className="rounded-full" />;
    case "ring":
      return (
        <div
          style={{ width: s, height: s, borderColor: color, borderWidth: Math.max(2, s / 14) }}
          className="rounded-full border"
        />
      );
    case "square":
      return <div style={{ width: s, height: s, background: color }} className="rounded-md rotate-12" />;
    case "triangle":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden>
          <polygon points="50,8 92,88 8,88" fill={color} />
        </svg>
      );
    case "plus":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden>
          <rect x="42" y="10" width="16" height="80" fill={color} rx="4" />
          <rect x="10" y="42" width="80" height="16" fill={color} rx="4" />
        </svg>
      );
  }
});

const FloatingShape = memo(function FloatingShape({
  progress,
  shape,
}: {
  progress: MotionValue<number>;
  shape: ShapeDef;
}) {
  const range = shape.range ?? 120;
  const rotRange = shape.rotateRange ?? 180;
  // All shapes share the SAME timing clock as the path tracer.
  const y = useTransform(progress, MOVE_STOPS as unknown as number[], [range, -range]);
  const rotate = useTransform(progress, MOVE_STOPS as unknown as number[], [0, rotRange]);
  const opacity = useTransform(progress, REVEAL_STOPS as unknown as number[], REVEAL_VALUES as unknown as number[]);
  return (
    <motion.div
      style={{ top: shape.top, left: shape.left, y, rotate, opacity, willChange: "transform, opacity" }}
      className="absolute"
    >
      <Shape kind={shape.kind} size={shape.size} color={shape.color} />
    </motion.div>
  );
});

// Hard cap so authors can't accidentally degrade perf on a section.
const MAX_SHAPES = 6;

export const ScrollShapes = memo(function ScrollShapes({
  progress,
  shapes,
}: {
  progress: MotionValue<number>;
  shapes: ShapeDef[];
}) {
  const limited = useMemo(() => shapes.slice(0, MAX_SHAPES), [shapes]);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {limited.map((sh, i) => (
        <FloatingShape key={i} progress={progress} shape={sh} />
      ))}
    </div>
  );
});

// ── Scroll-driven grid (single SVG, GPU-friendly) ────────────────────────────
export const ScrollGrid = memo(function ScrollGrid({
  progress,
  className = "text-ink/[0.06]",
}: {
  progress: MotionValue<number>;
  className?: string;
}) {
  const opacity = useTransform(progress, REVEAL_STOPS as unknown as number[], REVEAL_VALUES as unknown as number[]);
  const scale = useTransform(progress, MOVE_STOPS as unknown as number[], [1.05, 0.95]);
  return (
    <motion.div
      aria-hidden
      style={{ opacity, scale, willChange: "transform, opacity" }}
      className={`absolute inset-0 pointer-events-none ${className}`}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern id="scroll-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#scroll-grid)" />
      </svg>
    </motion.div>
  );
});

// ── Lazy wrapper: mounts decorative motion ONLY when section is visible ──────
/**
 * Wrap a section's decorative motion (path + shapes + grid) so it is only
 * mounted when the section actually enters the viewport. This avoids running
 * useTransform subscribers for offscreen sections and removes them when done.
 */
export const ScrollScene = ({
  progress,
  children,
  rootRef,
}: {
  progress: MotionValue<number>;
  children: (p: MotionValue<number>) => ReactNode;
  /** Same ref used by `useScroll` — drives in-view detection. */
  rootRef: React.RefObject<Element>;
}) => {
  const reduceMotion = useReducedMotion();
  const inView = useInView(rootRef, { margin: "200px 0px 200px 0px", once: false });
  if (reduceMotion || !inView) return null;
  return <>{children(progress)}</>;
};

// ── Convenience hook for sections ────────────────────────────────────────────
export const useSectionScroll = <T extends HTMLElement>(ref: React.RefObject<T>) =>
  useScroll({ target: ref, offset: ["start end", "end start"] });
