import { ROLE_LABELS, type AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const RoleBadge = ({ role, className }: { role: AppRole; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 label tabular px-2.5 py-1 squircle bg-primary/10 text-primary", className)}>
    <span className="size-1.5 rounded-full bg-primary" />
    {ROLE_LABELS[role]}
  </span>
);

export default RoleBadge;

export const StatusBadge = ({ status }: { status: "pending" | "approved" | "rejected" | string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Validé", cls: "bg-primary/10 text-primary" },
    pending: { label: "En attente", cls: "bg-amber-500/10 text-amber-700" },
    rejected: { label: "Rejeté", cls: "bg-accent/10 text-accent" },
  };
  const v = map[status] ?? { label: status, cls: "bg-ink/10 text-ink" };
  return <span className={cn("inline-flex items-center gap-1.5 label px-2.5 py-1 squircle", v.cls)}><span className="size-1.5 rounded-full bg-current" />{v.label}</span>;
};
