import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Clock3, CreditCard, FileCheck2, HeartPulse, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

const categoryIcons: Record<string, typeof Bell> = {
  subscription: CreditCard,
  family: HeartPulse,
  withdrawal: CreditCard,
  kyc: ShieldCheck,
  application: FileCheck2,
};

const Notifications = () => {
  const { user } = useAuth();
  const db: SupabaseClient = supabase;
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await db.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Notifications - AYMANE";
    void load();
  }, [user]);

  const markRead = async (id: string) => {
    await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  };

  const markAllRead = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await db.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    if (error) {
      toast({ title: "Action non terminée", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    toast({ title: "Tout est marqué comme lu" });
  };

  const unread = items.filter((item) => !item.read_at).length;

  return (
    <DashboardLayout
      title="Notifications"
      back
      mobileAction={unread > 0 ? (
        <button type="button" onClick={() => void markAllRead()} className="grid size-9 place-items-center rounded-[0.7rem] text-ink-2" aria-label="Tout marquer comme lu">
          <CheckCheck className="h-4 w-4" />
        </button>
      ) : undefined}
    >
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">À ne pas manquer</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Vos nouvelles, au même endroit.</h1>
          <p className="mt-2 text-[13.5px] text-ink-3">{unread ? `${unread} notification${unread > 1 ? "s" : ""} à lire` : "Vous êtes à jour"}</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={() => void markAllRead()} className="hidden h-10 items-center gap-2 rounded-full border border-hairline px-4 text-[12px] font-semibold text-ink-2 sm:flex">
            <CheckCheck className="h-3.5 w-3.5" /> Tout lire
          </button>
        )}
      </header>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Chargement de vos nouvelles…</p></div>
      ) : items.length === 0 ? (
        <section className="rounded-[1rem] border border-dashed border-hairline bg-surface-0 px-5 py-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-1 text-ink-3"><Bell className="h-5 w-5" /></span>
          <h2 className="mt-4 font-display text-xl text-ink">Rien de nouveau pour le moment.</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">Vos confirmations et décisions importantes apparaîtront ici.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[1rem] border border-hairline bg-surface-0">
          {items.map((item) => {
            const Icon = categoryIcons[item.category] ?? Bell;
            const content = (
              <article
                className={cn(
                  "flex gap-3 border-b border-hairline p-4 transition last:border-0 sm:p-5",
                  !item.read_at ? "bg-primary-soft/35" : "bg-surface-0",
                )}
                onClick={() => {
                  if (!item.read_at) void markRead(item.id);
                }}
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-[0.7rem]", !item.read_at ? "bg-primary text-white" : "bg-surface-1 text-ink-3")}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] font-semibold text-ink">{item.title}</p>
                    {!item.read_at && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{item.body}</p>
                  <p className="mt-2 flex items-center gap-1 text-[10.5px] text-ink-4">
                    <Clock3 className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleString("fr-SN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </article>
            );
            return item.action_url ? <Link key={item.id} to={item.action_url}>{content}</Link> : <div key={item.id}>{content}</div>;
          })}
        </section>
      )}
    </DashboardLayout>
  );
};

export default Notifications;
