import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { X, Search, Download, FileText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Stagger, StaggerItem } from "@/components/Motion";
import { cn } from "@/lib/utils";

type Consultation = {
  id: string;
  reason: string;
  scheduled_at: string;
  status: string;
  diagnosis: string | null;
  notes: string | null;
  doctor_id: string | null;
  consultation_type: string | null;
  speciality: string | null;
  symptoms: string | null;
  procedures: string | null;
  recommendations: string | null;
  follow_up_needed: boolean | null;
  follow_up_date: string | null;
  completed_at: string | null;
};
type Prescription = { id: string; consultation_id: string | null; medication_name: string; dosage: string; duration: string; instructions: string | null };
type DoctorProfile = { id: string; full_name: string | null; speciality: string | null };

const statusMap: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", in_progress: "En cours", completed: "Terminée", cancelled: "Annulée",
};
const typeMap: Record<string, string> = {
  teleconsultation: "Téléconsultation", in_person: "Cabinet", home_visit: "À domicile",
};

const FILTERS = ["all", "pending", "confirmed", "completed"] as const;
type Filter = typeof FILTERS[number];

const Consultations = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<Record<string, DoctorProfile>>({});
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<Consultation | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: cons }, { data: pres }] = await Promise.all([
      supabase.from("consultations").select("*").eq("patient_id", user.id).order("scheduled_at", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", user.id),
    ]);
    setItems((cons ?? []) as Consultation[]);
    setPrescriptions(pres ?? []);
    const docIds = Array.from(new Set((cons ?? []).map((c: any) => c.doctor_id).filter(Boolean)));
    if (docIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, speciality").in("id", docIds);
      const map: Record<string, DoctorProfile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setDoctors(map);
    }
  };

  useEffect(() => { document.title = "Mes consultations — AYMANE"; load(); }, [user]);

  const create = async () => {
    if (!user || !reason || !date) return;
    setSubmitting(true);
    const { error } = await supabase.from("consultations").insert({ patient_id: user.id, reason, scheduled_at: new Date(date).toISOString(), notes });
    setSubmitting(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Demande envoyée" }); setOpen(false); setReason(""); setDate(""); setNotes(""); load(); }
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("consultations").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Consultation annulée" }); load(); }
  };

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (typeFilter !== "all" && c.consultation_type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const doc = c.doctor_id ? doctors[c.doctor_id] : null;
        const blob = [c.reason, c.diagnosis, c.speciality, doc?.full_name, doc?.speciality].filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [items, filter, typeFilter, search, doctors]);

  const prescriptionsFor = (cid: string) => prescriptions.filter((p) => p.consultation_id === cid);

  const downloadPDF = (c: Consultation) => {
    const doc = c.doctor_id ? doctors[c.doctor_id] : null;
    const pres = prescriptionsFor(c.id);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Compte rendu — ${new Date(c.scheduled_at).toLocaleDateString("fr-FR")}</title>
      <style>
        body{font-family:Georgia,serif;max-width:780px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
        h1{font-size:24px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:8px}
        h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-top:28px;margin-bottom:6px}
        .meta{color:#555;font-size:13px;margin-bottom:24px}
        p{margin:4px 0;white-space:pre-wrap}
        .pres{border-left:3px solid #111;padding-left:12px;margin:8px 0}
        .footer{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Compte rendu de consultation</h1>
      <div class="meta">
        ${new Date(c.scheduled_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}<br>
        ${doc?.full_name ? `Dr ${doc.full_name}` : "Professionnel non renseigné"}${c.speciality || doc?.speciality ? ` — ${c.speciality || doc?.speciality}` : ""}<br>
        ${c.consultation_type ? typeMap[c.consultation_type] : ""}
      </div>
      <h2>Motif</h2><p>${c.reason || "—"}</p>
      ${c.symptoms ? `<h2>Symptômes</h2><p>${c.symptoms}</p>` : ""}
      ${c.diagnosis ? `<h2>Diagnostic</h2><p>${c.diagnosis}</p>` : ""}
      ${c.procedures ? `<h2>Actes réalisés</h2><p>${c.procedures}</p>` : ""}
      ${c.recommendations ? `<h2>Recommandations</h2><p>${c.recommendations}</p>` : ""}
      ${pres.length ? `<h2>Prescriptions</h2>${pres.map(p => `<div class="pres"><strong>${p.medication_name}</strong> — ${p.dosage} · ${p.duration}${p.instructions ? `<br><em>${p.instructions}</em>` : ""}</div>`).join("")}` : ""}
      ${c.follow_up_needed ? `<h2>Suivi recommandé</h2><p>${c.follow_up_date ? new Date(c.follow_up_date).toLocaleString("fr-FR") : "À planifier"}</p>` : ""}
      ${c.notes ? `<h2>Notes</h2><p>${c.notes}</p>` : ""}
      <div class="footer">Document généré depuis AYMANE — confidentiel.</div>
      <script>window.onload=()=>window.print()</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Bloqueur de fenêtres", description: "Autorisez les pop-ups pour télécharger.", variant: "destructive" }); return; }
    w.document.write(html); w.document.close();
  };

  const sharePDF = async (c: Consultation) => {
    const doc = c.doctor_id ? doctors[c.doctor_id] : null;
    const text = `Consultation du ${new Date(c.scheduled_at).toLocaleDateString("fr-FR")}${doc?.full_name ? ` avec Dr ${doc.full_name}` : ""}${c.diagnosis ? ` — Diagnostic : ${c.diagnosis}` : ""}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Compte rendu AYMANE", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Résumé copié dans le presse-papiers" });
    }
  };

  const inputCls = "h-11 rounded-none border-0 border-b border-ink-10 focus-visible:border-primary focus-visible:ring-0 px-0 bg-transparent font-display text-xl";

  return (
    <DashboardLayout title="Mes consultations" back
      mobileAction={<button onClick={() => setOpen(true)} className="label text-ink link-underline tap" aria-label="Nouvelle">+ Nouvelle</button>}
    >
      <PageHeader eyebrow="Section II — Suivi médical" title="Mes consultations" italic="& comptes rendus"
        description="Demandez un rendez-vous, suivez son statut et consultez l'historique complet de vos consultations."
        actions={
          <button onClick={() => setOpen(true)} className="hidden md:inline-flex group items-baseline gap-2 tap">
            <span className="serif-italic text-2xl text-primary link-underline">Nouvelle demande</span>
            <span className="serif-italic text-xl text-primary group-hover:translate-x-1 transition-transform">→</span>
          </button>
        } />

      {/* New consultation dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none border-0 bg-paper max-w-md">
          <DialogHeader><DialogTitle className="font-display text-3xl tracking-tight">Demander une <span className="serif-italic text-primary">consultation</span></DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div><Label className="label text-stone">Motif</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. Fièvre persistante" className={inputCls} /></div>
            <div><Label className="label text-stone">Date souhaitée</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
            <div><Label className="label text-stone">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-none border-0 border-b border-ink-10 focus-visible:border-primary focus-visible:ring-0 px-0 bg-transparent" /></div>
            <button onClick={create} disabled={submitting || !reason || !date} className="group flex items-baseline gap-3 tap disabled:opacity-50">
              <span className="font-display text-3xl serif-italic text-primary link-underline">{submitting ? "Envoi…" : "Envoyer"}</span>
              <span className="serif-italic text-2xl text-primary group-hover:translate-x-2 transition-transform">→</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search + type filter */}
      <div className="grid md:grid-cols-[1fr_240px] gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par motif, médecin, diagnostic…"
            className="h-11 rounded-none border-0 border-b border-ink-10 focus-visible:border-primary focus-visible:ring-0 pl-7 bg-transparent" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 rounded-none border-0 border-b border-ink-10 bg-transparent"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(typeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-6 mb-10 overflow-x-auto no-scrollbar pb-3 border-b border-ink-10">
        {FILTERS.map((f) => {
          const active = filter === f;
          const count = f === "all" ? items.length : items.filter((c) => c.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("shrink-0 label transition-colors tap pb-3 -mb-3 border-b-2", active ? "text-ink border-ink" : "text-stone border-transparent hover:text-ink")}>
              {f === "all" ? "Toutes" : statusMap[f]}
              <span className="ml-2 tabular text-stone">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="serif-italic text-2xl text-stone py-12 text-center">Aucune consultation pour ces critères.</p>
      ) : (
        <Stagger className="divide-y divide-ink-10 border-y border-ink-10">
          {filtered.map((c, i) => {
            const pres = prescriptionsFor(c.id);
            const canCancel = c.status === "pending" || c.status === "confirmed";
            const doc = c.doctor_id ? doctors[c.doctor_id] : null;
            const completed = c.status === "completed";
            return (
              <StaggerItem key={c.id}>
                <article className="grid md:grid-cols-12 gap-4 py-8 group">
                  <div className="md:col-span-1 label text-stone tabular">{String(i + 1).padStart(2, "0")}</div>
                  <div className="md:col-span-7">
                    <h3 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">{c.reason}</h3>
                    <p className="label text-stone mt-2 tabular">
                      {new Date(c.scheduled_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                      {c.consultation_type && <> · {typeMap[c.consultation_type]}</>}
                    </p>
                    {(doc?.full_name || c.speciality) && (
                      <p className="text-ink-soft mt-2">
                        {doc?.full_name && <span className="serif-italic text-lg">Dr {doc.full_name}</span>}
                        {(c.speciality || doc?.speciality) && <span className="label text-stone ml-2">— {c.speciality || doc?.speciality}</span>}
                      </p>
                    )}
                    {c.diagnosis && <p className="text-ink-soft mt-4 leading-relaxed"><span className="label text-stone">Diagnostic — </span>{c.diagnosis}</p>}
                    {pres.length > 0 && (
                      <div className="mt-4 label text-stone">📋 {pres.length} prescription{pres.length > 1 ? "s" : ""}</div>
                    )}
                    {completed && (
                      <button onClick={() => setDetail(c)} className="mt-4 inline-flex items-center gap-2 label text-primary link-underline tap">
                        <FileText className="h-4 w-4" /> Voir le compte rendu
                      </button>
                    )}
                  </div>
                  <div className="md:col-span-4 md:text-right flex md:flex-col md:items-end gap-3 items-baseline">
                    <span className="serif-italic text-xl text-primary">{statusMap[c.status] ?? c.status}</span>
                    {canCancel && (
                      <button onClick={() => cancel(c.id)} className="label text-stone hover:text-accent link-underline tap inline-flex items-center gap-1">
                        <X className="h-3 w-3" /> Annuler
                      </button>
                    )}
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="rounded-none border-0 bg-paper max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (() => {
            const doc = detail.doctor_id ? doctors[detail.doctor_id] : null;
            const pres = prescriptionsFor(detail.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-3xl tracking-tight">Compte rendu</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                  <div className="label text-stone tabular">
                    {new Date(detail.scheduled_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                    {detail.consultation_type && <> · {typeMap[detail.consultation_type]}</>}
                  </div>
                  {(doc?.full_name || detail.speciality) && (
                    <p className="serif-italic text-xl">
                      {doc?.full_name ? `Dr ${doc.full_name}` : "Professionnel"}
                      {(detail.speciality || doc?.speciality) && <span className="label text-stone ml-2">— {detail.speciality || doc?.speciality}</span>}
                    </p>
                  )}

                  {[
                    ["Motif", detail.reason],
                    ["Symptômes", detail.symptoms],
                    ["Diagnostic", detail.diagnosis],
                    ["Actes réalisés", detail.procedures],
                    ["Recommandations", detail.recommendations],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <div className="label text-stone mb-1">{k}</div>
                      <p className="text-ink-soft leading-relaxed whitespace-pre-wrap">{v as string}</p>
                    </div>
                  ))}

                  {pres.length > 0 && (
                    <div>
                      <div className="label text-stone mb-2">Prescriptions</div>
                      <ul className="space-y-2">
                        {pres.map((p) => (
                          <li key={p.id} className="border-l-2 border-primary pl-3">
                            <div><span className="serif-italic text-lg">{p.medication_name}</span> <span className="label text-stone">— {p.dosage} · {p.duration}</span></div>
                            {p.instructions && <p className="text-sm text-ink-soft mt-1">{p.instructions}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {detail.follow_up_needed && (
                    <div className="border-l-2 border-accent pl-3">
                      <div className="label text-stone mb-1">Suivi recommandé</div>
                      <p>{detail.follow_up_date ? new Date(detail.follow_up_date).toLocaleString("fr-FR") : "À planifier"}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-ink-10">
                    <button onClick={() => downloadPDF(detail)} className="inline-flex items-center gap-2 label text-primary link-underline tap">
                      <Download className="h-4 w-4" /> Télécharger PDF
                    </button>
                    <button onClick={() => sharePDF(detail)} className="inline-flex items-center gap-2 label text-stone link-underline tap">
                      Partager
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Consultations;
