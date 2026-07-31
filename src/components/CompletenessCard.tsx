import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const CompletenessCard = () => {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("compute_profile_completeness", { _user_id: user.id });
      if (typeof data === "number") setScore(data);
    })();
  }, [user]);

  if (score === null || score === 0 || score === 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="squircle-xl glass p-5 mb-6"
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 squircle bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink">Complétez votre profil</p>
            <p className="text-[11.5px] text-ink-3">Profil vérifié à {score} %</p>
          </div>
        </div>
        <Link
          to="/auth/provider"
          className="text-[12px] font-semibold text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all shrink-0"
        >
          Compléter <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
        />
      </div>
    </motion.div>
  );
};

export default CompletenessCard;
