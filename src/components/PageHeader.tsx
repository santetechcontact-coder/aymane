import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  italic?: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader = ({ eyebrow, title, italic, description, actions }: PageHeaderProps) => (
  <motion.header
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className="mb-7 md:mb-9 border-b border-hairline pb-6 md:pb-7"
  >
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-3 text-[10.5px] font-mono uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-3xl font-display text-[32px] sm:text-4xl md:text-5xl leading-[1.02] text-ink text-balance">
          {title}
          {italic ? <span className="text-primary"> {italic}</span> : null}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[62ch] text-[14px] md:text-[15px] leading-relaxed text-ink-3">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="md:pb-1">{actions}</div> : null}
    </div>
  </motion.header>
);

export default PageHeader;
