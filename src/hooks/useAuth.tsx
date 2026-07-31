import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DurableAccount, syncAccountSession } from "@/lib/account-backend";

export type AppRole =
  | "patient"
  | "doctor"
  | "pharmacist"
  | "admin"
  | "application_reviewer"
  | "hospital"
  | "clinic"
  | "dentist"
  | "nurse"
  | "midwife"
  | "lab_technician"
  | "other_provider";

export const PROVIDER_ROLES: AppRole[] = [
  "doctor", "dentist", "nurse", "midwife", "pharmacist", "lab_technician", "other_provider",
];
export const STRUCTURE_ROLES: AppRole[] = ["hospital", "clinic"];

export const ROLE_LABELS: Record<AppRole, string> = {
  patient: "Patient",
  doctor: "Médecin",
  dentist: "Dentiste",
  nurse: "Infirmier",
  midwife: "Sage-femme",
  pharmacist: "Pharmacien",
  lab_technician: "Laborantin",
  other_provider: "Professionnel de santé",
  hospital: "Hôpital",
  clinic: "Clinique",
  admin: "Administrateur",
  application_reviewer: "Agent dossiers",
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  account: DurableAccount | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<DurableAccount | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data?.map((r) => r.role as AppRole)) ?? []);
  };

  const loadDurableAccount = async (sess: Session) => {
    try {
      const result = await syncAccountSession(sess);
      setAccount(result.account);
    } catch {
      setAccount(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadRoles(sess.user.id), 0);
        setTimeout(() => void loadDurableAccount(sess), 0);
      } else {
        setRoles([]);
        setAccount(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        void loadRoles(sess.user.id);
        void loadDurableAccount(sess);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setAccount(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, account, roles, loading, signOut, hasRole: (r) => roles.includes(r) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
