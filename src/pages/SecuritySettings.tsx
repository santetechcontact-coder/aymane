import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, LockKeyhole, LogOut, QrCode, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TotpFactor = {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
};

type Enrollment = {
  id: string;
  qrCode: string;
  secret: string;
};

const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const SecuritySettings = () => {
  const { user } = useAuth();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [aal, setAal] = useState<"aal1" | "aal2" | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const [factorResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    setFactors((factorResult.data?.totp ?? []) as TotpFactor[]);
    setAal((assuranceResult.data?.currentLevel as "aal1" | "aal2" | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Sécurité du compte - AYMANE";
    void load();
  }, [user]);

  const verifiedFactor = useMemo(() => factors.find((factor) => factor.status === "verified") ?? null, [factors]);

  const beginEnrollment = async () => {
    setWorking(true);
    for (const factor of factors.filter((item) => item.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "AYMANE",
      issuer: "AYMANE Santé",
    });
    setWorking(false);
    if (error || !data || data.type !== "totp") {
      toast({ title: "Activation non démarrée", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    const rawQr = data.totp.qr_code;
    setEnrollment({
      id: data.id,
      qrCode: rawQr.startsWith("data:") ? rawQr : `data:image/svg+xml;utf-8,${encodeURIComponent(rawQr)}`,
      secret: data.totp.secret,
    });
    setCode("");
  };

  const verifyFactor = async () => {
    const factorId = enrollment?.id ?? verifiedFactor?.id;
    if (!factorId || !/^\d{6}$/.test(code)) {
      toast({ title: "Code incomplet", description: "Saisissez les 6 chiffres de votre application.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setWorking(false);
    if (error) {
      toast({ title: "Code non reconnu", description: "Attendez le prochain code puis réessayez.", variant: "destructive" });
      return;
    }
    setEnrollment(null);
    setCode("");
    toast({ title: "Double vérification active", description: "Cette session peut maintenant valider les opérations sensibles." });
    await load();
  };

  const removeFactor = async () => {
    if (!verifiedFactor) return;
    if (aal !== "aal2") {
      toast({ title: "Confirmation nécessaire", description: "Saisissez d'abord un code valide pour confirmer cette session.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    setWorking(false);
    if (error) {
      toast({ title: "Protection non retirée", description: "Reconnectez-vous puis réessayez.", variant: "destructive" });
      return;
    }
    toast({ title: "Double vérification retirée" });
    await load();
  };

  const updatePassword = async () => {
    if (passwords.password.length < 12 || passwords.password !== passwords.confirm) {
      toast({ title: "Mot de passe à revoir", description: "Utilisez au moins 12 caractères et confirmez exactement le même mot de passe.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.password });
    setWorking(false);
    if (error) {
      toast({ title: "Mot de passe non modifié", description: "Reconnectez-vous puis réessayez.", variant: "destructive" });
      return;
    }
    setPasswords({ password: "", confirm: "" });
    toast({ title: "Mot de passe mis à jour" });
  };

  const closeOtherSessions = async () => {
    setWorking(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setWorking(false);
    if (error) {
      toast({ title: "Sessions non fermées", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    toast({ title: "Autres sessions fermées", description: "Vous restez connecté sur cet appareil." });
  };

  return (
    <DashboardLayout title="Sécurité" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Protection du compte</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Un accès solide, qui reste simple.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Renforcez les actions importantes sans compliquer vos usages quotidiens.
        </p>
      </header>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Vérification de votre protection…</p></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-[0.8rem]", verifiedFactor ? "bg-emerald-100 text-emerald-700" : "bg-primary-soft text-primary")}>
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl text-ink">Double vérification</h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Demandée pour les retraits et les changements sensibles.</p>
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold", verifiedFactor ? "bg-emerald-100 text-emerald-700" : "bg-surface-1 text-ink-3")}>
                {verifiedFactor ? "Active" : "Inactive"}
              </span>
            </div>

            {!verifiedFactor && !enrollment && (
              <button type="button" disabled={working} onClick={() => void beginEnrollment()} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                <QrCode className="h-4 w-4" /> Activer avec une application
              </button>
            )}

            {enrollment && (
              <div className="mt-6 rounded-[0.95rem] bg-surface-1 p-4">
                <div className="grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
                  <img src={enrollment.qrCode} alt="QR code de double vérification" className="mx-auto aspect-square w-40 rounded-[0.75rem] bg-white p-2" />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Scannez avec Google Authenticator, Microsoft Authenticator ou 2FAS.</p>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">Puis saisissez le code à 6 chiffres affiché dans l'application.</p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] font-semibold text-primary">Saisie manuelle</summary>
                      <code className="mt-2 block break-all rounded-[0.65rem] bg-surface-0 p-2 text-[10.5px] text-ink-2">{enrollment.secret}</code>
                    </details>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <input aria-label="Code de vérification" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${inputClass} flex-1 text-center font-mono text-lg tracking-[0.2em]`} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                  <button type="button" disabled={working} onClick={() => void verifyFactor()} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-50" aria-label="Valider le code"><Check className="h-4 w-4" /></button>
                </div>
              </div>
            )}

            {verifiedFactor && (
              <div className="mt-6 space-y-3">
                {aal === "aal1" && (
                  <div className="rounded-[0.85rem] bg-primary-soft p-3">
                    <p className="text-[12px] font-semibold text-primary">Confirmez cette session</p>
                    <p className="mt-1 text-[11px] text-ink-3">Saisissez un code actuel avant un retrait ou une modification de sécurité.</p>
                    <div className="mt-3 flex gap-2">
                      <input aria-label="Code de confirmation" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${inputClass} flex-1 text-center font-mono text-lg tracking-[0.2em]`} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                      <button type="button" disabled={working} onClick={() => void verifyFactor()} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white" aria-label="Confirmer la session"><Check className="h-4 w-4" /></button>
                    </div>
                  </div>
                )}
                {aal === "aal2" && (
                  <div className="flex items-center gap-3 rounded-[0.85rem] bg-emerald-50 p-3 text-emerald-800">
                    <Check className="h-4 w-4" />
                    <p className="text-[12px] font-semibold">Cette session est confirmée.</p>
                  </div>
                )}
                <button type="button" disabled={working} onClick={() => void removeFactor()} className="flex h-10 items-center gap-2 text-[11.5px] font-semibold text-accent disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Retirer la double vérification
                </button>
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-[0.75rem] bg-secondary-soft text-secondary"><KeyRound className="h-4 w-4" /></span>
                <div>
                  <h2 className="font-display text-xl text-ink">Mot de passe</h2>
                  <p className="text-[11.5px] text-ink-3">{user?.email}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Field label="Nouveau mot de passe"><input type="password" autoComplete="new-password" className={inputClass} value={passwords.password} onChange={(event) => setPasswords({ ...passwords, password: event.target.value })} placeholder="12 caractères minimum" /></Field>
                <Field label="Confirmer"><input type="password" autoComplete="new-password" className={inputClass} value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} /></Field>
                <button type="button" disabled={working} onClick={() => void updatePassword()} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                  <LockKeyhole className="h-4 w-4" /> Changer le mot de passe
                </button>
              </div>
            </section>

            <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-[0.75rem] bg-surface-1 text-ink-2"><Smartphone className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl text-ink">Appareils connectés</h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">Gardez uniquement les accès que vous reconnaissez.</p>
                </div>
              </div>
              <button type="button" disabled={working} onClick={() => void closeOtherSessions()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-hairline px-4 text-[12.5px] font-semibold text-ink-2 disabled:opacity-50">
                <LogOut className="h-4 w-4" /> Fermer les autres sessions
              </button>
            </section>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</span>
    {children}
  </label>
);

export default SecuritySettings;
