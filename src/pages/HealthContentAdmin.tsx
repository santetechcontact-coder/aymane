import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Navigate } from "react-router-dom";
import { Archive, BookOpen, Check, Edit3, Plus, Send, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ContentStatus = "draft" | "scheduled" | "published" | "archived";

type HealthContent = {
  id: string;
  title: string;
  summary: string;
  category: string;
  audience_tags: string[];
  media_url: string | null;
  body: string | null;
  status: ContentStatus;
  publish_at: string | null;
  updated_at: string;
};

const emptyForm = {
  title: "",
  summary: "",
  category: "Prévention",
  audiences: "Tous",
  mediaUrl: "",
  body: "",
};

const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const HealthContentAdmin = () => {
  const { user, roles, loading: authLoading } = useAuth();
  const db: SupabaseClient = supabase;
  const isAdmin = roles.includes("admin");
  const [items, setItems] = useState<HealthContent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db.from("health_contents").select("*").order("updated_at", { ascending: false }).limit(100);
    setItems((data ?? []) as HealthContent[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Contenus santé - AYMANE";
    void load();
  }, [isAdmin]);

  const save = async (publish = false) => {
    if (!user || form.title.trim().length < 3 || form.summary.trim().length < 10) {
      toast({ title: "Contenu incomplet", description: "Ajoutez un titre et un résumé suffisamment précis.", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      category: form.category.trim(),
      audience_tags: form.audiences.split(",").map((item) => item.trim()).filter(Boolean),
      media_url: form.mediaUrl.trim() || null,
      body: form.body.trim() || null,
      status: publish ? "published" : "draft",
      publish_at: publish ? new Date().toISOString() : null,
      author_id: user.id,
    };
    setWorking(true);
    const result = editingId
      ? await db.from("health_contents").update(payload).eq("id", editingId)
      : await db.from("health_contents").insert(payload);
    setWorking(false);
    if (result.error) {
      toast({ title: "Contenu non enregistré", description: "Vérifiez les champs puis réessayez.", variant: "destructive" });
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    toast({ title: publish ? "Contenu publié" : "Brouillon enregistré" });
    await load();
  };

  const edit = (item: HealthContent) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary,
      category: item.category,
      audiences: item.audience_tags.join(", "),
      mediaUrl: item.media_url ?? "",
      body: item.body ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = async (item: HealthContent, status: ContentStatus) => {
    const { error } = await db.from("health_contents").update({
      status,
      publish_at: status === "published" ? new Date().toISOString() : item.publish_at,
    }).eq("id", item.id);
    if (error) {
      toast({ title: "Statut non modifié", variant: "destructive" });
      return;
    }
    toast({ title: status === "published" ? "Contenu publié" : "Contenu archivé" });
    await load();
  };

  const removeDraft = async (item: HealthContent) => {
    if (item.status !== "draft") return;
    const { error } = await db.from("health_contents").delete().eq("id", item.id);
    if (error) {
      toast({ title: "Brouillon non supprimé", variant: "destructive" });
      return;
    }
    await load();
  };

  if (!authLoading && !isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout title="Contenus santé" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Prévention validée</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Publier moins, publier juste.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Préparez des contenus courts, compréhensibles et adaptés aux besoins de santé au Sénégal.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono uppercase text-primary">{editingId ? "Modification" : "Nouveau contenu"}</p>
              <h2 className="mt-1 font-display text-xl text-ink">{editingId ? "Mettre à jour" : "Préparer une publication"}</h2>
            </div>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-[11px] font-semibold text-ink-3">Annuler</button>}
          </div>
          <div className="mt-5 space-y-3">
            <Field label="Titre"><input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex. Bien gérer la chaleur pendant la grossesse" /></Field>
            <Field label="Résumé"><textarea className="min-h-24 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 py-2.5 text-[14px] outline-none focus:border-primary/50" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} maxLength={600} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Catégorie"><input className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
              <Field label="Publics"><input className={inputClass} value={form.audiences} onChange={(event) => setForm({ ...form, audiences: event.target.value })} placeholder="Parents, femmes enceintes" /></Field>
            </div>
            <Field label="Lien vidéo ou ressource"><input type="url" className={inputClass} value={form.mediaUrl} onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })} placeholder="https://…" /></Field>
            <Field label="Contenu complet"><textarea className="min-h-40 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-primary/50" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={working} onClick={() => void save(false)} className="flex h-11 items-center justify-center gap-2 rounded-full border border-hairline text-[12px] font-semibold text-ink-2 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Brouillon</button>
              <button type="button" disabled={working} onClick={() => void save(true)} className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[12px] font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /> Publier</button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Bibliothèque</h2>
            <span className="text-[11px] text-ink-3">{items.length} contenus</span>
          </div>
          {loading ? (
            <div className="state-panel"><p className="text-[13px] text-ink-3">Chargement des contenus…</p></div>
          ) : items.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-hairline bg-surface-0 px-5 py-10 text-center">
              <BookOpen className="mx-auto h-6 w-6 text-ink-4" />
              <p className="mt-3 text-[13px] text-ink-3">Votre premier contenu apparaîtra ici.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <article key={item.id} className="rounded-[0.9rem] border border-hairline bg-surface-0 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[9.5px] font-semibold uppercase text-primary">{item.category}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-semibold", item.status === "published" ? "bg-emerald-100 text-emerald-700" : item.status === "archived" ? "bg-surface-1 text-ink-3" : "bg-amber-100 text-amber-700")}>{item.status === "published" ? "Publié" : item.status === "archived" ? "Archivé" : "Brouillon"}</span>
                      </div>
                      <h3 className="mt-2 font-display text-lg leading-tight text-ink">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">{item.summary}</p>
                    </div>
                    <button type="button" onClick={() => edit(item)} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-1 text-ink-2" aria-label={`Modifier ${item.title}`}><Edit3 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
                    {item.status !== "published" && <button type="button" onClick={() => void changeStatus(item, "published")} className="flex h-8 items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700"><Send className="h-3 w-3" /> Publier</button>}
                    {item.status === "published" && <button type="button" onClick={() => void changeStatus(item, "archived")} className="flex h-8 items-center gap-1.5 text-[10.5px] font-semibold text-ink-3"><Archive className="h-3 w-3" /> Archiver</button>}
                    {item.status === "draft" && <button type="button" onClick={() => void removeDraft(item)} className="ml-auto grid size-8 place-items-center text-accent" aria-label={`Supprimer ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</span>
    {children}
  </label>
);

export default HealthContentAdmin;
