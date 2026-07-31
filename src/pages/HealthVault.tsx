import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Building2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Syringe,
  Upload,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type VaultView = "documents" | "vaccines" | "stays" | "sharing";

type MedicalDocument = {
  id: string;
  title: string;
  category: string;
  file_path: string;
  mime_type: string | null;
  occurred_on: string | null;
  source_name: string | null;
  created_at: string;
};

type Vaccination = {
  id: string;
  vaccine_name: string;
  dose_label: string | null;
  administered_on: string;
  next_due_on: string | null;
  provider_name: string | null;
};

type Hospitalization = {
  id: string;
  facility_name: string;
  reason: string;
  admitted_on: string;
  discharged_on: string | null;
  discharge_summary: string | null;
};

type ShareLink = {
  id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type AccessLog = {
  id: string;
  action: string;
  resource_type: string;
  reason: string;
  created_at: string;
};

const views: { id: VaultView; label: string; icon: typeof FileText }[] = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "vaccines", label: "Vaccins", icon: Syringe },
  { id: "stays", label: "Séjours", icon: Building2 },
  { id: "sharing", label: "Partage", icon: Link2 },
];

const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const formatDate = (value: string, withTime = false) =>
  new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

const categoryLabels: Record<string, string> = {
  analysis: "Analyse",
  imaging: "Imagerie",
  report: "Compte rendu",
  prescription: "Ordonnance",
  discharge: "Sortie d'hôpital",
  vaccination: "Vaccination",
  other: "Autre",
};

const HealthVault = () => {
  const { user } = useAuth();
  const db: SupabaseClient = supabase;
  const [view, setView] = useState<VaultView>("documents");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentForm, setDocumentForm] = useState({
    title: "",
    category: "analysis",
    occurredOn: "",
    source: "",
  });
  const [vaccineForm, setVaccineForm] = useState({
    name: "",
    dose: "",
    date: new Date().toISOString().slice(0, 10),
    nextDate: "",
    provider: "",
  });
  const [stayForm, setStayForm] = useState({
    facility: "",
    reason: "",
    admittedOn: "",
    dischargedOn: "",
    summary: "",
  });
  const [shareHours, setShareHours] = useState("24");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [documentResult, vaccineResult, stayResult, linkResult, logResult] = await Promise.all([
      db.from("medical_documents").select("*").eq("patient_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }),
      db.from("vaccinations").select("*").eq("patient_id", user.id).order("administered_on", { ascending: false }),
      db.from("hospitalizations").select("*").eq("patient_id", user.id).order("admitted_on", { ascending: false }),
      db.from("medical_share_links").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }).limit(12),
      db.from("medical_access_logs").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }).limit(25),
    ]);

    setDocuments((documentResult.data ?? []) as MedicalDocument[]);
    setVaccinations((vaccineResult.data ?? []) as Vaccination[]);
    setHospitalizations((stayResult.data ?? []) as Hospitalization[]);
    setShareLinks((linkResult.data ?? []) as ShareLink[]);
    setAccessLogs((logResult.data ?? []) as AccessLog[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Mon coffre santé - AYMANE";
    void load();
  }, [user]);

  const activeShare = useMemo(
    () => shareLinks.find((item) => !item.revoked_at && new Date(item.expires_at).getTime() > Date.now()) ?? null,
    [shareLinks],
  );

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type) || file.size > 15 * 1024 * 1024) {
      toast({
        title: "Fichier non accepté",
        description: "Choisissez un PDF, JPG ou PNG de 15 Mo maximum.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
    if (!documentForm.title) {
      setDocumentForm((current) => ({ ...current, title: file.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const uploadDocument = async () => {
    if (!user || !selectedFile || documentForm.title.trim().length < 2) {
      toast({ title: "Document incomplet", description: "Ajoutez un fichier et un titre.", variant: "destructive" });
      return;
    }

    setWorking(true);
    const extension = selectedFile.name.split(".").pop()?.toLowerCase() ?? "bin";
    const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const uploadResult = await supabase.storage.from("medical-documents").upload(filePath, selectedFile, {
      contentType: selectedFile.type,
      upsert: false,
    });

    if (uploadResult.error) {
      setWorking(false);
      toast({ title: "Envoi interrompu", description: "Le document n'a pas été ajouté. Réessayez.", variant: "destructive" });
      return;
    }

    const { error } = await db.from("medical_documents").insert({
      patient_id: user.id,
      title: documentForm.title.trim(),
      category: documentForm.category,
      file_path: filePath,
      mime_type: selectedFile.type,
      file_size_bytes: selectedFile.size,
      occurred_on: documentForm.occurredOn || null,
      source_name: documentForm.source.trim() || null,
    });

    if (error) {
      await supabase.storage.from("medical-documents").remove([filePath]);
      setWorking(false);
      toast({ title: "Document non enregistré", description: "Vérifiez les informations puis réessayez.", variant: "destructive" });
      return;
    }

    setWorking(false);
    setSelectedFile(null);
    setDocumentForm({ title: "", category: "analysis", occurredOn: "", source: "" });
    toast({ title: "Document bien rangé", description: "Il est maintenant disponible dans votre coffre santé." });
    await load();
  };

  const openDocument = async (document: MedicalDocument) => {
    const { data, error } = await supabase.storage.from("medical-documents").createSignedUrl(document.file_path, 120);
    if (error || !data?.signedUrl) {
      toast({ title: "Document indisponible", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const addVaccination = async () => {
    if (!user || vaccineForm.name.trim().length < 2 || !vaccineForm.date) {
      toast({ title: "Vaccin incomplet", description: "Indiquez le vaccin et la date.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("vaccinations").insert({
      patient_id: user.id,
      vaccine_name: vaccineForm.name.trim(),
      dose_label: vaccineForm.dose.trim() || null,
      administered_on: vaccineForm.date,
      next_due_on: vaccineForm.nextDate || null,
      provider_name: vaccineForm.provider.trim() || null,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Vaccin non enregistré", description: "Vérifiez les dates saisies.", variant: "destructive" });
      return;
    }
    setVaccineForm({ name: "", dose: "", date: new Date().toISOString().slice(0, 10), nextDate: "", provider: "" });
    toast({ title: "Vaccin ajouté au carnet" });
    await load();
  };

  const addHospitalization = async () => {
    if (!user || stayForm.facility.trim().length < 2 || stayForm.reason.trim().length < 2 || !stayForm.admittedOn) {
      toast({ title: "Séjour incomplet", description: "Indiquez l'établissement, le motif et la date d'entrée.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await db.from("hospitalizations").insert({
      patient_id: user.id,
      facility_name: stayForm.facility.trim(),
      reason: stayForm.reason.trim(),
      admitted_on: stayForm.admittedOn,
      discharged_on: stayForm.dischargedOn || null,
      discharge_summary: stayForm.summary.trim() || null,
    });
    setWorking(false);
    if (error) {
      toast({ title: "Séjour non enregistré", description: "Vérifiez les dates saisies.", variant: "destructive" });
      return;
    }
    setStayForm({ facility: "", reason: "", admittedOn: "", dischargedOn: "", summary: "" });
    toast({ title: "Séjour ajouté au dossier" });
    await load();
  };

  const createShareLink = async () => {
    const hours = Number(shareHours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) return;
    setWorking(true);
    const { data, error } = await db.rpc("create_medical_share_link", { _duration_hours: hours });
    setWorking(false);
    if (error || !data) {
      toast({ title: "Lien non créé", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/dossier-partage/${data}`;
    await navigator.clipboard?.writeText(url);
    toast({ title: "Lien sécurisé prêt", description: "Il a été copié et expirera automatiquement." });
    await load();
  };

  const revokeShareLink = async (id: string) => {
    const { error } = await db.from("medical_share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Action non terminée", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    toast({ title: "Partage arrêté" });
    await load();
  };

  const copyShareLink = async (token: string) => {
    await navigator.clipboard?.writeText(`${window.location.origin}/dossier-partage/${token}`);
    toast({ title: "Lien copié" });
  };

  return (
    <DashboardLayout title="Coffre santé" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Dossier personnel</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Votre santé, bien rangée et sous contrôle.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Gardez vos documents importants à portée de main et décidez vous-même quand les partager.
        </p>
      </header>

      <nav className="mb-6 overflow-x-auto no-scrollbar" aria-label="Contenu du coffre santé">
        <div className="flex min-w-max gap-1 rounded-[0.9rem] bg-surface-1 p-1">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-[0.7rem] px-3 text-[12px] font-semibold transition",
                  view === item.id ? "bg-ink text-white shadow-sm" : "text-ink-3",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Ouverture de votre coffre…</p></div>
      ) : (
        <>
          {view === "documents" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Panel title="Ajouter un document" description="PDF, photo d'analyse, ordonnance ou compte rendu.">
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[0.85rem] border border-dashed border-primary/35 bg-primary-soft/45 px-4 text-center">
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="mt-2 text-[13px] font-semibold text-primary">
                    {selectedFile ? selectedFile.name : "Choisir un fichier"}
                  </span>
                  <span className="mt-1 text-[11px] text-ink-3">PDF, JPG ou PNG · 15 Mo maximum</span>
                  <input type="file" accept=".pdf,image/jpeg,image/png" className="sr-only" onChange={chooseFile} />
                </label>
                <Field label="Titre">
                  <input className={inputClass} value={documentForm.title} onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} placeholder="Ex. Bilan sanguin" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type">
                    <select className={inputClass} value={documentForm.category} onChange={(event) => setDocumentForm({ ...documentForm, category: event.target.value })}>
                      {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Date du document">
                    <input type="date" className={inputClass} value={documentForm.occurredOn} onChange={(event) => setDocumentForm({ ...documentForm, occurredOn: event.target.value })} />
                  </Field>
                </div>
                <Field label="Établissement ou professionnel">
                  <input className={inputClass} value={documentForm.source} onChange={(event) => setDocumentForm({ ...documentForm, source: event.target.value })} placeholder="Ex. Hôpital Principal" />
                </Field>
                <ActionButton onClick={() => void uploadDocument()} disabled={working} icon={Upload}>Ajouter au coffre</ActionButton>
              </Panel>

              <Panel title="Mes documents" description={`${documents.length} document${documents.length > 1 ? "s" : ""} conservé${documents.length > 1 ? "s" : ""}.`}>
                {documents.length === 0 ? <Empty text="Votre premier document apparaîtra ici." /> : (
                  <div className="-mt-2">
                    {documents.map((document) => (
                      <article key={document.id} className="flex items-center gap-3 border-b border-hairline py-3.5 last:border-0">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-ink">{document.title}</p>
                          <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                            {categoryLabels[document.category] ?? "Document"}
                            {document.occurred_on ? ` · ${formatDate(document.occurred_on)}` : ""}
                          </p>
                        </div>
                        <button type="button" onClick={() => void openDocument(document)} className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-1 text-ink-2" aria-label={`Ouvrir ${document.title}`}>
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )}

          {view === "vaccines" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Panel title="Ajouter un vaccin" description="Gardez les doses reçues et les prochains rappels.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Vaccin"><input className={inputClass} value={vaccineForm.name} onChange={(event) => setVaccineForm({ ...vaccineForm, name: event.target.value })} placeholder="Ex. Fièvre jaune" /></Field>
                  <Field label="Dose"><input className={inputClass} value={vaccineForm.dose} onChange={(event) => setVaccineForm({ ...vaccineForm, dose: event.target.value })} placeholder="Ex. Dose 2" /></Field>
                  <Field label="Date reçue"><input type="date" className={inputClass} value={vaccineForm.date} onChange={(event) => setVaccineForm({ ...vaccineForm, date: event.target.value })} /></Field>
                  <Field label="Prochain rappel"><input type="date" className={inputClass} value={vaccineForm.nextDate} onChange={(event) => setVaccineForm({ ...vaccineForm, nextDate: event.target.value })} /></Field>
                </div>
                <Field label="Lieu ou professionnel"><input className={inputClass} value={vaccineForm.provider} onChange={(event) => setVaccineForm({ ...vaccineForm, provider: event.target.value })} /></Field>
                <ActionButton onClick={() => void addVaccination()} disabled={working}>Ajouter au carnet</ActionButton>
              </Panel>
              <Panel title="Carnet de vaccination" description={`${vaccinations.length} dose${vaccinations.length > 1 ? "s" : ""} enregistrée${vaccinations.length > 1 ? "s" : ""}.`}>
                {vaccinations.length === 0 ? <Empty text="Aucun vaccin enregistré pour le moment." /> : vaccinations.map((vaccine) => (
                  <article key={vaccine.id} className="flex gap-3 border-b border-hairline py-3.5 first:pt-0 last:border-0 last:pb-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-emerald-100 text-emerald-700"><Syringe className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink">{vaccine.vaccine_name}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-3">{vaccine.dose_label || "Dose"} · {formatDate(vaccine.administered_on)}</p>
                      {vaccine.next_due_on && <p className="mt-1 text-[11.5px] font-medium text-primary">Rappel prévu le {formatDate(vaccine.next_due_on)}</p>}
                    </div>
                  </article>
                ))}
              </Panel>
            </div>
          )}

          {view === "stays" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Panel title="Ajouter un séjour" description="Hospitalisation, passage en clinique ou sortie.">
                <Field label="Établissement"><input className={inputClass} value={stayForm.facility} onChange={(event) => setStayForm({ ...stayForm, facility: event.target.value })} placeholder="Ex. Hôpital Dalal Jamm" /></Field>
                <Field label="Motif"><input className={inputClass} value={stayForm.reason} onChange={(event) => setStayForm({ ...stayForm, reason: event.target.value })} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Entrée"><input type="date" className={inputClass} value={stayForm.admittedOn} onChange={(event) => setStayForm({ ...stayForm, admittedOn: event.target.value })} /></Field>
                  <Field label="Sortie"><input type="date" className={inputClass} value={stayForm.dischargedOn} onChange={(event) => setStayForm({ ...stayForm, dischargedOn: event.target.value })} /></Field>
                </div>
                <Field label="Résumé de sortie"><textarea className="min-h-24 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 py-2.5 text-[14px] outline-none focus:border-primary/50" value={stayForm.summary} onChange={(event) => setStayForm({ ...stayForm, summary: event.target.value })} /></Field>
                <ActionButton onClick={() => void addHospitalization()} disabled={working}>Enregistrer le séjour</ActionButton>
              </Panel>
              <Panel title="Historique des séjours" description={`${hospitalizations.length} séjour${hospitalizations.length > 1 ? "s" : ""} enregistré${hospitalizations.length > 1 ? "s" : ""}.`}>
                {hospitalizations.length === 0 ? <Empty text="Aucun séjour enregistré pour le moment." /> : hospitalizations.map((stay) => (
                  <article key={stay.id} className="border-b border-hairline py-4 first:pt-0 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-secondary-soft text-secondary"><Building2 className="h-4 w-4" /></span>
                      <div>
                        <p className="text-[14px] font-semibold text-ink">{stay.facility_name}</p>
                        <p className="mt-0.5 text-[12px] text-ink-3">{stay.reason}</p>
                        <p className="mt-1 text-[11px] font-medium text-ink-2">{formatDate(stay.admitted_on)} {stay.discharged_on ? `au ${formatDate(stay.discharged_on)}` : "· en cours"}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </Panel>
            </div>
          )}

          {view === "sharing" && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <section className="rounded-[1rem] bg-ink p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid size-11 place-items-center rounded-[0.8rem] bg-white/10"><LockKeyhole className="h-5 w-5" /></span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">Accès temporaire</span>
                  </div>
                  <h2 className="mt-5 font-display text-2xl">Partagez l'essentiel, pas tout votre compte.</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/65">Le lien affiche un résumé médical utile et s'arrête automatiquement.</p>
                  <label className="mt-5 block">
                    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-white/55">Durée</span>
                    <select value={shareHours} onChange={(event) => setShareHours(event.target.value)} className="h-11 w-full rounded-[0.75rem] border border-white/15 bg-white/10 px-3 text-[13px] text-white outline-none">
                      <option className="text-ink" value="1">1 heure</option>
                      <option className="text-ink" value="6">6 heures</option>
                      <option className="text-ink" value="24">24 heures</option>
                      <option className="text-ink" value="72">3 jours</option>
                      <option className="text-ink" value="168">7 jours</option>
                    </select>
                  </label>
                  <button type="button" disabled={working} onClick={() => void createShareLink()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-ink disabled:opacity-50">
                    <Link2 className="h-4 w-4" />
                    Créer et copier le lien
                  </button>
                </section>

                {activeShare && (
                  <section className="rounded-[1rem] border border-primary/20 bg-primary-soft p-4">
                    <div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-4 w-4" /><p className="text-[12px] font-semibold">Un partage est actif</p></div>
                    <p className="mt-2 text-[11.5px] text-ink-3">Disponible jusqu'au {formatDate(activeShare.expires_at, true)}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => void copyShareLink(activeShare.token)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-3 text-[12px] font-semibold text-white"><Copy className="h-3.5 w-3.5" />Copier</button>
                      <button type="button" onClick={() => void revokeShareLink(activeShare.id)} className="grid size-10 place-items-center rounded-full border border-primary/20 text-primary" aria-label="Arrêter le partage"><X className="h-4 w-4" /></button>
                    </div>
                  </section>
                )}
              </div>

              <Panel title="Activité du dossier" description="Vous voyez quand un accès ou un partage a eu lieu.">
                {accessLogs.length === 0 ? <Empty text="Aucun accès enregistré." /> : accessLogs.map((log) => (
                  <article key={log.id} className="flex gap-3 border-b border-hairline py-3.5 first:pt-0 last:border-0 last:pb-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-1 text-ink-2"><Clock3 className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">
                        {log.action === "create_share_link" ? "Lien de partage créé" : log.action === "public_share_read" ? "Dossier partagé consulté" : "Accès au dossier"}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{log.reason}</p>
                      <p className="mt-1 text-[10.5px] text-ink-4">{formatDate(log.created_at, true)}</p>
                    </div>
                  </article>
                ))}
              </Panel>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

const Panel = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
    <h2 className="font-display text-xl text-ink">{title}</h2>
    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{description}</p>
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="min-w-0">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</span>
    {children}
  </label>
);

const ActionButton = ({ children, onClick, disabled, icon: Icon = Plus }: { children: React.ReactNode; onClick: () => void; disabled: boolean; icon?: typeof Plus }) => (
  <button type="button" disabled={disabled} onClick={onClick} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
    <Icon className="h-4 w-4" />
    {children}
  </button>
);

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-[0.8rem] border border-dashed border-hairline bg-surface-1 px-4 py-6 text-center">
    <p className="text-[13px] text-ink-3">{text}</p>
  </div>
);

export default HealthVault;
