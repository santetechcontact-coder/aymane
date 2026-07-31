import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Lock, KeyRound, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/AuthShell";

const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(72)
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/[0-9]/, "Au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial");

const checks = [
  { test: (v: string) => v.length >= 8, label: "8 caractères min." },
  { test: (v: string) => /[A-Z]/.test(v), label: "Une majuscule" },
  { test: (v: string) => /[a-z]/.test(v), label: "Une minuscule" },
  { test: (v: string) => /[0-9]/.test(v), label: "Un chiffre" },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: "Un caractère spécial" },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Nouveau mot de passe — AYMANE";
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setValidSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      else setTimeout(() => setValidSession((v) => v ?? false), 800);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { passwordSchema.parse(pwd); }
    catch (err: any) {
      toast({ title: "Mot de passe trop faible", description: err.errors?.[0]?.message, variant: "destructive" });
      return;
    }
    if (pwd !== confirm) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) {
      toast({ title: "Échec", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Mot de passe mis à jour" });
    setTimeout(() => navigate("/dashboard", { replace: true }), 1400);
  };

  return (
    <AuthShell compact backTo="/auth" backLabel="Connexion">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-6">
            <div className="inline-flex size-11 rounded-[0.75rem] bg-primary-soft items-center justify-center mb-4">
              <KeyRound className="h-7 w-7 text-primary" strokeWidth={2.4} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-[1.04] text-balance">
              Nouveau mot de passe
            </h1>
            <p className="mt-3 text-[14.5px] text-ink-3 max-w-sm">
              Choisissez un mot de passe robuste pour protéger votre dossier médical.
            </p>
          </div>

          <div className="rounded-[1rem] border border-hairline bg-surface-0 shadow-sm p-5">
            <AnimatePresence mode="wait">
              {validSession === false ? (
                <motion.div key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  <p className="text-[14px] text-ink-2 mb-4">
                    Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.
                  </p>
                  <Link to="/forgot-password" className="btn-pill px-6 h-11 bg-ink text-white text-[14px] font-semibold">
                    Renvoyer un lien
                  </Link>
                </motion.div>
              ) : done ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                  <div className="inline-flex size-16 squircle-xl bg-success-soft items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-success" strokeWidth={2.4} />
                  </div>
                  <h2 className="font-display text-xl text-ink mb-2">Mot de passe modifié</h2>
                  <p className="text-[14px] text-ink-3">Redirection vers votre espace…</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onSubmit={submit} className="space-y-3"
                >
                  <label className="block">
                    <span className="text-[12px] font-medium text-ink-3 px-1">Nouveau mot de passe</span>
                    <div className="mt-1.5 flex items-center gap-2 px-4 h-12 squircle-lg bg-surface-1/80 border border-hairline focus-within:border-primary/40 focus-within:bg-surface-0 transition-colors">
                      <Lock className="h-4 w-4 text-ink-3 shrink-0" />
                      <input
                        type={show ? "text" : "password"} required autoFocus
                        value={pwd} onChange={(e) => setPwd(e.target.value)}
                        placeholder="••••••••"
                        className="flex-1 bg-transparent border-0 outline-none text-[16px] text-ink placeholder:text-ink-4"
                      />
                      <button type="button" onClick={() => setShow(!show)} className="text-ink-3 hover:text-ink tap p-1">
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[12px] font-medium text-ink-3 px-1">Confirmer</span>
                    <div className="mt-1.5 flex items-center gap-2 px-4 h-12 squircle-lg bg-surface-1/80 border border-hairline focus-within:border-primary/40 focus-within:bg-surface-0 transition-colors">
                      <Lock className="h-4 w-4 text-ink-3 shrink-0" />
                      <input
                        type={show ? "text" : "password"} required
                        value={confirm} onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="flex-1 bg-transparent border-0 outline-none text-[16px] text-ink placeholder:text-ink-4"
                      />
                    </div>
                  </label>

                  <ul className="grid grid-cols-2 gap-1.5 pt-2">
                    {checks.map((c) => {
                      const ok = c.test(pwd);
                      return (
                        <li key={c.label} className={cn(
                          "flex items-center gap-1.5 text-[12px] transition-colors",
                          ok ? "text-success" : "text-ink-4"
                        )}>
                          <Check className={cn("h-3.5 w-3.5", !ok && "opacity-30")} strokeWidth={3} />
                          {c.label}
                        </li>
                      );
                    })}
                  </ul>

                  <button type="submit" disabled={loading}
                    className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-50">
                    {loading ? "Mise à jour…" : "Mettre à jour"}
                    {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
    </AuthShell>
  );
};

export default ResetPassword;
