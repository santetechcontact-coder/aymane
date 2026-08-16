import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DocumentUpload from "@/components/DocumentUpload";
import PhotoUpload from "@/components/PhotoUpload";
import RoleSpecificFields, { type RoleSpecific } from "@/components/RoleSpecificFields";
import SearchableMultiSelect from "@/components/smart/SearchableMultiSelect";
import type { TimeSlot } from "@/components/smart/TimeSlotPicker";
import { SPECIALTIES, flattenGroups, REGIONS } from "@/lib/medical-data";
import {
  Check, ArrowLeft, ArrowRight, Stethoscope, Pill,
  Smile, Heart, Baby, FlaskConical, UserPlus, Hospital, Loader2, MailCheck, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/AuthShell";
import { friendlyAuthError, syncAccountSession } from "@/lib/account-backend";
import { attachDocumentsToApplication } from "@/lib/provider-documents";
import { securePasswordSchema } from "@/lib/auth-validation";

// Draft persistence — lets a professional resume document upload after
// confirming their email (when Supabase requires email confirmation, signUp
// returns no session, so uploads must happen once a session exists). The
// password is never persisted.
const DRAFT_KEY = "aymane:provider-draft-v1";

interface ProviderDraft {
  userId: string;
  email: string;
  type: string;
  structureKind: string;
  form: Record<string, string>;
  roleSpecific: unknown;
  yearsExperience: string;
  languages: string[];
  primaryLanguage: string;
  services: string[];
  specialties: string[];
  days: string[];
  timeSlots: unknown[];
  structureRole: string;
}

const readDraft = (): ProviderDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ProviderDraft) : null;
  } catch {
    return null;
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
};

// --- Types ---
type ProviderKind =
  | "doctor" | "dentist" | "nurse" | "midwife" | "pharmacist" | "lab_technician" | "other_provider";
type StructureKind = "hospital" | "clinic" | "medical_office" | "dental_office" | "lab" | "pharmacy" | "health_center" | "other";
type AppType = ProviderKind | "structure";

const PROVIDER_TYPES: { id: ProviderKind; label: string; desc: string; icon: any }[] = [
  { id: "doctor", label: "Médecin", desc: "Médecine générale ou spécialisée", icon: Stethoscope },
  { id: "dentist", label: "Dentiste", desc: "Chirurgie dentaire", icon: Smile },
  { id: "nurse", label: "Infirmier(ère)", desc: "Soins infirmiers", icon: Heart },
  { id: "midwife", label: "Sage-femme", desc: "Suivi pré et post-natal", icon: Baby },
  { id: "pharmacist", label: "Pharmacien", desc: "Officine ou hospitalier", icon: Pill },
  { id: "lab_technician", label: "Tech. laboratoire", desc: "Analyses biomédicales", icon: FlaskConical },
  { id: "other_provider", label: "Autre profession", desc: "Kinésithérapeute, psychologue…", icon: UserPlus },
];

const STRUCTURE_TYPES: { id: StructureKind; label: string }[] = [
  { id: "hospital", label: "Hôpital" },
  { id: "clinic", label: "Clinique" },
  { id: "medical_office", label: "Cabinet médical" },
  { id: "dental_office", label: "Cabinet dentaire" },
  { id: "lab", label: "Laboratoire d'analyses" },
  { id: "pharmacy", label: "Pharmacie" },
  { id: "health_center", label: "Centre de santé" },
  { id: "other", label: "Autre structure" },
];

// --- Zod schemas ---
const baseProSchema = z.object({
  first_name: z.string().trim().min(2, "Prénom requis").max(80),
  last_name: z.string().trim().min(2, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(255),
  password: securePasswordSchema,
  phone: z.string().trim().min(8, "Téléphone invalide").max(20),
  city: z.string().trim().min(2, "Ville requise").max(80),
  professional_address: z.string().trim().min(4, "Adresse pro requise").max(200),
});

const baseStructureSchema = z.object({
  structure_name: z.string().trim().min(2, "Nom requis").max(150),
  email: z.string().trim().email("Email invalide").max(255),
  password: securePasswordSchema,
  manager_name: z.string().trim().min(2, "Nom du responsable requis").max(150),
  phone_landline: z.string().trim().min(8, "Téléphone fixe requis").max(20),
  address: z.string().trim().min(4, "Adresse requise").max(200),
  city: z.string().trim().min(2, "Ville requise").max(80),
  region: z.string().trim().min(2, "Région requise"),
});

const ProviderSignup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, loading: authLoading } = useAuth();

  // Step 0: choose AppType. Step 1: profile + account. Step 2: documents.
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const initialType = (params.get("type") as AppType) || null;
  const wantsResume = params.get("resume") === "1";
  const [type, setType] = useState<AppType | null>(initialType);
  const [structureKind, setStructureKind] = useState<StructureKind>("clinic");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // When email confirmation is required, signUp yields no session. We show a
  // "check your email" panel instead of dead-ending on a broken upload step.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  // While a post-confirmation resume is being resolved, show a spinner rather
  // than flashing the (stale) first step.
  const [resolvingResume, setResolvingResume] = useState(wantsResume);

  const [form, setForm] = useState({
    // Pro fields
    first_name: "", last_name: "",
    email: "", password: "",
    phone: "", city: "", region: "",
    professional_address: "",
    order_number: "", speciality: "", diploma_year: "",
    // Structure fields
    structure_name: "", manager_name: "",
    phone_landline: "", phone_mobile: "",
    address: "",
    rccm: "", ministry_approval: "",
    description: "",
  });

  const [docs, setDocs] = useState<Record<string, string | null>>({
    document_cni_url: null,
    document_cv_url: null,
    document_diploma_url: null,
    document_order_url: null,
    document_legal_url: null,
    document_approval_url: null,
    document_rccm_url: null,
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Role-specific dynamic state
  const [roleSpecific, setRoleSpecific] = useState<RoleSpecific>({});
  const [yearsExperience, setYearsExperience] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [structureRole, setStructureRole] = useState("");
  const specialtyOptions = flattenGroups(SPECIALTIES);
  const specialtyLabels = (vals: string[]) =>
    vals.map((v) => specialtyOptions.find((o) => o.value === v)?.label ?? v).join(", ");

  useEffect(() => { document.title = "Inscription professionnelle — AYMANE"; }, []);
  useEffect(() => { if (initialType && !wantsResume) setStep(1); }, [initialType, wantsResume]);

  // Persist everything except the password so the applicant can resume at the
  // document step once a session exists (after email confirmation, or after a
  // page refresh mid-upload).
  const saveDraft = (id: string) => {
    const draft: ProviderDraft = {
      userId: id,
      email: form.email.trim().toLowerCase(),
      type: type ?? "",
      structureKind,
      form: { ...form, password: "" },
      roleSpecific,
      yearsExperience,
      languages,
      primaryLanguage,
      services,
      specialties,
      days,
      timeSlots,
      structureRole,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  };

  const restoreDraft = (draft: ProviderDraft) => {
    if (draft.type) setType(draft.type as AppType);
    if (draft.structureKind) setStructureKind(draft.structureKind as StructureKind);
    setForm((f) => ({ ...f, ...draft.form, password: "" }));
    setRoleSpecific((draft.roleSpecific as RoleSpecific) ?? {});
    setYearsExperience(draft.yearsExperience ?? "");
    setLanguages(draft.languages ?? []);
    setPrimaryLanguage(draft.primaryLanguage ?? "");
    setServices(draft.services ?? []);
    setSpecialties(draft.specialties ?? []);
    setDays(draft.days ?? []);
    setTimeSlots((draft.timeSlots as TimeSlot[]) ?? []);
    setStructureRole(draft.structureRole ?? "");
  };

  // Resume after email confirmation: once a session is available and a matching
  // draft exists, jump straight to the document step with the applicant's data.
  useEffect(() => {
    if (authLoading) return;
    if (userId) { setResolvingResume(false); return; }
    if (session?.user) {
      const draft = readDraft();
      if (draft && draft.userId === session.user.id) {
        restoreDraft(draft);
        setUserId(session.user.id);
        setAwaitingConfirmation(false);
        setStep(2);
        setResolvingResume(false);
        toast({
          title: "Reprise de votre inscription",
          description: "Téléversez vos justificatifs pour finaliser votre dossier.",
        });
        return;
      }
    }
    setResolvingResume(false);
  }, [session, authLoading, userId]);

  const isStructure = type === "structure";
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const updateDoc = (k: string) => (path: string | null) => setDocs((d) => ({ ...d, [k]: path }));

  const selectedProviderMeta = useMemo(
    () => PROVIDER_TYPES.find((t) => t.id === type),
    [type]
  );

  // ============== Account creation ==============
  const createAccount = async () => {
    if (!type) return;

    // A session may already exist: resumed after email confirmation, or an
    // existing account continuing as a professional. Then no password is needed.
    const alreadySignedIn = Boolean(session?.user);
    const proSchema = alreadySignedIn ? baseProSchema.omit({ password: true }) : baseProSchema;
    const structureSchema = alreadySignedIn ? baseStructureSchema.omit({ password: true }) : baseStructureSchema;
    try {
      if (isStructure) structureSchema.parse(form);
      else proSchema.parse(form);
    } catch (err: any) {
      toast({ title: "Champs manquants", description: err.errors?.[0]?.message ?? "Vérifiez vos informations", variant: "destructive" });
      return;
    }

    // Already authenticated → skip signUp and go straight to the documents.
    if (alreadySignedIn && session?.user) {
      setUserId(session.user.id);
      saveDraft(session.user.id);
      setStep(2);
      return;
    }

    setSubmitting(true);
    const emailForAuth = form.email.trim().toLowerCase();
    const fullName = isStructure
      ? form.structure_name
      : `${form.first_name} ${form.last_name}`.trim();

    const { data, error } = await supabase.auth.signUp({
      email: emailForAuth,
      password: form.password,
      options: {
        // After confirmation, land back here so the applicant resumes at the
        // document step instead of an empty dashboard.
        emailRedirectTo: `${window.location.origin}/auth/provider?resume=1`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Inscription impossible", description: friendlyAuthError(error), variant: "destructive" });
      return;
    }
    if (!data.user) {
      setSubmitting(false);
      toast({ title: "Erreur", description: "Compte non créé", variant: "destructive" });
      return;
    }

    // Persist a draft (never the password) so the applicant can resume the
    // document upload after confirming their email or after a page refresh.
    saveDraft(data.user.id);

    // Try to obtain a session now. Present when email confirmation is disabled
    // or the address is already confirmed; absent when confirmation is required.
    let activeSession = data.session;
    if (!activeSession) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        password: form.password,
      });
      activeSession = signInData.session;
    }
    setSubmitting(false);

    if (activeSession) {
      await syncAccountSession(activeSession, "signup").catch(() => null);
      setUserId(activeSession.user.id);
      setStep(2);
      toast({ title: "Compte créé", description: "Téléversez maintenant vos pièces justificatives." });
      return;
    }

    // No session yet — email confirmation is required. Keep the applicant here
    // with a clear next step instead of failing every upload under RLS.
    setAwaitingConfirmation(true);
    toast({
      title: "Compte créé — confirmez votre email",
      description: "Cliquez sur le lien envoyé à votre adresse, puis reprenez le téléversement de vos documents.",
    });
  };

  // Called from the confirmation panel: retry sign-in in the same session once
  // the applicant has clicked the email link (password still in memory).
  const retryAfterConfirmation = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setSubmitting(false);
    if (error || !data.session) {
      toast({
        title: "Email pas encore confirmé",
        description: "Ouvrez le lien reçu par email, puis réessayez.",
        variant: "destructive",
      });
      return;
    }
    await syncAccountSession(data.session, "signup").catch(() => null);
    setUserId(data.session.user.id);
    setAwaitingConfirmation(false);
    setStep(2);
    toast({ title: "Email confirmé", description: "Téléversez vos pièces justificatives pour finaliser." });
  };

  const resendConfirmation = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: form.email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/provider?resume=1` },
    });
    toast(
      error
        ? { title: "Envoi impossible", description: friendlyAuthError(error), variant: "destructive" }
        : { title: "Email renvoyé", description: `Nouveau lien envoyé à ${form.email}.` },
    );
  };

  // ============== Submit application ==============
  const submitApplication = async () => {
    if (!userId || !type) return;

    // Required documents per type
    const requiredDocs: { key: string; label: string }[] = [];
    if (!isStructure) {
      requiredDocs.push({ key: "document_cni_url", label: "CNI" });
      requiredDocs.push({ key: "document_cv_url", label: "CV" });
      requiredDocs.push({ key: "document_diploma_url", label: "Diplôme" });
      if (type === "doctor" || type === "dentist" || type === "pharmacist" || type === "midwife") {
        requiredDocs.push({ key: "document_order_url", label: "Carte d'ordre" });
      }
    } else {
      requiredDocs.push({ key: "document_legal_url", label: "Document légal (RCCM/agrément)" });
    }

    const missing = requiredDocs.find((r) => !docs[r.key]);
    if (missing) {
      toast({ title: "Document manquant", description: `${missing.label} obligatoire.`, variant: "destructive" });
      return;
    }

    if (!isStructure && !photoUrl) {
      toast({ title: "Photo manquante", description: "Photo de profil professionnelle obligatoire.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const fullName = isStructure
      ? form.structure_name
      : `${form.first_name} ${form.last_name}`.trim();

    // Insert application
    const appPayload: any = {
      user_id: userId,
      application_type: type,
      full_name: fullName,
      first_name: isStructure ? null : form.first_name,
      last_name: isStructure ? null : form.last_name,
      email: form.email,
      phone: isStructure ? form.phone_landline : form.phone,
      phone_landline: isStructure ? form.phone_landline : null,
      phone_mobile: isStructure ? (form.phone_mobile || null) : null,
      city: form.city,
      region: form.region || null,
      address: isStructure ? form.address : null,
      professional_address: isStructure ? null : form.professional_address,
      order_number: isStructure ? null : (form.order_number || null),
      professional_id: isStructure ? null : (form.order_number || null),
      speciality: isStructure ? null : (specialties.length ? specialtyLabels(specialties) : (form.speciality || null)),
      diploma_year: form.diploma_year ? parseInt(form.diploma_year) : null,
      structure_name: isStructure ? form.structure_name : null,
      structure_type: isStructure ? structureKind : null,
      manager_name: isStructure ? form.manager_name : null,
      rccm: isStructure ? (form.rccm || null) : null,
      ministry_approval: isStructure ? (form.ministry_approval || null) : null,
      profile_photo_url: photoUrl,
      logo_url: logoUrl,
      years_experience: !isStructure && yearsExperience ? parseInt(yearsExperience) : null,
      languages: !isStructure && languages.length ? languages : null,
      services: !isStructure && services.length ? services : null,
      role_specific: !isStructure
        ? { ...roleSpecific, specialties, days, time_slots: timeSlots, primary_language: primaryLanguage || null }
        : {},
      structure_role: !isStructure && structureRole ? structureRole : null,
      ...docs,
    };

    const { data: application, error: appError } = await supabase
      .from("provider_applications")
      .insert(appPayload)
      .select("id")
      .single();

    if (appError) {
      setSubmitting(false);
      toast({ title: "Erreur", description: appError.message, variant: "destructive" });
      return;
    }

    // The pieces were deposited before this application existed; bind them to it
    // now so the reviewer sees the dossier and its documents as one whole.
    if (application?.id) {
      await attachDocumentsToApplication(application.id).catch(() => null);
    }

    // If structure, create row in health_structures (unverified)
    if (isStructure) {
      await supabase.from("health_structures").insert({
        owner_user_id: userId,
        name: form.structure_name,
        type: structureKind,
        address: form.address,
        city: form.city,
        region: form.region || null,
        phone_landline: form.phone_landline,
        phone_mobile: form.phone_mobile || null,
        email: form.email,
        manager_name: form.manager_name,
        logo_url: logoUrl,
        description: form.description || null,
        verified: false,
      });
    } else {
      // Update profile photo + speciality
      await supabase.from("profiles").update({
        professional_photo_url: photoUrl,
        speciality: form.speciality || null,
        professional_address: form.professional_address || null,
        full_name: fullName,
        phone: form.phone,
        city: form.city,
      }).eq("id", userId);
    }

    setSubmitting(false);
    clearDraft();
    toast({
      title: "Compte créé et dossier transmis",
      description: "Vous pouvez vous reconnecter pendant l’étude de votre demande.",
    });
    navigate("/dashboard");
  };

  const inputCls = "w-full bg-transparent border-0 outline-none text-ink text-[15px] placeholder:text-ink-4";

  if (resolvingResume) {
    return (
      <AuthShell backTo="/auth" backLabel="Espace patient">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" strokeWidth={2.4} />
          <p className="mt-4 text-[14px] text-ink-3">Reprise de votre inscription…</p>
        </div>
      </AuthShell>
    );
  }

  if (awaitingConfirmation) {
    return (
      <AuthShell backTo="/auth" backLabel="Espace patient">
        <AwaitConfirmation
          email={form.email}
          submitting={submitting}
          onRetry={retryAfterConfirmation}
          onResend={resendConfirmation}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell backTo="/auth" backLabel="Espace patient">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => (current - 1) as 0 | 1 | 2)}
            className="mb-5 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-3 hover:text-ink tap"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.3} />
            Étape précédente
          </button>
        ) : null}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 border-b border-hairline pb-6"
        >
          <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-primary mb-3">Professionnels et structures</p>
          <h1 className="font-display text-3xl sm:text-4xl leading-[1.04] text-ink text-balance">
            {step === 0 && <>Choisissez votre activité.</>}
            {step === 1 && <>Renseignez vos informations.</>}
            {step === 2 && <>Ajoutez vos justificatifs.</>}
          </h1>
          <p className="text-[14.5px] text-ink-3 mt-3 max-w-xl leading-relaxed">
            {step === 0 && "Choisissez votre profil — vérification sous 48 h ouvrées."}
            {step === 1 && "Renseignez vos coordonnées professionnelles."}
            {step === 2 && "CV, CNI, diplômes — chiffrés et confidentiels."}
          </p>
        </motion.div>

        {/* Stepper */}
        <div className="flex items-center gap-2.5 mb-8 max-w-md mx-auto">
          <Step n={1} active={step === 0} done={step > 0} label="Profil" />
          <span className={cn("flex-1 h-0.5 transition-colors", step > 0 ? "bg-primary" : "bg-hairline")} />
          <Step n={2} active={step === 1} done={step > 1} label="Détails" />
          <span className={cn("flex-1 h-0.5 transition-colors", step > 1 ? "bg-primary" : "bg-hairline")} />
          <Step n={3} active={step === 2} done={false} label="Documents" />
        </div>

        <AnimatePresence mode="wait">
          {/* ============ STEP 0: TYPE SELECTION ============ */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }} className="space-y-6">
              <section>
                <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-3 px-1">Professionnel de santé</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PROVIDER_TYPES.map((t) => {
                    const active = type === t.id;
                    const Icon = t.icon;
                    return (
                      <button key={t.id} onClick={() => setType(t.id)}
                        className={cn(
                          "relative squircle-lg p-3.5 text-left tap transition-all duration-300 ease-spring",
                          active ? "bg-ink text-white shadow-md" : "glass hover:shadow-sm",
                        )}>
                        <Icon className={cn("h-5 w-5 mb-2.5", active ? "text-primary-glow" : "text-primary")} strokeWidth={2.4} />
                        <p className={cn("font-display text-[15px] tracking-headline leading-tight", active ? "text-white" : "text-ink")}>{t.label}</p>
                        <p className={cn("text-[11px] mt-0.5 leading-snug", active ? "text-white/60" : "text-ink-3")}>{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-3 px-1">Structure de santé</p>
                <button onClick={() => setType("structure")}
                  className={cn(
                    "w-full squircle-lg p-4 text-left tap transition-all duration-300 ease-spring flex items-center gap-4",
                    type === "structure" ? "bg-ink text-white shadow-md" : "glass hover:shadow-sm",
                  )}>
                  <div className={cn("size-11 squircle flex items-center justify-center shrink-0", type === "structure" ? "bg-white/15" : "bg-primary-soft")}>
                    <Hospital className={cn("h-5 w-5", type === "structure" ? "text-primary-glow" : "text-primary")} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-display text-[16px] tracking-headline", type === "structure" ? "text-white" : "text-ink")}>Hôpital · Clinique · Pharmacie · Labo</p>
                    <p className={cn("text-[12px] mt-0.5", type === "structure" ? "text-white/60" : "text-ink-3")}>Inscription d'une structure médicale</p>
                  </div>
                  <ArrowRight className={cn("h-4 w-4 shrink-0", type === "structure" ? "text-white" : "text-ink-3")} strokeWidth={2.5} />
                </button>
              </section>

              <button onClick={() => type && setStep(1)} disabled={!type}
                className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-40 disabled:cursor-not-allowed">
                Continuer
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </motion.div>
          )}

          {/* ============ STEP 1: PROFILE FORM ============ */}
          {step === 1 && (
            <motion.form
              key="step1"
              onSubmit={(event) => {
                event.preventDefault();
                void createAccount();
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {!isStructure && selectedProviderMeta && (
                <div className="squircle-lg glass p-4 flex items-center gap-3">
                  <div className="size-10 squircle bg-primary-soft flex items-center justify-center shrink-0">
                    <selectedProviderMeta.icon className="h-5 w-5 text-primary" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-ink">{selectedProviderMeta.label}</p>
                    <p className="text-[12px] text-ink-3">{selectedProviderMeta.desc}</p>
                  </div>
                  <button type="button" onClick={() => setStep(0)} className="text-[12px] font-medium text-primary hover:underline">Modifier</button>
                </div>
              )}

              {/* PROVIDER */}
              {!isStructure && (
                <>
                  <Card title="Identité">
                    <Row cols={2}>
                      <FieldBox label="Prénom *"><input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} className={inputCls} /></FieldBox>
                      <FieldBox label="Nom *"><input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} className={inputCls} /></FieldBox>
                    </Row>
                    <Row cols={2}>
                      <FieldBox label="Email *"><input type="email" inputMode="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputCls} placeholder="nom@email.sn" /></FieldBox>
                      <FieldBox label="Mot de passe *"><input type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className={inputCls} placeholder="Aa1@ · 8 min." /></FieldBox>
                    </Row>
                    <p className="px-1 text-[11.5px] leading-relaxed text-ink-3">Majuscule, minuscule, chiffre et caractère spécial requis.</p>
                    <Row cols={2}>
                      <FieldBox label="Téléphone *"><input inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputCls} placeholder="+221 …" /></FieldBox>
                      <FieldBox label="Ville *"><input value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} placeholder="Dakar" /></FieldBox>
                    </Row>
                  </Card>

                  <Card title="Activité professionnelle">
                    <Row><FieldBox label="Adresse professionnelle *"><input value={form.professional_address} onChange={(e) => update("professional_address", e.target.value)} className={inputCls} placeholder="Cabinet, hôpital, lieu d'exercice" /></FieldBox></Row>
                    <Row cols={2}>
                      <FieldBox label={`N° d'ordre ${type === "doctor" || type === "dentist" || type === "pharmacist" || type === "midwife" ? "*" : ""}`}>
                        <input value={form.order_number} onChange={(e) => update("order_number", e.target.value)} className={inputCls} />
                      </FieldBox>
                      <FieldBox label="Année de diplôme"><input type="number" inputMode="numeric" value={form.diploma_year} onChange={(e) => update("diploma_year", e.target.value)} className={inputCls} placeholder="2018" /></FieldBox>
                    </Row>
                    <Row>
                      <div>
                        <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3 mb-1.5 px-1">Spécialités / domaines</p>
                        <SearchableMultiSelect
                          groups={SPECIALTIES}
                          value={specialties}
                          onChange={setSpecialties}
                          placeholder="Rechercher une spécialité…"
                          multiple
                          allowOther
                        />
                      </div>
                    </Row>
                  </Card>

                  {type && !isStructure && (
                    <RoleSpecificFields
                      type={type as any}
                      value={roleSpecific}
                      onChange={setRoleSpecific}
                      yearsExperience={yearsExperience}
                      onYearsChange={setYearsExperience}
                      languages={languages}
                      onLanguagesChange={setLanguages}
                      primaryLanguage={primaryLanguage}
                      onPrimaryLanguageChange={setPrimaryLanguage}
                      services={services}
                      onServicesChange={setServices}
                      days={days}
                      onDaysChange={setDays}
                      timeSlots={timeSlots}
                      onTimeSlotsChange={setTimeSlots}
                      structureRole={structureRole}
                      onStructureRoleChange={setStructureRole}
                    />
                  )}
                </>
              )}

              {/* STRUCTURE */}
              {isStructure && (
                <>
                  <Card title="Type de structure">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {STRUCTURE_TYPES.map((s) => {
                        const active = structureKind === s.id;
                        return (
                          <button key={s.id} type="button" onClick={() => setStructureKind(s.id)}
                            className={cn(
                              "squircle p-3 text-[13px] font-medium tap transition-all",
                              active ? "bg-ink text-white shadow-sm" : "bg-surface-1 text-ink-2 hover:bg-surface-2"
                            )}>
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  <Card title="Structure">
                    <Row><FieldBox label="Nom de la structure *"><input value={form.structure_name} onChange={(e) => update("structure_name", e.target.value)} className={inputCls} placeholder="Clinique de la Madeleine" /></FieldBox></Row>
                    <Row cols={2}>
                      <FieldBox label="Email pro *"><input type="email" inputMode="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputCls} /></FieldBox>
                      <FieldBox label="Mot de passe *"><input type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className={inputCls} placeholder="Aa1@ · 8 min." /></FieldBox>
                    </Row>
                    <p className="px-1 text-[11.5px] leading-relaxed text-ink-3">Majuscule, minuscule, chiffre et caractère spécial requis.</p>
                    <Row><FieldBox label="Nom du responsable *"><input value={form.manager_name} onChange={(e) => update("manager_name", e.target.value)} className={inputCls} /></FieldBox></Row>
                  </Card>

                  <Card title="Coordonnées & adresse">
                    <Row cols={2}>
                      <FieldBox label="Téléphone fixe *"><input inputMode="tel" value={form.phone_landline} onChange={(e) => update("phone_landline", e.target.value)} className={inputCls} placeholder="+221 33 …" /></FieldBox>
                      <FieldBox label="Téléphone mobile"><input inputMode="tel" value={form.phone_mobile} onChange={(e) => update("phone_mobile", e.target.value)} className={inputCls} placeholder="+221 77 …" /></FieldBox>
                    </Row>
                    <Row><FieldBox label="Adresse complète *"><input value={form.address} onChange={(e) => update("address", e.target.value)} className={inputCls} placeholder="Numéro, rue, quartier" /></FieldBox></Row>
                    <Row cols={2}>
                      <FieldBox label="Ville *"><input value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} placeholder="Dakar" /></FieldBox>
                      <FieldBox label="Région *">
                        <select value={form.region} onChange={(e) => update("region", e.target.value)} className={inputCls}>
                          <option value="">Sélectionner une région…</option>
                          {REGIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </FieldBox>
                    </Row>
                    <Row cols={2}>
                      <FieldBox label="RCCM"><input value={form.rccm} onChange={(e) => update("rccm", e.target.value)} className={inputCls} /></FieldBox>
                      <FieldBox label="N° agrément ministériel"><input value={form.ministry_approval} onChange={(e) => update("ministry_approval", e.target.value)} className={inputCls} /></FieldBox>
                    </Row>
                  </Card>
                </>
              )}

              <button type="submit" disabled={submitting}
                className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-50">
                {submitting ? "Création…" : "Continuer vers les documents"}
                {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
              </button>
            </motion.form>
          )}

          {/* ============ STEP 2: DOCUMENTS ============ */}
          {step === 2 && userId && (
            <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }} className="space-y-4">
              <div className="squircle-lg glass p-4 flex gap-3">
                <div className="size-9 squircle bg-primary-soft flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-primary" strokeWidth={2.6} />
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">Documents chiffrés</p>
                  <p className="text-[12.5px] text-ink-3 mt-0.5">Tous formats acceptés — 20 Mo maximum par fichier.</p>
                </div>
              </div>

              {/* Photo / Logo */}
              <Card title={isStructure ? "Logo de la structure" : "Photo de profil"}>
                {isStructure ? (
                  <PhotoUpload
                    label="Logo (optionnel)"
                    userId={userId}
                    field="logo"
                    value={logoUrl}
                    onChange={setLogoUrl}
                    shape="square"
                  />
                ) : (
                  <PhotoUpload
                    label="Photo professionnelle"
                    required
                    userId={userId}
                    field="photo"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    shape="circle"
                  />
                )}
              </Card>

              {/* Documents */}
              {!isStructure ? (
                <Card title="Pièces justificatives">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <DocumentUpload label="Carte Nationale d'Identité (CNI)" required userId={userId} field="cni"
                      value={docs.document_cni_url} onChange={updateDoc("document_cni_url")} />
                    <DocumentUpload label="Curriculum Vitae (CV)" required userId={userId} field="cv"
                      value={docs.document_cv_url} onChange={updateDoc("document_cv_url")} />
                    <DocumentUpload label="Diplôme" required userId={userId} field="diploma"
                      value={docs.document_diploma_url} onChange={updateDoc("document_diploma_url")} />
                    {(type === "doctor" || type === "dentist" || type === "pharmacist" || type === "midwife") && (
                      <DocumentUpload label="Carte d'ordre" required userId={userId} field="order"
                        value={docs.document_order_url} onChange={updateDoc("document_order_url")} />
                    )}
                  </div>
                </Card>
              ) : (
                <Card title="Documents légaux">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <DocumentUpload label="Registre de commerce / Agrément" required userId={userId} field="legal"
                      value={docs.document_legal_url} onChange={updateDoc("document_legal_url")} />
                    <DocumentUpload label="Autorisation ministérielle" userId={userId} field="approval"
                      value={docs.document_approval_url} onChange={updateDoc("document_approval_url")} />
                    <DocumentUpload label="RCCM" userId={userId} field="rccm"
                      value={docs.document_rccm_url} onChange={updateDoc("document_rccm_url")} />
                    <DocumentUpload label="CNI du responsable" userId={userId} field="manager-cni"
                      value={docs.document_cni_url} onChange={updateDoc("document_cni_url")} />
                  </div>
                </Card>
              )}

              <p className="text-[12.5px] text-ink-3 text-center px-4">
                Validation : 48 h ouvrées · vous serez notifié à <span className="text-ink font-medium">{form.email}</span>
              </p>

              <button onClick={submitApplication} disabled={submitting}
                className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-50">
                {submitting ? "Envoi…" : "Envoyer la demande"}
                {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
    </AuthShell>
  );
};

const Step = ({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className={cn("size-7 rounded-full flex items-center justify-center text-[11.5px] font-semibold transition-all",
      done ? "bg-primary text-white" : active ? "bg-ink text-white shadow-md" : "bg-surface-2 text-ink-3")}>
      {done ? <Check className="h-3 w-3" strokeWidth={2.8} /> : n}
    </span>
    <span className={cn("text-[12px] font-medium transition-colors hidden sm:inline", active || done ? "text-ink" : "text-ink-3")}>{label}</span>
  </div>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-[1rem] border border-hairline bg-surface-0 shadow-xs p-4 md:p-6">
    <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-3 md:mb-4">{title}</p>
    <div className="space-y-2.5 md:space-y-3">{children}</div>
  </section>
);

const Row = ({ children, cols = 1 }: { children: React.ReactNode; cols?: 1 | 2 }) => (
  <div className={cn("grid gap-2.5 md:gap-3", cols === 2 && "grid-cols-2")}>{children}</div>
);

const FieldBox = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block min-w-0 squircle-lg bg-surface-1/70 hover:bg-surface-1 transition-colors px-3 py-2 md:px-4 md:py-2.5 border border-hairline focus-within:border-primary/40 focus-within:bg-surface-0 focus-within:shadow-sm">
    <p className="text-[9.5px] sm:text-[10.5px] font-mono uppercase tracking-[0.08em] sm:tracking-widest text-ink-3 mb-0.5">{label}</p>
    {children}
  </label>
);

const AwaitConfirmation = ({
  email,
  submitting,
  onRetry,
  onResend,
}: {
  email: string;
  submitting: boolean;
  onRetry: () => void;
  onResend: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="max-w-md mx-auto text-center py-8"
  >
    <div className="size-14 squircle bg-primary-soft flex items-center justify-center mx-auto mb-6">
      <MailCheck className="h-7 w-7 text-primary" strokeWidth={2.2} />
    </div>
    <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-primary mb-3">Compte créé</p>
    <h1 className="font-display text-2xl sm:text-3xl leading-[1.08] text-ink text-balance">
      Confirmez votre email pour continuer.
    </h1>
    <p className="text-[14.5px] text-ink-3 mt-3 leading-relaxed">
      Nous avons envoyé un lien de confirmation à{" "}
      <span className="text-ink font-medium">{email}</span>. Ouvrez-le, puis revenez ici :
      vous reprendrez directement au téléversement de vos documents, sans ressaisir vos informations.
    </p>

    <button
      onClick={onRetry}
      disabled={submitting}
      className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-7 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-50"
    >
      {submitting ? "Vérification…" : "J'ai confirmé mon email"}
      {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
    </button>

    <button
      onClick={onResend}
      disabled={submitting}
      className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-3 hover:text-ink tap disabled:opacity-50"
    >
      <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} />
      Renvoyer l'email de confirmation
    </button>

    <p className="text-[12px] text-ink-4 mt-6 leading-relaxed">
      Pensez à vérifier vos courriers indésirables. Le lien reste valable plusieurs heures.
    </p>
  </motion.div>
);

export default ProviderSignup;
