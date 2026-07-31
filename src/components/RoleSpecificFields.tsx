import { cn } from "@/lib/utils";
import SearchableMultiSelect from "@/components/smart/SearchableMultiSelect";
import DaysPicker from "@/components/smart/DaysPicker";
import TimeSlotPicker, { type TimeSlot } from "@/components/smart/TimeSlotPicker";
import { ACTS_BY_ROLE, LANGUAGES, PROFESSIONS } from "@/lib/medical-data";

type ProviderKind =
  | "doctor" | "dentist" | "nurse" | "midwife"
  | "pharmacist" | "lab_technician" | "other_provider";

export type RoleSpecific = Record<string, string | string[] | boolean>;

interface Props {
  type: ProviderKind;
  value: RoleSpecific;
  onChange: (next: RoleSpecific) => void;
  yearsExperience: string;
  onYearsChange: (v: string) => void;
  languages: string[];
  onLanguagesChange: (v: string[]) => void;
  primaryLanguage: string;
  onPrimaryLanguageChange: (v: string) => void;
  services: string[];
  onServicesChange: (v: string[]) => void;
  days: string[];
  onDaysChange: (v: string[]) => void;
  timeSlots: TimeSlot[];
  onTimeSlotsChange: (v: TimeSlot[]) => void;
  structureRole: string;
  onStructureRoleChange: (v: string) => void;
}

const inputCls =
  "w-full bg-transparent border-0 outline-none text-ink text-[15px] placeholder:text-ink-4";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block min-w-0 squircle-lg bg-surface-1/70 hover:bg-surface-1 transition-colors px-3 py-2 md:px-4 md:py-2.5 border border-hairline focus-within:border-primary/40 focus-within:bg-surface-0 focus-within:shadow-sm">
    <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3 mb-0.5">{label}</p>
    {children}
  </label>
);

const Card = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="squircle-xl glass-strong sheen ring-inner shadow-sm p-4 md:p-6">
    <div className="mb-3 md:mb-4">
      <p className="text-[11px] font-mono uppercase tracking-widest text-ink-3">{title}</p>
      {hint && <p className="text-[12px] text-ink-3 mt-1">{hint}</p>}
    </div>
    <div className="space-y-2.5 md:space-y-3">{children}</div>
  </section>
);

const Block = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3 mb-1.5 px-1">{label}</p>
    {children}
    {hint && <p className="text-[11.5px] text-ink-3 mt-1 px-1">{hint}</p>}
  </div>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2.5 md:gap-3">{children}</div>
);

const STRUCTURE_ROLES = [
  { id: "employee", label: "Employé" },
  { id: "manager", label: "Responsable" },
  { id: "independent", label: "Indépendant" },
];

const RoleSpecificFields = ({
  type, value, onChange,
  yearsExperience, onYearsChange,
  languages, onLanguagesChange,
  primaryLanguage, onPrimaryLanguageChange,
  services, onServicesChange,
  days, onDaysChange,
  timeSlots, onTimeSlotsChange,
  structureRole, onStructureRoleChange,
}: Props) => {
  const set = (k: string) => (v: string | boolean) =>
    onChange({ ...value, [k]: v });
  const get = (k: string) => (value[k] as string) ?? "";

  const actGroups = ACTS_BY_ROLE[type] ?? [];
  const langGroups = [{ category: "Langues", options: LANGUAGES }];

  const renderRoleFields = () => {
    switch (type) {
      case "doctor":
        return (
          <Card title="Profil médecin" hint="Renseignez votre pratique pour faciliter la mise en relation.">
            <Grid>
              <Field label="Type de pratique">
                <select value={get("practice_type")} onChange={(e) => set("practice_type")(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  <option value="generalist">Généraliste</option>
                  <option value="specialist">Spécialiste</option>
                </select>
              </Field>
              <Field label="Années d'expérience">
                <input type="number" inputMode="numeric" value={yearsExperience} onChange={(e) => onYearsChange(e.target.value)} className={inputCls} placeholder="8" />
              </Field>
            </Grid>
          </Card>
        );

      case "dentist":
        return (
          <Card title="Profil dentiste">
            <Grid>
              <Field label="Années d'expérience">
                <input type="number" inputMode="numeric" value={yearsExperience} onChange={(e) => onYearsChange(e.target.value)} className={inputCls} placeholder="6" />
              </Field>
              <Field label="Équipement disponible">
                <input value={get("equipment")} onChange={(e) => set("equipment")(e.target.value)} className={inputCls} placeholder="Radio dentaire, scanner 3D…" />
              </Field>
            </Grid>
          </Card>
        );

      case "nurse":
        return (
          <Card title="Profil infirmier(ère)">
            <Grid>
              <Field label="Type">
                <select value={get("nurse_type")} onChange={(e) => set("nurse_type")(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  <option value="state">Infirmier d'État</option>
                  <option value="auxiliary">Auxiliaire</option>
                  <option value="specialized">Spécialisé(e)</option>
                </select>
              </Field>
              <Field label="Mode d'exercice">
                <select value={get("practice_mode")} onChange={(e) => set("practice_mode")(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  <option value="home">À domicile</option>
                  <option value="structure">En structure</option>
                  <option value="both">Les deux</option>
                </select>
              </Field>
            </Grid>
            <label className="flex items-center gap-2.5 px-1 cursor-pointer tap">
              <input type="checkbox" checked={!!value.emergency_available} onChange={(e) => set("emergency_available")(e.target.checked)} className="size-4 accent-primary" />
              <span className="text-[13.5px] text-ink-2">Disponible pour les urgences</span>
            </label>
          </Card>
        );

      case "midwife":
        return (
          <Card title="Profil sage-femme">
            <Grid>
              <Field label="Lieu d'exercice">
                <input value={get("workplace")} onChange={(e) => set("workplace")(e.target.value)} className={inputCls} placeholder="Maternité, cabinet…" />
              </Field>
              <Field label="Accouchements réalisés (~)">
                <input type="number" inputMode="numeric" value={get("deliveries_count")} onChange={(e) => set("deliveries_count")(e.target.value)} className={inputCls} placeholder="120" />
              </Field>
            </Grid>
            <label className="flex items-center gap-2.5 px-1 cursor-pointer tap">
              <input type="checkbox" checked={!!value.available_24_7} onChange={(e) => set("available_24_7")(e.target.checked)} className="size-4 accent-primary" />
              <span className="text-[13.5px] text-ink-2">Disponible 24h/24</span>
            </label>
          </Card>
        );

      case "pharmacist":
        return (
          <Card title="Profil pharmacien">
            <Grid>
              <Field label="Type">
                <select value={get("pharmacist_type")} onChange={(e) => set("pharmacist_type")(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  <option value="titular">Titulaire</option>
                  <option value="assistant">Assistant</option>
                </select>
              </Field>
              <Field label="Nom de la pharmacie">
                <input value={get("pharmacy_name")} onChange={(e) => set("pharmacy_name")(e.target.value)} className={inputCls} placeholder="Pharmacie de la Paix" />
              </Field>
            </Grid>
            <Field label="N° autorisation d'ouverture">
              <input value={get("opening_authorization")} onChange={(e) => set("opening_authorization")(e.target.value)} className={inputCls} />
            </Field>
          </Card>
        );

      case "lab_technician":
        return (
          <Card title="Profil technicien de laboratoire">
            <Grid>
              <Field label="Diplôme">
                <input value={get("diploma_name")} onChange={(e) => set("diploma_name")(e.target.value)} className={inputCls} placeholder="DUT biologie médicale" />
              </Field>
              <Field label="Années d'expérience">
                <input type="number" inputMode="numeric" value={yearsExperience} onChange={(e) => onYearsChange(e.target.value)} className={inputCls} placeholder="5" />
              </Field>
            </Grid>
            <Field label="Équipement maîtrisé">
              <input value={get("equipment")} onChange={(e) => set("equipment")(e.target.value)} className={inputCls} placeholder="Automate Sysmex, PCR…" />
            </Field>
            <Field label="Lieu d'exercice (laboratoire)">
              <input value={get("workplace")} onChange={(e) => set("workplace")(e.target.value)} className={inputCls} />
            </Field>
          </Card>
        );

      case "other_provider":
        return (
          <Card title="Profession & compétences" hint="Sélectionnez votre profession ou ajoutez-la si elle n'apparaît pas.">
            <Block label="Profession *">
              <SearchableMultiSelect
                groups={PROFESSIONS}
                value={get("profession") ? [get("profession")] : []}
                onChange={(vals) => set("profession")(vals[0] ?? "")}
                placeholder="Choisir votre profession…"
                multiple={false}
                allowOther
              />
            </Block>
            <Field label="Certifications">
              <input value={get("certifications")} onChange={(e) => set("certifications")(e.target.value)} className={inputCls} placeholder="Certifications, formations continues" />
            </Field>
            <Field label="Description des services">
              <textarea value={get("service_description")} onChange={(e) => set("service_description")(e.target.value)} className={cn(inputCls, "min-h-[80px] resize-none")} placeholder="Présentez votre approche et vos prestations." />
            </Field>
          </Card>
        );
    }
  };

  return (
    <>
      {renderRoleFields()}

      {actGroups.length > 0 && (
        <Card title="Actes & services proposés" hint="Sélection multiple — adaptés à votre profession. Vous pouvez ajouter un acte personnalisé.">
          <Block label="Actes médicaux">
            <SearchableMultiSelect
              groups={actGroups}
              value={services}
              onChange={onServicesChange}
              placeholder="Choisir vos actes…"
              multiple
              allowOther
            />
          </Block>
        </Card>
      )}

      <Card title="Disponibilités" hint="Indiquez vos jours et créneaux horaires habituels.">
        <Block label="Jours">
          <DaysPicker value={days} onChange={onDaysChange} />
        </Block>
        <Block label="Créneaux horaires (HH:MM)" hint="Intervalles de 30 min — l'heure de fin doit être après le début.">
          <TimeSlotPicker value={timeSlots} onChange={onTimeSlotsChange} />
        </Block>
      </Card>

      <Card title="Langues parlées" hint="Définissez une langue principale en cliquant sur l'étoile.">
        <SearchableMultiSelect
          groups={langGroups}
          value={languages}
          onChange={onLanguagesChange}
          primaryValue={primaryLanguage}
          onPrimaryChange={onPrimaryLanguageChange}
          placeholder="Sélectionner les langues…"
          multiple
          allowOther
        />
      </Card>

      <Card title="Liaison avec une structure" hint="Optionnel — vous pourrez en ajouter plus tard.">
        <div className="grid grid-cols-3 gap-2">
          {STRUCTURE_ROLES.map((r) => {
            const active = structureRole === r.id;
            return (
              <button key={r.id} type="button" onClick={() => onStructureRoleChange(active ? "" : r.id)}
                className={cn(
                  "squircle p-3 text-[13px] font-medium tap transition-all",
                  active ? "bg-ink text-white shadow-sm" : "bg-surface-1 text-ink-2 hover:bg-surface-2"
                )}>
                {r.label}
              </button>
            );
          })}
        </div>
      </Card>
    </>
  );
};

export default RoleSpecificFields;
