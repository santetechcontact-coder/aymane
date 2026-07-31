import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: any;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const AuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setEntries((data ?? []) as AuditEntry[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-[13px] text-ink-3 py-8 text-center">Chargement…</div>;
  if (entries.length === 0) {
    return (
      <div className="squircle-xl glass p-10 text-center">
        <p className="text-ink-3 text-[14px]">Aucune action enregistrée pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const isApprove = e.action === "approve";
        const Icon = isApprove ? Check : X;
        return (
          <div key={e.id} className="squircle-lg glass p-3.5 flex items-center gap-3">
            <div className={cn(
              "size-9 squircle flex items-center justify-center shrink-0",
              isApprove ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] text-ink truncate">
                <span className="font-semibold">
                  {isApprove ? "Validation" : "Rejet"}
                </span>
                {e.metadata?.email && <span className="text-ink-3"> · {e.metadata.email}</span>}
                {e.metadata?.application_type && (
                  <span className="text-ink-3"> · {e.metadata.application_type}</span>
                )}
              </p>
              {e.metadata?.reason && (
                <p className="text-[12px] text-rose-700 mt-0.5 truncate">Motif : {e.metadata.reason}</p>
              )}
            </div>
            <div className="text-[11px] text-ink-3 inline-flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />{formatDate(e.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditLog;
