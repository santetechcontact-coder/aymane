import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, ArrowLeft, ArrowRight, Mail, Lock, User, Stethoscope,
  Calendar as CalendarIcon, Phone, MapPin, Home, Check, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/AuthShell";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, REGIONS, CITIES_BY_REGION, GENDERS } from "@/lib/medical-data";
import { friendlyAuthError, syncAccountSession } from "@/lib/account-backend";
import { securePasswordSchema } from "@/lib/auth-validation";

// ============= Schemas =============
const emailRequiredSchema = z.string().trim().email("Email invalide").max(255);
const phoneSchema = z.string().trim().regex(/^[0-9]{6,12}$/, "Numéro invalide (chiffres uniquement)");
const nameSchema = z.string().trim().min(2, "Trop court").max(100);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const from = ((location.state as { from?: { pathname?: string; search?: string } } | null)?.from);
  const returnTo = from?.pathname ? `${from.pathname}${from.search ?? ""}` : "/dashboard";

  useEffect(() => {
    document.title = "Connexion — AYMANE";
    if (user) navigate(returnTo, { replace: true });
  }, [user, navigate, returnTo]);

  return (
    <AuthShell compact>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-6">
            <p className="mb-3 text-[10.5px] font-mono uppercase tracking-[0.14em] text-primary">Espace patient</p>
            <AnimatePresence mode="wait">
              <motion.h1
                key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="font-display text-3xl md:text-4xl text-ink leading-[1.04] text-balance"
              >
                {tab === "signin"
                  ? <>Accédez à votre espace santé.</>
                  : <>Créez votre compte patient.</>}
              </motion.h1>
            </AnimatePresence>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
              {tab === "signin"
                ? "Retrouvez vos rendez-vous, documents et prochaines étapes."
                : "Commencez avec les informations utiles à votre suivi."}
            </p>
          </div>

          <div className="rounded-[1rem] border border-hairline bg-surface-0 shadow-sm p-2">
            <div className="relative flex p-1 bg-surface-1 rounded-[0.75rem] mb-2">
              {(["signin", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative flex-1 h-10 rounded-[0.6rem] text-[13.5px] font-semibold tap z-10 transition-colors",
                    tab === t ? "text-ink" : "text-ink-3"
                  )}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="auth-pill"
                      className="absolute inset-0 rounded-[0.6rem] bg-surface-0 shadow-xs"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative">{t === "signin" ? "Se connecter" : "Créer un compte"}</span>
                </button>
              ))}
            </div>

            <div className="px-4 py-5">
              <AnimatePresence mode="wait">
                {tab === "signin"
                  ? <SignInForm key="signin" onDone={() => navigate(returnTo, { replace: true })} />
                  : <SignUpWizard
                      key="signup"
                      onDone={(requiresConfirmation) => {
                        if (requiresConfirmation) {
                          setTab("signin");
                          return;
                        }
                        navigate("/dashboard/complete-profile");
                      }}
                    />}
              </AnimatePresence>
            </div>
          </div>

          <Link to="/auth/provider"
            className="group mt-4 flex items-center justify-between gap-4 rounded-[0.9rem] border border-hairline bg-surface-1 p-4 hover:border-primary/30 transition-colors tap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 squircle bg-primary-soft flex items-center justify-center shrink-0">
                <Stethoscope className="h-4 w-4 text-primary" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-ink">Professionnel ou structure ?</p>
                <p className="text-[12px] text-ink-3 leading-snug">Médecin, infirmier, pharmacien, sage-femme ou labo.</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-ink-3 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" strokeWidth={2.5} />
          </Link>
        </motion.div>
    </AuthShell>
  );
};

const SignInForm = ({ onDone }: { onDone: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailRequiredSchema.parse(email); }
    catch (err: any) { toast({ title: "Erreur", description: err.errors?.[0]?.message, variant: "destructive" }); return; }
    if (!password) { toast({ title: "Mot de passe requis", variant: "destructive" }); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Connexion impossible", description: friendlyAuthError(error), variant: "destructive" });
      return;
    }

    let welcome = "Bienvenue dans votre espace AYMANE.";
    if (data.session) {
      try {
        const result = await syncAccountSession(data.session, "signin");
        if (result.welcomeMessage) welcome = result.welcomeMessage;
      } catch {
        welcome = "Connexion réussie. Votre espace santé est prêt.";
      }
    }
    toast({ title: welcome, description: "Vos informations et vos prochaines actions vous attendent." });
    onDone();
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      onSubmit={submit} className="space-y-3"
    >
      <Field icon={Mail} label="Email">
        <input type="email" inputMode="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@email.com" className={fieldCls} />
      </Field>
      <Field icon={Lock} label="Mot de passe" right={
        <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-ink-3 hover:text-ink tap p-1">
          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }>
        <input type={showPwd ? "text" : "password"} autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••" className={fieldCls} />
      </Field>
      <div className="flex justify-end -mt-1">
        <Link to="/forgot-password" className="text-[12.5px] font-medium text-ink-3 hover:text-primary transition-colors">
          Mot de passe oublié ?
        </Link>
      </div>
      <button type="submit" disabled={loading}
        className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-50">
        {loading ? "Connexion…" : "Se connecter"}
        {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
      </button>
    </motion.form>
  );
};

type SignupData = {
  firstName: string; lastName: string;
  dob?: Date;
  gender: string;
  country: string; region: string; city: string; address: string;
  dial: string; phone: string;
  email: string;
  password: string; confirm: string;
};

const SignUpWizard = ({ onDone }: { onDone: (requiresConfirmation: boolean) => void }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [d, setD] = useState<SignupData>({
    firstName: "", lastName: "", dob: undefined, gender: "",
    country: "SN", region: "", city: "", address: "",
    dial: "+221", phone: "", email: "",
    password: "", confirm: "",
  });
  const set = (patch: Partial<SignupData>) => setD((p) => ({ ...p, ...patch }));

  const age = useMemo(() => {
    if (!d.dob) return null;
    const diff = Date.now() - d.dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }, [d.dob]);

  const cities = useMemo(() => (d.country === "SN" ? CITIES_BY_REGION[d.region] ?? [] : []), [d.country, d.region]);

  const validateStep = (): string | null => {
    if (step === 0) {
      try { nameSchema.parse(d.firstName); } catch (e: any) { return "Prénom : " + e.errors[0].message; }
      try { nameSchema.parse(d.lastName); } catch (e: any) { return "Nom : " + e.errors[0].message; }
      if (!d.dob) return "Date de naissance requise";
      if (d.dob > new Date()) return "Date invalide";
      if ((age ?? 0) < 0 || (age ?? 0) > 120) return "Date invalide";
      if (!d.gender) return "Sexe requis";
    }
    if (step === 1) {
      if (!d.country) return "Pays requis";
      if (d.country === "SN" && !d.region) return "Région requise";
      if (!d.city) return "Ville requise";
      if (!d.address.trim() || d.address.trim().length < 5) return "Adresse requise";
    }
    if (step === 2) {
      try { phoneSchema.parse(d.phone); } catch (e: any) { return e.errors[0].message; }
      try { emailRequiredSchema.parse(d.email); } catch (e: any) { return e.errors[0].message; }
    }
    if (step === 3) {
      try { securePasswordSchema.parse(d.password); } catch (e: any) { return e.errors[0].message; }
      if (d.password !== d.confirm) return "Les mots de passe ne correspondent pas";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { toast({ title: "Vérifiez", description: err, variant: "destructive" }); return; }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { toast({ title: "Vérifiez", description: err, variant: "destructive" }); return; }

    const fullPhone = `${d.dial}${d.phone}`;
    const emailForAuth = d.email.trim().toLowerCase();

    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: emailForAuth,
      password: d.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/complete-profile`,
        data: {
          full_name: `${d.firstName} ${d.lastName}`.trim(),
          phone: fullPhone,
          city: d.city,
          region: d.country === "SN" ? d.region : null,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Inscription impossible", description: friendlyAuthError(error), variant: "destructive" });
      return;
    }

    const userId = signUpData.user?.id;
    let activeSession = signUpData.session;
    if (userId) {
      if (!activeSession) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: emailForAuth,
          password: d.password,
        });
        activeSession = signInData.session;
      }

      if (activeSession) {
        await supabase.from("profiles").update({
          full_name: `${d.firstName} ${d.lastName}`.trim(),
          phone: fullPhone,
          gender: d.gender,
          date_of_birth: format(d.dob!, "yyyy-MM-dd"),
          city: d.city,
          region: d.country === "SN" ? d.region : null,
          address: d.address,
        }).eq("id", userId);
        await syncAccountSession(activeSession, "signup").catch(() => null);
      }
    }
    setLoading(false);

    if (!activeSession) {
      toast({
        title: "Compte créé",
        description: "Consultez votre email pour confirmer le compte, puis connectez-vous.",
      });
      onDone(true);
      return;
    }

    toast({ title: "Bienvenue chez AYMANE", description: "Votre compte est enregistré. Complétez maintenant votre profil médical." });
    onDone(false);
  };

  const steps = ["Identité", "Localisation", "Contact", "Sécurité"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
      className="space-y-4"
    >
      {/* Stepper */}
      <div className="flex items-center gap-1.5 px-1">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1.5">
            <div className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-surface-2",
            )} />
          </div>
        ))}
      </div>
      <p className="text-[12px] font-mono uppercase tracking-widest text-ink-3 px-1">
        Étape {step + 1}/4 — {steps[step]}
      </p>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" {...stepAnim} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field icon={User} label="Prénom *">
                <input required value={d.firstName} onChange={(e) => set({ firstName: e.target.value })}
                  placeholder="Aïssatou" className={fieldCls} />
              </Field>
              <Field icon={User} label="Nom *">
                <input required value={d.lastName} onChange={(e) => set({ lastName: e.target.value })}
                  placeholder="Diallo" className={fieldCls} />
              </Field>
            </div>

            <Field icon={CalendarIcon} label="Date de naissance *" right={age !== null ? <span className="text-[11px] font-medium text-ink-3">{age} ans</span> : undefined}>
              <input
                type="date"
                required
                min="1900-01-01"
                max={format(new Date(), "yyyy-MM-dd")}
                value={d.dob ? format(d.dob, "yyyy-MM-dd") : ""}
                onChange={(e) => set({ dob: e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined })}
                className={fieldCls}
              />
            </Field>

            <SelectField icon={User} label="Sexe *" value={d.gender} onChange={(v) => set({ gender: v })}
              placeholder="Choisir…" options={GENDERS} />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" {...stepAnim} className="space-y-3">
            <SelectField icon={MapPin} label="Pays *" value={d.country}
              onChange={(v) => { const dial = COUNTRIES.find(c => c.value === v)?.dial ?? "+221"; set({ country: v, dial, region: "", city: "" }); }}
              placeholder="Sélectionner" options={COUNTRIES} />
            {d.country === "SN" && (
              <SelectField icon={MapPin} label="Région *" value={d.region}
                onChange={(v) => set({ region: v, city: "" })}
                placeholder="Sélectionner" options={REGIONS} />
            )}
            {d.country === "SN" && cities.length > 0 ? (
              <SelectField icon={MapPin} label="Ville *" value={d.city}
                onChange={(v) => set({ city: v })}
                placeholder="Sélectionner" options={cities.map((c) => ({ value: c, label: c }))} />
            ) : (
              <Field icon={MapPin} label="Ville *">
                <input value={d.city} onChange={(e) => set({ city: e.target.value })}
                  placeholder="Ville" className={fieldCls} />
              </Field>
            )}
            <Field icon={Home} label="Adresse domicile *">
              <input value={d.address} onChange={(e) => set({ address: e.target.value })}
                placeholder="Quartier, rue, repère…" className={fieldCls} autoComplete="street-address" />
            </Field>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" {...stepAnim} className="space-y-3">
            <Field icon={Phone} label="Téléphone *" right={
              <span className="text-[12px] font-medium text-ink-3 px-1.5 py-0.5 rounded bg-surface-2">{d.dial}</span>
            }>
              <input type="tel" inputMode="numeric" autoComplete="tel-national" required
                value={d.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, "") })}
                placeholder="77 123 45 67" className={fieldCls} />
            </Field>

            <div className="flex items-start gap-2.5 px-3 py-2.5 squircle-lg bg-primary-soft/80 text-primary text-[12.5px] leading-relaxed">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />
              <span>L'email sert à sécuriser l'accès. Le téléphone reste utile pour les rendez-vous et les suivis terrain.</span>
            </div>

            <Field icon={Mail} label="Email *">
              <input type="email" inputMode="email" autoComplete="email"
                value={d.email} onChange={(e) => set({ email: e.target.value })}
                placeholder="vous@email.com" className={fieldCls} />
            </Field>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" {...stepAnim} className="space-y-3">
            <Field icon={Lock} label="Mot de passe *" right={
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-ink-3 hover:text-ink tap p-1">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }>
              <input type={showPwd ? "text" : "password"} autoComplete="new-password" required
                value={d.password} onChange={(e) => set({ password: e.target.value })}
                placeholder="8+ caractères, Aa1@" className={fieldCls} />
            </Field>
            <Field icon={Lock} label="Confirmer *">
              <input type={showPwd ? "text" : "password"} autoComplete="new-password" required
                value={d.confirm} onChange={(e) => set({ confirm: e.target.value })}
                placeholder="Retapez le mot de passe" className={fieldCls} />
            </Field>
            <PasswordHints pwd={d.password} confirm={d.confirm} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)}
            className="btn-pill h-12 px-5 bg-surface-1 text-ink text-[14px] font-semibold tap">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        )}
        {step < 3 ? (
          <button type="button" onClick={next}
            className="btn-pill flex-1 h-12 bg-ink text-white text-[15px] font-semibold tap shadow-md">
            Continuer <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={loading}
            className="btn-pill flex-1 h-12 bg-ink text-white text-[15px] font-semibold tap shadow-md disabled:opacity-50">
            {loading ? "Création…" : "Créer mon compte"}
            {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        )}
      </div>

      <p className="text-[11.5px] text-ink-3 text-center leading-relaxed">
        En continuant, vous acceptez nos <Link to="/cgu" className="font-semibold text-ink-2 hover:text-primary">CGU</Link> et notre{" "}
        <Link to="/confidentialite" className="font-semibold text-ink-2 hover:text-primary">politique de confidentialité</Link>.
      </p>
    </motion.div>
  );
};

const stepAnim = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

// ============= UI helpers =============
const fieldCls = "w-full bg-transparent border-0 outline-none text-ink text-[16px] placeholder:text-ink-4";

const Field = ({ icon: Icon, label, right, children }: { icon: any; label: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <label className="block squircle-lg bg-surface-1/70 hover:bg-surface-1 transition-colors px-4 py-2.5 border border-hairline focus-within:border-primary/40 focus-within:bg-surface-0 focus-within:shadow-sm text-left">
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-ink-3 shrink-0" strokeWidth={2.4} />
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3">{label}</p>
        {children}
      </div>
      {right}
    </div>
  </label>
);

const SelectField = ({
  icon: Icon, label, value, onChange, placeholder, options,
}: {
  icon: any; label: string; value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
}) => (
  <div className="squircle-lg bg-surface-1/70 hover:bg-surface-1 transition-colors px-4 py-2.5 border border-hairline focus-within:border-primary/40">
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-ink-3 shrink-0" strokeWidth={2.4} />
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3">{label}</p>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-[16px] focus:ring-0 shadow-none">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

const PasswordHints = ({ pwd, confirm }: { pwd: string; confirm: string }) => {
  const checks = [
    { ok: pwd.length >= 8, label: "8+ caractères" },
    { ok: /[A-Z]/.test(pwd), label: "Majuscule" },
    { ok: /[a-z]/.test(pwd), label: "Minuscule" },
    { ok: /[0-9]/.test(pwd), label: "Chiffre" },
    { ok: /[^A-Za-z0-9]/.test(pwd), label: "Caractère spécial" },
    { ok: pwd.length > 0 && pwd === confirm, label: "Identiques" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 px-1 pt-1">
      {checks.map((c) => (
        <div key={c.label} className={cn(
          "flex items-center gap-1.5 text-[11.5px] transition-colors",
          c.ok ? "text-emerald-600" : "text-ink-3",
        )}>
          <Check className={cn("h-3 w-3", !c.ok && "opacity-30")} strokeWidth={3} />
          {c.label}
        </div>
      ))}
    </div>
  );
};

export default Auth;
