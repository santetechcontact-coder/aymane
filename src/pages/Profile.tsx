import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SignedDocLink from "@/components/SignedDocLink";
import RoleBadge, { StatusBadge } from "@/components/RoleBadge";
import { Link } from "react-router-dom";
import CompletenessCard from "@/components/CompletenessCard";
import { motion } from "framer-motion";
import { FilePlus2, Send, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Application {
  id: string;
  first_name: string | null; last_name: string | null;
  full_name: string; email: string; phone: string | null;
  city: string | null; region: string | null; professional_address: string | null;
  speciality: string | null; professional_id: string | null; order_number: string | null;
  diploma_year: number | null; years_experience: number | null;
  languages: string[] | null; services: string[] | null;
  profile_photo_url: string | null;
  document_cni_url: string | null; document_cv_url: string | null;
  document_diploma_url: string | null; document_order_url: string | null;
  document_id_url: string | null;
  application_type: string; status: string;
  structure_name: string | null; structure_role: string | null;
  rejection_reason: string | null;
}

interface ComplementRequest {
  id: string;
  reason: string;
  missing_items: string[];
  applicant_response: string | null;
  requested_at: string;
  responded_at: string | null;
  resolved_at: string | null;
}

interface ComplementDocument {
  id: string;
  label: string;
  file_path: string;
  created_at: string;
}

interface Profile {
  full_name: string | null; phone: string | null; city: string | null;
  professional_address: string | null; speciality: string | null;
  professional_photo_url: string | null; avatar_url: string | null; bio: string | null;
}

const Section = ({ title, num, children }: any) => (
  <section className="mb-12">
    <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-ink-10">
      <span className="label tabular text-stone">{num}</span>
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
    </div>
    {children}
  </section>
);

const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-baseline justify-between py-3 border-b border-ink-10/60 gap-4">
    <span className="label text-stone shrink-0">{label}</span>
    <span className="serif-italic text-lg text-ink text-right truncate">{value || <span className="text-stone">—</span>}</span>
  </div>
);

const Profile = () => {
  const { user, roles } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [complement, setComplement] = useState<ComplementRequest | null>(null);
  const [complementDocuments, setComplementDocuments] = useState<ComplementDocument[]>([]);
  const [complementResponse, setComplementResponse] = useState("");
  const [complementFiles, setComplementFiles] = useState<File[]>([]);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    document.title = "Mon profil — AYMANE";
    if (!user) return;
    (async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from("provider_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("full_name, phone, city, professional_address, speciality, professional_photo_url, avatar_url, bio").eq("id", user.id).maybeSingle(),
      ]);
      setApp(a as any); setProfile(p as any);
      if (a?.id) {
        const { data: complementData } = await (supabase as any)
          .from("provider_application_complement_requests")
          .select("*")
          .eq("application_id", a.id)
          .is("resolved_at", null)
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setComplement((complementData ?? null) as ComplementRequest | null);
        setComplementResponse(complementData?.applicant_response ?? "");
        if (complementData?.id) {
          const { data: documentData } = await (supabase as any)
            .from("provider_application_complement_documents")
            .select("*")
            .eq("request_id", complementData.id)
            .order("created_at", { ascending: false });
          setComplementDocuments((documentData ?? []) as ComplementDocument[]);
        }
      }
      const photo = (a as any)?.profile_photo_url;
      if (photo) {
        const { data } = await supabase.storage.from("public-profiles").createSignedUrl(photo, 3600).catch(() => ({ data: null as any }));
        setPhotoUrl(data?.signedUrl ?? null);
      }
    })();
  }, [user]);

  const chooseComplementFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const invalid = files.some((file) => !["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid) {
      toast({
        title: "Fichier non accepté",
        description: "Choisissez des PDF, JPG ou PNG de 10 Mo maximum chacun.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    setComplementFiles(files);
  };

  const submitComplement = async () => {
    if (!user || !complement || complementResponse.trim().length < 3) {
      toast({ title: "Réponse incomplète", description: "Ajoutez un court message pour l'équipe dossiers.", variant: "destructive" });
      return;
    }
    setWorking(true);
    for (const file of complementFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${user.id}/complements/${complement.id}/${crypto.randomUUID()}.${extension}`;
      const uploadResult = await supabase.storage.from("provider-documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadResult.error) {
        setWorking(false);
        toast({ title: "Envoi interrompu", description: `${file.name} n'a pas pu être ajouté.`, variant: "destructive" });
        return;
      }
      const { error } = await (supabase as any).rpc("add_provider_application_complement_document", {
        _request_id: complement.id,
        _label: file.name,
        _file_path: path,
        _mime_type: file.type,
        _file_size_bytes: file.size,
      });
      if (error) {
        await supabase.storage.from("provider-documents").remove([path]);
        setWorking(false);
        toast({ title: "Pièce non enregistrée", description: "Réessayez avec un document lisible.", variant: "destructive" });
        return;
      }
    }
    const { error } = await (supabase as any).rpc("respond_to_provider_application_complement", {
      _request_id: complement.id,
      _response: complementResponse.trim(),
    });
    setWorking(false);
    if (error) {
      toast({ title: "Réponse non envoyée", description: "Actualisez la page puis réessayez.", variant: "destructive" });
      return;
    }
    setComplement((current) => current ? { ...current, applicant_response: complementResponse.trim(), responded_at: new Date().toISOString() } : current);
    setComplementFiles([]);
    toast({ title: "Complément bien envoyé", description: "L'équipe dossiers peut reprendre l'étude." });
  };

  const fullName = app ? `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim() || app.full_name : profile?.full_name ?? user?.email;
  const primaryRole: AppRole | undefined = (roles.find((r) => r !== "patient") as AppRole) ?? roles[0];
  const isProvider = roles.some((r) => r !== "patient");

  return (
    <DashboardLayout title="Profil" eyebrow="Identité professionnelle">
      <motion.header
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
        transition={{ duration: 0.7 }}
        className="mb-12 pb-8 border-b border-ink-10"
      >
        <div className="label text-stone mb-5">Profil professionnel</div>
        <div className="flex items-end gap-6 flex-wrap">
          <div className="size-24 md:size-32 squircle-xl overflow-hidden bg-surface-1 border border-ink-10 shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={fullName ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-3xl text-stone">
                {(fullName ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl md:text-6xl tracking-tighter leading-[0.95] text-balance">
              {fullName ?? "Mon profil"}
            </h1>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {primaryRole && <RoleBadge role={primaryRole} />}
              {app && <StatusBadge status={app.status} />}
              {app?.speciality && <span className="serif-italic text-ink-soft">{app.speciality}</span>}
            </div>
          </div>
        </div>
        {app?.status === "rejected" && app.rejection_reason && (
          <div className="mt-6 p-4 squircle bg-accent/10 text-accent">
            <div className="label mb-1">Motif du rejet</div>
            <p className="serif-italic">{app.rejection_reason}</p>
          </div>
        )}
        {app?.status === "pending" && (
          <div className="mt-6 p-4 squircle border border-amber-200 bg-amber-50 text-amber-900">
            <div className="label mb-1 text-amber-700">Dossier en cours d’étude</div>
            <p className="text-[14px] leading-relaxed">
              Votre compte est bien créé. Notre équipe vérifie vos informations et vos justificatifs avant d’activer votre espace professionnel.
            </p>
          </div>
        )}
        {app?.status === "pending" && complement && (
          <div className="mt-4 rounded-[1rem] border border-primary/20 bg-primary-soft p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[0.75rem] bg-primary text-white">
                <FilePlus2 className="h-4 w-4" />
              </span>
              <div>
                <div className="label mb-1 text-primary">Complément demandé</div>
                <p className="text-[13.5px] leading-relaxed text-ink">{complement.reason}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {complement.missing_items.map((item) => (
                <span key={item} className="rounded-full bg-surface-0 px-2.5 py-1 text-[10.5px] font-semibold text-ink-2">{item}</span>
              ))}
            </div>

            {complementDocuments.length > 0 && (
              <div className="mt-4 rounded-[0.8rem] bg-surface-0 px-3">
                {complementDocuments.map((document) => (
                  <SignedDocLink key={document.id} path={document.file_path} label={document.label} />
                ))}
              </div>
            )}

            {complement.responded_at ? (
              <div className="mt-4 rounded-[0.8rem] bg-emerald-50 p-3 text-emerald-800">
                <p className="text-[12.5px] font-semibold">Votre réponse a bien été transmise.</p>
                <p className="mt-1 text-[11.5px] leading-relaxed">{complement.applicant_response}</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="label text-ink-3">Votre réponse</span>
                  <textarea
                    value={complementResponse}
                    onChange={(event) => setComplementResponse(event.target.value)}
                    rows={3}
                    maxLength={1200}
                    placeholder="Précisez ce que vous avez ajouté ou corrigé."
                    className="mt-1.5 w-full rounded-[0.75rem] border border-hairline bg-surface-0 px-3 py-2.5 text-[13px] outline-none focus:border-primary/40"
                  />
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[0.75rem] border border-dashed border-primary/30 bg-surface-0 px-3">
                  <Upload className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-primary">
                    {complementFiles.length ? `${complementFiles.length} pièce${complementFiles.length > 1 ? "s" : ""} sélectionnée${complementFiles.length > 1 ? "s" : ""}` : "Ajouter les pièces demandées"}
                  </span>
                  <input type="file" multiple accept=".pdf,image/jpeg,image/png" className="sr-only" onChange={chooseComplementFiles} />
                </label>
                <button
                  type="button"
                  disabled={working || complementResponse.trim().length < 3}
                  onClick={() => void submitComplement()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Envoyer le complément
                </button>
              </div>
            )}
          </div>
        )}
        {app?.status === "approved" && (
          <div className="mt-6 p-4 squircle border border-emerald-200 bg-emerald-50 text-emerald-900">
            <div className="label mb-1 text-emerald-700">Compte professionnel actif</div>
            <p className="text-[14px] leading-relaxed">Votre profil est validé et vos outils professionnels sont disponibles.</p>
          </div>
        )}
      </motion.header>

      {!app && !isProvider && (
        <div className="paper-card p-8 text-center mb-10">
          <p className="serif-italic text-xl text-ink-soft mb-4">Vous n'avez pas encore de profil professionnel.</p>
          <Link to="/auth/provider" className="label link-underline text-primary">Créer mon profil professionnel →</Link>
        </div>
      )}

      <CompletenessCard />

      {app && (
        <>
          <Section title="Informations personnelles" num="01">
            <div className="grid md:grid-cols-2 gap-x-10">
              <Field label="Prénom" value={app.first_name} />
              <Field label="Nom" value={app.last_name} />
              <Field label="Email" value={app.email} />
              <Field label="Téléphone" value={app.phone} />
              <Field label="Ville" value={app.city} />
              <Field label="Région" value={app.region} />
              <Field label="Adresse professionnelle" value={app.professional_address} />
            </div>
          </Section>

          <Section title="Informations professionnelles" num="02">
            <div className="grid md:grid-cols-2 gap-x-10">
              <Field label="Rôle" value={ROLE_LABELS[app.application_type as AppRole] ?? app.application_type} />
              <Field label="Spécialité" value={app.speciality} />
              <Field label="N° d'ordre" value={app.order_number ?? app.professional_id} />
              <Field label="Année de diplôme" value={app.diploma_year} />
              <Field label="Années d'expérience" value={app.years_experience} />
              <Field label="Langues parlées" value={app.languages?.join(", ")} />
              <Field label="Services" value={app.services?.join(", ")} />
            </div>
          </Section>

          <Section title="Documents" num="03">
            <p className="text-sm text-stone mb-4">Documents fournis lors de l'inscription. Cliquez pour consulter.</p>
            <SignedDocLink path={app.document_cni_url ?? app.document_id_url} label="Carte Nationale d'Identité" />
            <SignedDocLink path={app.document_cv_url} label="CV" />
            <SignedDocLink path={app.document_diploma_url} label="Diplômes & certifications" />
            {app.document_order_url && <SignedDocLink path={app.document_order_url} label="Inscription à l'ordre" />}
          </Section>

          <Section title="Statut & Structure" num="04">
            <div className="grid md:grid-cols-2 gap-x-10">
              <Field label="Statut du compte" value={<StatusBadge status={app.status} />} />
              <Field label="Type de profil" value={ROLE_LABELS[app.application_type as AppRole] ?? app.application_type} />
              <Field label="Structure liée" value={app.structure_name} />
              <Field label="Rôle dans la structure" value={app.structure_role} />
            </div>
            {(roles.includes("admin") || roles.some((r) => ["doctor","dentist","nurse","midwife","pharmacist","lab_technician"].includes(r))) && (
              <div className="mt-6">
                <Link to="/dashboard/structure" className="label link-underline text-primary">Gérer ma structure sanitaire →</Link>
              </div>
            )}
          </Section>
        </>
      )}
    </DashboardLayout>
  );
};

export default Profile;
