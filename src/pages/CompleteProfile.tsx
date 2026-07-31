import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SearchableMultiSelect from "@/components/smart/SearchableMultiSelect";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ALLERGIES, CHRONIC_CONDITIONS, BLOOD_GROUPS, RELATIONS, COMMUNICATION_PREFS,
} from "@/lib/medical-data";
import { ArrowRight, Shield } from "lucide-react";

const CompleteProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [communicationPref, setCommunicationPref] = useState("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [history, setHistory] = useState("");

  useEffect(() => {
    document.title = "Compléter mon profil — AYMANE";
    if (!user) return;
    (async () => {
      const { data: rec } = await supabase.from("medical_records").select("*").eq("patient_id", user.id).maybeSingle();
      if (rec) {
        setBloodGroup(rec.blood_group ?? "");
        setAllergies(rec.allergies ? rec.allergies.split("|").filter(Boolean) : []);
        setChronic(rec.chronic_conditions ? rec.chronic_conditions.split("|").filter(Boolean) : []);
        setEmergencyName(rec.emergency_contact_name ?? "");
        setEmergencyRelation((rec as any).emergency_contact_relation ?? "");
        setEmergencyPhone(rec.emergency_contact_phone ?? "");
        setHeight((rec as any).height_cm?.toString() ?? "");
        setWeight((rec as any).weight_kg?.toString() ?? "");
        setHistory(rec.notes ?? "");
      }
      const { data: prof } = await supabase.from("profiles").select("communication_pref").eq("id", user.id).maybeSingle();
      if (prof?.communication_pref) setCommunicationPref(prof.communication_pref);
    })();
  }, [user]);

  const completeness = useMemo(() => {
    const fields = [bloodGroup, allergies.length > 0, chronic.length > 0, emergencyName, emergencyRelation, emergencyPhone, communicationPref, height, weight];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [bloodGroup, allergies, chronic, emergencyName, emergencyRelation, emergencyPhone, communicationPref, height, weight]);

  const save = async (skip = false) => {
    if (!user) return;
    setLoading(true);
    const payload: any = {
      patient_id: user.id,
      blood_group: bloodGroup || null,
      allergies: allergies.join("|") || null,
      chronic_conditions: chronic.join("|") || null,
      emergency_contact_name: emergencyName || null,
      emergency_contact_relation: emergencyRelation || null,
      emergency_contact_phone: emergencyPhone || null,
      height_cm: height ? parseInt(height, 10) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      notes: history || null,
    };
    const { error } = await supabase.from("medical_records").upsert(payload, { onConflict: "patient_id" });
    if (!error && communicationPref) {
      await supabase.from("profiles").update({ communication_pref: communicationPref }).eq("id", user.id);
    }
    setLoading(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: skip ? "À plus tard" : "Profil enregistré" });
      navigate("/dashboard");
    }
  };

  return (
    <DashboardLayout title="Compléter mon profil" back>
      <PageHeader eyebrow="Première étape" title="Complétez votre profil médical" italic="essentiel"
        description="Ces informations permettent aux soignants d'agir vite et juste — surtout en cas d'urgence." />

      <div className="mb-8 squircle-lg bg-primary-soft/50 border border-primary/20 p-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink">Profil rempli à {completeness}%</p>
          <div className="mt-1.5 h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <Section title="I. Données vitales">
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldBlock label="Groupe sanguin">
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger><SelectValue placeholder="Inconnu" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldBlock>
            <FieldBlock label="Communication préférée">
              <Select value={communicationPref} onValueChange={setCommunicationPref}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_PREFS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldBlock>
            <FieldBlock label="Taille (cm)">
              <Input type="number" inputMode="numeric" min={50} max={250} value={height}
                onChange={(e) => setHeight(e.target.value)} placeholder="170" />
            </FieldBlock>
            <FieldBlock label="Poids (kg)">
              <Input type="number" inputMode="decimal" min={2} max={400} value={weight}
                onChange={(e) => setWeight(e.target.value)} placeholder="65" />
            </FieldBlock>
          </div>
        </Section>

        <Section title="II. Allergies & antécédents">
          <FieldBlock label="Allergies (sélection multiple)">
            <SearchableMultiSelect
              groups={ALLERGIES}
              value={allergies}
              onChange={setAllergies}
              placeholder="Aucune sélectionnée"
              allowOther
            />
          </FieldBlock>
          <FieldBlock label="Maladies chroniques (sélection multiple)">
            <SearchableMultiSelect
              groups={CHRONIC_CONDITIONS}
              value={chronic}
              onChange={setChronic}
              placeholder="Aucune sélectionnée"
              allowOther
            />
          </FieldBlock>
          <FieldBlock label="Historique médical complémentaire">
            <Textarea rows={3} value={history} onChange={(e) => setHistory(e.target.value)}
              placeholder="Opérations, hospitalisations, traitements en cours…" />
          </FieldBlock>
        </Section>

        <Section title="III. Contact d'urgence">
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldBlock label="Nom complet">
              <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Ex : Fatou Diallo" />
            </FieldBlock>
            <FieldBlock label="Relation">
              <Select value={emergencyRelation} onValueChange={setEmergencyRelation}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldBlock>
            <FieldBlock label="Téléphone" className="sm:col-span-2">
              <Input type="tel" inputMode="tel" value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+221 77 123 45 67" />
            </FieldBlock>
          </div>
        </Section>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-12">
        <button onClick={() => save(false)} disabled={loading}
          className="btn-pill flex-1 h-12 bg-ink text-white text-[15px] font-semibold tap shadow-md disabled:opacity-50">
          {loading ? "Enregistrement…" : "Enregistrer & continuer"} <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={() => save(true)} disabled={loading}
          className="btn-pill h-12 px-5 bg-surface-1 text-ink-2 text-[14px] font-medium tap">
          Plus tard
        </button>
      </div>
    </DashboardLayout>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3 mb-4">{title}</p>
    <div className="space-y-4">{children}</div>
  </section>
);

const FieldBlock = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <Label className="text-[11.5px] uppercase tracking-wider text-ink-3 mb-1.5 block">{label}</Label>
    {children}
  </div>
);

export default CompleteProfile;
