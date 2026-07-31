import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Hospital, MapPin, Phone, Mail, ShieldCheck, Plus, Trash2, Users,
  Stethoscope, Activity, Building2, Save, Sparkles, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = [
  { id: "hospital", label: "Hôpital" },
  { id: "clinic", label: "Clinique" },
  { id: "medical_office", label: "Cabinet médical" },
  { id: "dental_office", label: "Cabinet dentaire" },
  { id: "lab", label: "Laboratoire" },
  { id: "pharmacy", label: "Pharmacie" },
  { id: "health_center", label: "Centre de santé" },
  { id: "other", label: "Autre" },
];

type Service = { name: string; price: string; available: boolean };
type OpeningDay = { id: string; label: string; open: boolean; start: string; end: string; breakStart: string; breakEnd: string };

const DEFAULT_OPENING_DAYS: OpeningDay[] = [
  { id: "mon", label: "Lun", open: true, start: "08:00", end: "18:00", breakStart: "13:00", breakEnd: "15:00" },
  { id: "tue", label: "Mar", open: true, start: "08:00", end: "18:00", breakStart: "13:00", breakEnd: "15:00" },
  { id: "wed", label: "Mer", open: true, start: "08:00", end: "18:00", breakStart: "13:00", breakEnd: "15:00" },
  { id: "thu", label: "Jeu", open: true, start: "08:00", end: "18:00", breakStart: "13:00", breakEnd: "15:00" },
  { id: "fri", label: "Ven", open: true, start: "08:00", end: "17:00", breakStart: "13:00", breakEnd: "15:30" },
  { id: "sat", label: "Sam", open: true, start: "09:00", end: "13:00", breakStart: "", breakEnd: "" },
  { id: "sun", label: "Dim", open: false, start: "09:00", end: "13:00", breakStart: "", breakEnd: "" },
];

const Stat = ({ icon: Icon, label, value, hint, tone = "primary" }: {
  icon: any; label: string; value: string | number; hint?: string;
  tone?: "primary" | "success" | "warning" | "accent";
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="squircle-lg glass-strong ring-inner p-5 shadow-sm"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={cn(
        "size-10 squircle grid place-items-center",
        tone === "primary" && "bg-primary-soft text-primary",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "accent" && "bg-accent/15 text-accent",
      )}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <div className="text-[28px] font-display font-semibold tracking-tight tabular leading-none">{value}</div>
    <div className="text-[12.5px] text-ink-2 mt-1.5">{label}</div>
    {hint && <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>}
  </motion.div>
);

const Section = ({ title, eyebrow, children, action }: {
  title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode;
}) => (
  <section className="squircle-xl glass-strong ring-inner shadow-sm p-6 md:p-7">
    <header className="flex items-end justify-between gap-4 mb-5 pb-4 border-b border-hairline">
      <div>
        {eyebrow && <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-1">{eyebrow}</div>}
        <h2 className="font-display text-xl md:text-[22px] tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[12px] text-ink-2 font-medium">{label}</Label>
    {children}
  </div>
);

const Structure = () => {
  const { user } = useAuth();
  const [structure, setStructure] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [openingDays, setOpeningDays] = useState(DEFAULT_OPENING_DAYS);
  const [emergencyLine, setEmergencyLine] = useState(true);
  const [form, setForm] = useState({
    name: "", type: "clinic", address: "", city: "", region: "",
    phone_landline: "", phone_mobile: "", email: "", manager_name: "", description: "",
  });
  const [newService, setNewService] = useState({ name: "", price: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("health_structures")
      .select("*").eq("owner_user_id", user.id).order("created_at").limit(1).maybeSingle();
    setStructure(data);
    if (data) {
      setForm({
        name: data.name, type: data.type, address: data.address, city: data.city,
        region: data.region ?? "", phone_landline: data.phone_landline ?? "",
        phone_mobile: data.phone_mobile ?? "", email: data.email,
        manager_name: data.manager_name, description: data.description ?? "",
      });
      const { data: links } = await supabase.from("provider_structures").select("*").eq("structure_id", data.id);
      setStaff(links ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { document.title = "Ma structure — AYMANE"; load(); }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { ...form, owner_user_id: user.id, type: form.type as any };
    const q = structure
      ? supabase.from("health_structures").update(payload).eq("id", structure.id)
      : supabase.from("health_structures").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Structure enregistrée" }); load(); }
  };

  const addService = () => {
    if (!newService.name) return;
    setServices([...services, { ...newService, available: true }]);
    setNewService({ name: "", price: "" });
  };

  const updateOpeningDay = (id: string, patch: Partial<OpeningDay>) => {
    setOpeningDays((days) => days.map((day) => (day.id === id ? { ...day, ...patch } : day)));
  };

  const completeness = useMemo(() => {
    const fields = [form.name, form.type, form.address, form.city, form.phone_landline, form.email, form.manager_name];
    const filled = fields.filter((v) => v && v.toString().trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);
  const activeOpeningDays = openingDays.filter((day) => day.open);

  if (loading) {
    return (
      <DashboardLayout title="Structure">
        <div className="squircle-lg glass ring-inner h-64 animate-pulse" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Structure" eyebrow="Établissement de santé">
      <motion.section
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="squircle-xl glass-strong ring-inner shadow-md p-6 md:p-8 mb-6 relative overflow-hidden"
      >
        <div className="relative flex items-start gap-5">
          <div className="size-14 squircle bg-primary text-primary-foreground grid place-items-center shadow-lg shrink-0">
            <Hospital className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-1.5">
              Pilotage d'établissement
            </div>
            <h1 className="font-display text-3xl md:text-[40px] tracking-tight leading-[1.05] text-ink">
              {structure?.name || "Créer ma structure sanitaire"}
            </h1>
            {structure ? (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-2">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{structure.city}</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{structure.phone_landline}</span>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{structure.email}</span>
                <Badge variant="outline" className={cn(
                  "ml-2 gap-1 font-medium",
                  structure.verified
                    ? "border-success/30 text-success bg-success-soft"
                    : "border-warning/30 text-warning bg-warning-soft"
                )}>
                  <ShieldCheck className="h-3 w-3" />
                  {structure.verified ? "Vérifiée" : "En attente de vérification"}
                </Badge>
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-ink-2 max-w-2xl">
                Renseignez les informations de votre établissement pour rejoindre le réseau AYMANE, recevoir des patients et gérer votre équipe.
              </p>
            )}
          </div>
        </div>
      </motion.section>

      {structure && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Stat icon={Users} label="Personnel affilié" value={staff.length} tone="primary" />
          <Stat icon={Stethoscope} label="Services proposés" value={services.length} tone="success" />
          <Stat icon={Activity} label="Demandes reçues" value="0" hint="nouveau compte" tone="accent" />
          <Stat icon={Sparkles} label="Profil complété" value={`${completeness}%`} tone="warning" />
        </div>
      )}

      <Tabs defaultValue="info" className="space-y-5">
        <TabsList className="bg-surface-1 squircle-full p-1 h-11">
          <TabsTrigger value="info" className="squircle-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Building2 className="h-3.5 w-3.5" />Informations
          </TabsTrigger>
          <TabsTrigger value="services" className="squircle-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Stethoscope className="h-3.5 w-3.5" />Services
          </TabsTrigger>
          <TabsTrigger value="staff" className="squircle-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Users className="h-3.5 w-3.5" />Personnel
          </TabsTrigger>
          <TabsTrigger value="hours" className="squircle-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Clock className="h-3.5 w-3.5" />Horaires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Section title="Identité de l'établissement" eyebrow="01 — Profil">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nom de l'établissement *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Clinique Saint-Joseph" />
              </Field>
              <Field label="Type *">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2"><Field label="Adresse complète *"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Avenue, quartier, repère…" /></Field></div>
              <Field label="Ville *"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="Région"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
              <Field label="Téléphone fixe *"><Input value={form.phone_landline} onChange={(e) => setForm({ ...form, phone_landline: e.target.value })} /></Field>
              <Field label="Téléphone mobile"><Input value={form.phone_mobile} onChange={(e) => setForm({ ...form, phone_mobile: e.target.value })} /></Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Responsable / directeur *"><Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></Field>
              <div className="md:col-span-2">
                <Field label="Présentation publique">
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Spécialités, équipements, équipe, valeurs… (visible par les patients)"
                  />
                </Field>
              </div>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="services">
          <Section
            title="Services & tarifs"
            eyebrow="02 — Catalogue"
            action={<Badge variant="secondary" className="font-medium">{services.length} service{services.length > 1 ? "s" : ""}</Badge>}
          >
            <div className="grid md:grid-cols-[1fr_180px_auto] gap-2 mb-5">
              <Input
                placeholder="Nom du service (ex: Consultation générale)"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
              <Input
                type="number" placeholder="Tarif (FCFA)"
                value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
              />
              <Button onClick={addService} className="squircle-full gap-1.5">
                <Plus className="h-4 w-4" />Ajouter
              </Button>
            </div>

            {services.length === 0 ? (
              <div className="squircle bg-surface-1 p-10 text-center">
                <Stethoscope className="h-8 w-8 mx-auto text-ink-3 opacity-50 mb-2" />
                <p className="text-[13px] text-ink-3">Ajoutez vos premiers services pour les rendre visibles aux patients.</p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {services.map((s, i) => (
                  <li key={i} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-8 squircle bg-success-soft text-success grid place-items-center">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <span className="text-[14px] font-medium text-ink">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[13px] tabular font-semibold text-primary">
                        {s.price ? `${Number(s.price).toLocaleString("fr-FR")} FCFA` : "Gratuit"}
                      </span>
                      <button
                        onClick={() => setServices(services.filter((_, j) => j !== i))}
                        className="size-8 squircle hover:bg-destructive/10 text-ink-3 hover:text-destructive grid place-items-center transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="staff">
          <Section
            title="Personnel affilié"
            eyebrow="03 — Équipe"
            action={
              <Link to="/dashboard/directory" className="text-[12.5px] text-primary font-medium hover:underline">
                Parcourir l'annuaire →
              </Link>
            }
          >
            <p className="text-[13px] text-ink-2 mb-4">
              Les professionnels validés peuvent être rattachés à votre structure depuis l'annuaire AYMANE.
            </p>
            {staff.length === 0 ? (
              <div className="squircle bg-surface-1 p-10 text-center">
                <Users className="h-8 w-8 mx-auto text-ink-3 opacity-50 mb-2" />
                <p className="text-[13px] text-ink-3">Aucun personnel rattaché pour l'instant.</p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-9 squircle-full bg-primary-soft text-primary grid place-items-center font-semibold text-[13px]">
                        {s.provider_user_id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-medium tabular">{s.provider_user_id.slice(0, 8)}…</div>
                        <div className="text-[11.5px] text-ink-3">{s.role_at_structure ?? "Professionnel de santé"}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-medium">Actif</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="hours">
          <Section title="Horaires d'ouverture" eyebrow="04 — Disponibilités">
            <div className="grid lg:grid-cols-[1fr_260px] gap-5">
              <div className="space-y-2.5">
                {openingDays.map((day) => (
                  <div
                    key={day.id}
                    className={cn(
                      "rounded-[1.1rem] border border-hairline bg-surface-0/70 p-3 transition-colors",
                      !day.open && "bg-surface-1/70 text-ink-3",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => updateOpeningDay(day.id, { open: !day.open })}
                        className={cn(
                          "h-9 min-w-14 rounded-full px-3 text-[12.5px] font-semibold tap transition-colors",
                          day.open ? "bg-ink text-white" : "bg-surface-2 text-ink-3",
                        )}
                      >
                        {day.label}
                      </button>
                      <span className="text-[12px] text-ink-3">{day.open ? "Ouvert" : "Fermé"}</span>
                    </div>

                    {day.open && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <Field label="Début">
                          <Input type="time" value={day.start} onChange={(e) => updateOpeningDay(day.id, { start: e.target.value })} />
                        </Field>
                        <Field label="Fin">
                          <Input type="time" value={day.end} onChange={(e) => updateOpeningDay(day.id, { end: e.target.value })} />
                        </Field>
                        <Field label="Pause">
                          <Input type="time" value={day.breakStart} onChange={(e) => updateOpeningDay(day.id, { breakStart: e.target.value })} />
                        </Field>
                        <Field label="Reprise">
                          <Input type="time" value={day.breakEnd} onChange={(e) => updateOpeningDay(day.id, { breakEnd: e.target.value })} />
                        </Field>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <aside className="rounded-[1.25rem] bg-ink text-white p-5 h-fit">
                <div className="size-10 rounded-[1rem] bg-white text-ink grid place-items-center mb-4">
                  <Clock className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <p className="font-display text-xl tracking-tight">Résumé patient</p>
                <p className="text-[13px] text-white/68 leading-relaxed mt-2">
                  {activeOpeningDays.length
                    ? `${activeOpeningDays.length} jour${activeOpeningDays.length > 1 ? "s" : ""} d'ouverture configuré${activeOpeningDays.length > 1 ? "s" : ""}.`
                    : "Aucun jour ouvert pour le moment."}
                </p>
                <button
                  type="button"
                  onClick={() => setEmergencyLine((value) => !value)}
                  className="mt-5 w-full rounded-full bg-white text-ink h-11 text-[13px] font-semibold tap"
                >
                  {emergencyLine ? "Ligne urgence active" : "Activer la ligne urgence"}
                </button>
                <p className="text-[12px] text-white/52 leading-relaxed mt-3">
                  Ces informations aident les patients à choisir le bon moment pour appeler, venir ou demander une orientation.
                </p>
              </aside>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky bottom-4 mt-6 z-20"
      >
        <div className="squircle-full glass-strong ring-inner shadow-lg p-2 pl-5 flex items-center justify-between gap-3">
          <div className="text-[12.5px] text-ink-2 hidden sm:block">
            {structure ? "Modifications non enregistrées" : "Créez votre structure pour la rendre visible"}
          </div>
          <Button onClick={save} disabled={saving} className="squircle-full gap-2 h-10 px-5">
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement…" : structure ? "Mettre à jour" : "Créer la structure"}
          </Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Structure;
