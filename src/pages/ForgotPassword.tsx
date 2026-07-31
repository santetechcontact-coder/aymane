import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ArrowRight, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AuthShell from "@/components/AuthShell";

const emailSchema = z.string().trim().email("Email invalide").max(255);

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { document.title = "Mot de passe oublié — AYMANE"; }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(email); }
    catch (err: any) {
      toast({ title: "Email invalide", description: err.errors?.[0]?.message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Échec de l'envoi", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Lien envoyé", description: "Vérifiez votre boîte mail." });
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
              <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={2.4} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-[1.04] text-balance">
              Récupérer votre accès
            </h1>
            <p className="mt-3 text-[14.5px] text-ink-3 max-w-sm">
              Entrez votre email, nous vous enverrons un lien sécurisé pour définir un nouveau mot de passe.
            </p>
          </div>

          <div className="rounded-[1rem] border border-hairline bg-surface-0 shadow-sm p-5">
            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  onSubmit={submit} className="space-y-4"
                >
                  <label className="block">
                    <span className="text-[12px] font-medium text-ink-3 px-1">Email</span>
                    <div className="mt-1.5 flex items-center gap-2 px-4 h-12 squircle-lg bg-surface-1/80 border border-hairline focus-within:border-primary/40 focus-within:bg-surface-0 transition-colors">
                      <Mail className="h-4 w-4 text-ink-3 shrink-0" />
                      <input
                        type="email" inputMode="email" autoComplete="email" required autoFocus
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@email.com"
                        className="flex-1 bg-transparent border-0 outline-none text-[16px] text-ink placeholder:text-ink-4"
                      />
                    </div>
                  </label>

                  <button type="submit" disabled={loading}
                    className="btn-pill w-full h-12 bg-ink text-white text-[15px] font-semibold mt-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ease-spring disabled:opacity-50">
                    {loading ? "Envoi…" : "Envoyer le lien"}
                    {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="inline-flex size-16 squircle-xl bg-success-soft items-center justify-center mb-4">
                    <MailCheck className="h-8 w-8 text-success" strokeWidth={2.2} />
                  </div>
                  <h2 className="font-display text-xl text-ink mb-2">Email envoyé</h2>
                  <p className="text-[14px] text-ink-3 max-w-sm mx-auto">
                    Un lien de réinitialisation vient d'être envoyé à <span className="font-medium text-ink-2">{email}</span>. Le lien expire dans 1 heure.
                  </p>
                  <button onClick={() => navigate("/auth")}
                    className="btn-pill mt-6 px-6 h-11 bg-ink text-white text-[14px] font-semibold">
                    Retour à la connexion
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-5 text-center text-[13px] text-ink-3">
            Pas encore de compte ?{" "}
            <Link to="/auth" className="text-primary font-medium hover:underline">Créer un compte</Link>
          </p>
        </motion.div>
    </AuthShell>
  );
};

export default ForgotPassword;
