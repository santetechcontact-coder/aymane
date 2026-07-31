import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  HeartPulse, Droplet, AlertTriangle, Pill, Phone, Shield,
  User, Activity, Save, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const fieldCls = "h-11 squircle bg-background/60 border border-hairline focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all";

const MedicalRecord = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    blood_group: "" as string,
    allergies: "",
    chronic_conditions: "",
    current_treatments: "",
    height_cm: "" as string | number,
    weight_kg: "" as string | number,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    notes: "",
  });

  useEffect(() => {
    document.title = "Dossier médical — AYMANE";
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          blood_group: data.blood_group ?? "",
          allergies: data.allergies ?? "",
          chronic_conditions: data.chronic_conditions ?? "",
          current_treatments: data.current_treatments ?? "",
          height_cm: data.height_cm ?? "",
          weight_kg: data.weight_kg ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
          emergency_contact_relation: data.emergency_contact_relation ?? "",
          notes: data.notes ?? "",
        });
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const payload = {
      patient_id: user.id,
      blood_group: (form.blood_group || null) as any,
      allergies: form.allergies || null,
      chronic_conditions: form.chronic_conditions || null,
      current_treatments: form.current_treatments || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      emergency_contact_relation: form.emergency_contact_relation || null,
      notes: form.notes || null,
    };
    const { error } = await supabase
      .from("medical_records")
      .upsert(payload, { onConflict: "patient_id" });
    setLoading(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Dossier enregistré", description: "Vos informations sont à jour." });
  };

  const bmi = (() => {
    const h = Number(form.height_cm);
    const w = Number(form.weight_kg);
    if (!h || !w) return null;
    return (w / Math.pow(h / 100, 2)).toFixed(1);
  })();

  const bmiLabel = bmi
    ? Number(bmi) < 18.5 ? "Insuffisant"
    : Number(bmi) < 25 ? "Normal"
    : Number(bmi) < 30 ? "Surpoids" : "Obésité"
    : null;
  const bmiTone = bmi
    ? Number(bmi) < 18.5 || Number(bmi) >= 30 ? "text-accent"
    : Number(bmi) < 25 ? "text-secondary" : "text-warning"
    : "text-ink-3";

  // Completeness
  const fields = [
    form.blood_group, form.allergies, form.chronic_conditions, form.current_treatments,
    form.height_cm, form.weight_kg, form.emergency_contact_name, form.emergency_contact_phone,
  ];
  const filled = fields.filter((v) => v !== "" && v !== null && v !== undefined).length;
  const completion = Math.round((filled / fields.length) * 100);

  return (
    <DashboardLayout title="Dossier médical" back>
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="label text-ink-3 mb-3 inline-flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" /> Données chiffrées · accessibles à vos soignants
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-display text-ink leading-[1.05]">
          Mon <span className="text-gradient-primary">dossier médical</span>
        </h1>
        <p className="mt-3 text-[15px] text-ink-3 max-w-xl">
          Données vitales partagées en toute sécurité avec les professionnels que vous consultez.
        </p>
      </motion.header>

      {/* Vital cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <VitalCard
          icon={Droplet}
          label="Groupe sanguin"
          value={form.blood_group || "—"}
          tone="accent"
        />
        <VitalCard
          icon={Activity}
          label="IMC"
          value={bmi ?? "—"}
          sub={bmiLabel ?? "Renseignez taille & poids"}
          subTone={bmiTone}
          tone="secondary"
        />
        <VitalCard
          icon={AlertTriangle}
          label="Allergies"
          value={form.allergies ? form.allergies.split(",")[0].trim() : "Aucune"}
          sub={form.allergies && form.allergies.split(",").length > 1 ? `+${form.allergies.split(",").length - 1} autres` : undefined}
          tone="warning"
        />
        <VitalCard
          icon={HeartPulse}
          label="Complétude"
          value={`${completion}%`}
          sub={completion < 100 ? "À compléter" : "Profil complet"}
          tone="primary"
          progress={completion}
        />
      </section>

      {/* Tabs */}
      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="glass ring-inner squircle-lg p-1 h-11 mb-6 w-full md:w-auto overflow-x-auto no-scrollbar flex-nowrap">
          <TabsTrigger value="vitals" className="squircle px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0">
            <User className="h-4 w-4 mr-2" /> Identité
          </TabsTrigger>
          <TabsTrigger value="history" className="squircle px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0">
            <Pill className="h-4 w-4 mr-2" /> Antécédents
          </TabsTrigger>
          <TabsTrigger value="emergency" className="squircle px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0">
            <Phone className="h-4 w-4 mr-2" /> Urgence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals">
          <Section title="Identité médicale" desc="Informations vitales utiles aux soignants.">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Groupe sanguin">
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className={cn(fieldCls, "w-full px-3 text-[15px]")}
                >
                  <option value="">— Inconnu</option>
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <div />
              <Field label="Taille (cm)">
                <Input
                  type="number" inputMode="numeric"
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                  className={fieldCls}
                  placeholder="170"
                />
              </Field>
              <Field label="Poids (kg)">
                <Input
                  type="number" inputMode="numeric"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className={fieldCls}
                  placeholder="65"
                />
              </Field>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="history">
          <Section title="Antécédents & traitements" desc="Indiquez les éléments connus pour un meilleur suivi.">
            <div className="space-y-5">
              <Field label="Allergies" hint="Séparez par des virgules · ex. Pénicilline, arachides">
                <Textarea
                  rows={2}
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  className={cn(fieldCls, "h-auto py-3")}
                  placeholder="Aucune connue"
                />
              </Field>
              <Field label="Maladies chroniques · antécédents">
                <Textarea
                  rows={3}
                  value={form.chronic_conditions}
                  onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
                  className={cn(fieldCls, "h-auto py-3")}
                  placeholder="Diabète, hypertension, asthme…"
                />
              </Field>
              <Field label="Traitements en cours">
                <Textarea
                  rows={3}
                  value={form.current_treatments}
                  onChange={(e) => setForm({ ...form, current_treatments: e.target.value })}
                  className={cn(fieldCls, "h-auto py-3")}
                  placeholder="Médicament · posologie · durée"
                />
              </Field>
              <Field label="Notes personnelles">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={cn(fieldCls, "h-auto py-3")}
                  placeholder="Informations complémentaires utiles"
                />
              </Field>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="emergency">
          <Section title="Contact d'urgence" desc="La personne à prévenir en cas de problème grave.">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Nom complet">
                <Input
                  value={form.emergency_contact_name}
                  onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  className={fieldCls}
                  placeholder="Ex. Aïssatou Diop"
                />
              </Field>
              <Field label="Lien">
                <Input
                  value={form.emergency_contact_relation}
                  onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })}
                  className={fieldCls}
                  placeholder="Ex. Conjoint, parent…"
                />
              </Field>
              <Field label="Téléphone" hint="Joignable 24/7 si possible">
                <Input
                  inputMode="tel"
                  value={form.emergency_contact_phone}
                  onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                  className={fieldCls}
                  placeholder="+221 77 000 00 00"
                />
              </Field>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      {/* Sticky save */}
      <div className="sticky bottom-20 md:bottom-6 mt-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="squircle-xl glass-strong ring-inner shadow-lg p-3 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0 px-2">
            <div className="text-[12px] text-ink-3">Enregistrement automatique non actif</div>
            <div className="text-[14px] font-semibold text-ink truncate">Pensez à valider vos modifications</div>
          </div>
          <Button
            onClick={save}
            disabled={loading}
            className="squircle-full h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

const Section = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="squircle-xl glass ring-inner shadow-xs p-5 md:p-6"
  >
    <div className="mb-5">
      <h3 className="font-display text-lg tracking-headline text-ink">{title}</h3>
      {desc && <p className="text-[13px] text-ink-3 mt-1">{desc}</p>}
    </div>
    {children}
  </motion.section>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[12.5px] font-semibold text-ink-2">{label}</Label>
    {children}
    {hint && <p className="text-[11.5px] text-ink-3">{hint}</p>}
  </div>
);

const VitalCard = ({
  icon: Icon, label, value, sub, subTone, tone, progress,
}: {
  icon: any; label: string; value: string | number;
  sub?: string; subTone?: string;
  tone: "primary" | "secondary" | "accent" | "warning";
  progress?: number;
}) => {
  const cls = {
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary-soft text-secondary",
    accent: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="squircle-lg glass ring-inner shadow-xs p-4"
    >
      <div className={cn("size-9 squircle flex items-center justify-center mb-3", cls)}>
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="font-display text-2xl tabular text-ink leading-none truncate">{value}</div>
      <div className="text-[12px] text-ink-3 mt-1.5 font-medium truncate">{label}</div>
      {sub && (
        <div className={cn("text-[11px] mt-1 truncate font-medium", subTone ?? "text-ink-3")}>{sub}</div>
      )}
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 squircle-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default MedicalRecord;
