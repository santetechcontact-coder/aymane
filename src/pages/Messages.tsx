import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, Search, MessageCircle, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Contact = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  speciality: string | null;
  last_message?: string;
  last_at?: string;
  unread?: number;
};

const Messages = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("with");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load contacts (people I've exchanged messages with + doctors I've consulted)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: msgs }, { data: cons }] = await Promise.all([
        supabase.from("messages")
          .select("sender_id, recipient_id, content, created_at, read_at")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("consultations").select("doctor_id").eq("patient_id", user.id).not("doctor_id", "is", null).limit(20),
      ]);

      const peerIds = new Set<string>();
      const lastMap = new Map<string, { content: string; at: string }>();
      const unreadMap = new Map<string, number>();

      (msgs ?? []).forEach((m: any) => {
        const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        peerIds.add(peer);
        if (!lastMap.has(peer)) lastMap.set(peer, { content: m.content, at: m.created_at });
        if (m.recipient_id === user.id && !m.read_at) {
          unreadMap.set(peer, (unreadMap.get(peer) ?? 0) + 1);
        }
      });
      (cons ?? []).forEach((c: any) => c.doctor_id && peerIds.add(c.doctor_id));

      const ids = Array.from(peerIds);
      if (ids.length === 0) { setContacts([]); return; }
      const { data: profs } = await supabase.from("profiles")
        .select("id, full_name, avatar_url, speciality")
        .in("id", ids);

      const list: Contact[] = (profs ?? []).map((p: any) => ({
        id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, speciality: p.speciality,
        last_message: lastMap.get(p.id)?.content,
        last_at: lastMap.get(p.id)?.at,
        unread: unreadMap.get(p.id) ?? 0,
      })).sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));
      setContacts(list);
    })();
  }, [user]);

  // Load conversation + realtime
  useEffect(() => {
    if (!user || !activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${activeId}),and(sender_id.eq.${activeId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages((data ?? []) as Message[]);
      // Mark received as read
      await supabase.from("messages").update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id).eq("sender_id", activeId).is("read_at", null);
    })();

    const channel = supabase.channel(`msg-${user.id}-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        const involved = (m.sender_id === user.id && m.recipient_id === activeId) ||
                         (m.sender_id === activeId && m.recipient_id === user.id);
        if (involved) setMessages((prev) => [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!user || !activeId || !content.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: activeId, content: content.trim().slice(0, 4000),
    });
    setSending(false);
    if (error) { toast({ title: "Échec d'envoi", description: error.message, variant: "destructive" }); return; }
    setContent("");
  };

  const filtered = useMemo(() =>
    contacts.filter(c => !search || (c.full_name ?? "").toLowerCase().includes(search.toLowerCase()))
  , [contacts, search]);

  const activeContact = contacts.find(c => c.id === activeId);

  return (
    <DashboardLayout title="Messagerie">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[520px]">
        {/* Contacts list */}
        <aside className={cn(
          "squircle-xl glass-strong ring-inner shadow-sm flex flex-col overflow-hidden",
          activeId && "hidden lg:flex"
        )}>
          <div className="p-4 border-b border-hairline">
            <div className="flex items-center gap-2 squircle-full bg-surface-1 px-3 h-10">
              <Search className="h-4 w-4 text-ink-3" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="flex-1 bg-transparent text-[14px] outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-ink-3 text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Aucune conversation pour l'instant.
              </div>
            ) : filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ with: c.id })}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-1 transition-colors border-b border-hairline",
                  activeId === c.id && "bg-primary-soft/40"
                )}
              >
                <div className="size-10 squircle-full bg-primary-soft text-primary flex items-center justify-center font-semibold shrink-0">
                  {(c.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[14px] font-semibold text-ink truncate">{c.full_name ?? "Utilisateur"}</div>
                    {c.last_at && (
                      <div className="text-[10px] text-ink-3 tabular shrink-0">
                        {new Date(c.last_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12.5px] text-ink-3 truncate">{c.last_message ?? c.speciality ?? "Démarrer une conversation"}</div>
                    {!!c.unread && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground tabular shrink-0">{c.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <section className={cn(
          "squircle-xl glass-strong ring-inner shadow-sm flex flex-col overflow-hidden",
          !activeId && "hidden lg:flex"
        )}>
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-ink-3 text-sm flex-col gap-2 p-8">
              <MessageCircle className="h-10 w-10 opacity-30" />
              <p>Sélectionnez une conversation pour commencer.</p>
            </div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-hairline flex items-center gap-3">
                <button onClick={() => setParams({})} className="lg:hidden p-1 -ml-1 tap">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="size-9 squircle-full bg-primary-soft text-primary flex items-center justify-center font-semibold">
                  {(activeContact?.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold text-ink truncate">{activeContact?.full_name ?? "Conversation"}</div>
                  {activeContact?.speciality && <div className="text-[11.5px] text-ink-3 truncate">{activeContact.speciality}</div>}
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-transparent to-surface-1/30">
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex", mine ? "justify-end" : "justify-start")}
                      >
                        <div className={cn(
                          "max-w-[75%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug",
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-surface-1 text-ink rounded-bl-sm border border-hairline"
                        )}>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          <div className={cn("text-[10px] mt-1 flex items-center gap-1 justify-end", mine ? "text-primary-foreground/70" : "text-ink-3")}>
                            {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {mine && (m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); void send(); }}
                className="p-3 border-t border-hairline flex items-end gap-2"
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  rows={1}
                  placeholder="Écrire un message…"
                  maxLength={4000}
                  className="flex-1 resize-none bg-surface-1 squircle px-4 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
                />
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="btn-pill bg-primary text-primary-foreground h-11 w-11 shadow-md hover:shadow-lg disabled:opacity-40"
                  aria-label="Envoyer"
                >
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
