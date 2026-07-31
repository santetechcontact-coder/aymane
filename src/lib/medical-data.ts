// Standardized reference data for AYMANE professional forms

export type ProviderKind =
  | "doctor" | "dentist" | "nurse" | "midwife"
  | "pharmacist" | "lab_technician" | "other_provider";

export interface OptionGroup {
  category: string;
  options: { value: string; label: string }[];
}

// ---- SPECIALTIES (grouped) ----
export const SPECIALTIES: OptionGroup[] = [
  {
    category: "Médecine",
    options: [
      { value: "medecine_generale", label: "Médecine générale" },
      { value: "cardiologie", label: "Cardiologie" },
      { value: "gynecologie", label: "Gynécologie" },
      { value: "pediatrie", label: "Pédiatrie" },
      { value: "dermatologie", label: "Dermatologie" },
      { value: "neurologie", label: "Neurologie" },
      { value: "ophtalmologie", label: "Ophtalmologie" },
      { value: "psychiatrie", label: "Psychiatrie" },
      { value: "endocrinologie", label: "Endocrinologie" },
      { value: "gastro_enterologie", label: "Gastro-entérologie" },
      { value: "pneumologie", label: "Pneumologie" },
      { value: "rhumatologie", label: "Rhumatologie" },
      { value: "urologie", label: "Urologie" },
      { value: "orl", label: "ORL" },
    ],
  },
  {
    category: "Chirurgie",
    options: [
      { value: "chirurgie_generale", label: "Chirurgie générale" },
      { value: "chirurgie_orthopedique", label: "Chirurgie orthopédique" },
      { value: "chirurgie_pediatrique", label: "Chirurgie pédiatrique" },
      { value: "chirurgie_plastique", label: "Chirurgie plastique" },
    ],
  },
  {
    category: "Soins & paramédical",
    options: [
      { value: "dentisterie", label: "Dentisterie" },
      { value: "kinesitherapie", label: "Kinésithérapie" },
      { value: "nutrition", label: "Nutrition" },
      { value: "psychologie", label: "Psychologie" },
      { value: "sage_femme", label: "Sage-femme" },
      { value: "infirmerie", label: "Soins infirmiers" },
    ],
  },
  {
    category: "Pharmacie & Biologie",
    options: [
      { value: "pharmacie", label: "Pharmacie" },
      { value: "biologie_medicale", label: "Biologie médicale" },
      { value: "radiologie", label: "Radiologie / Imagerie" },
      { value: "anatomopathologie", label: "Anatomo-pathologie" },
    ],
  },
  {
    category: "Santé publique",
    options: [
      { value: "sante_publique", label: "Santé publique" },
      { value: "epidemiologie", label: "Épidémiologie" },
      { value: "medecine_travail", label: "Médecine du travail" },
    ],
  },
];

// ---- LANGUAGES ----
export const LANGUAGES: { value: string; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "wo", label: "Wolof" },
  { value: "ff", label: "Pulaar" },
  { value: "srr", label: "Sérère" },
  { value: "ar", label: "Arabe" },
  { value: "es", label: "Espagnol" },
  { value: "pt", label: "Portugais" },
];

// ---- DAYS ----
export const DAYS: { value: string; label: string; short: string }[] = [
  { value: "monday", label: "Lundi", short: "Lun" },
  { value: "tuesday", label: "Mardi", short: "Mar" },
  { value: "wednesday", label: "Mercredi", short: "Mer" },
  { value: "thursday", label: "Jeudi", short: "Jeu" },
  { value: "friday", label: "Vendredi", short: "Ven" },
  { value: "saturday", label: "Samedi", short: "Sam" },
  { value: "sunday", label: "Dimanche", short: "Dim" },
];

// ---- TIME SLOTS — 30 min intervals 00:00 → 23:30 ----
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

// ---- MEDICAL ACTS by role ----
export const ACTS_BY_ROLE: Record<ProviderKind, OptionGroup[]> = {
  doctor: [
    {
      category: "Consultations",
      options: [
        { value: "consultation_generale", label: "Consultation générale" },
        { value: "consultation_specialisee", label: "Consultation spécialisée" },
        { value: "teleconsultation", label: "Téléconsultation" },
        { value: "suivi_patient", label: "Suivi patient" },
        { value: "visite_domicile", label: "Visite à domicile" },
      ],
    },
    {
      category: "Examens",
      options: [
        { value: "ecg", label: "ECG" },
        { value: "echographie", label: "Échographie" },
        { value: "spirometrie", label: "Spirométrie" },
      ],
    },
  ],
  dentist: [
    {
      category: "Soins dentaires",
      options: [
        { value: "detartrage", label: "Détartrage" },
        { value: "extraction", label: "Extraction" },
        { value: "blanchiment", label: "Blanchiment" },
        { value: "orthodontie", label: "Orthodontie" },
        { value: "implant", label: "Implantologie" },
        { value: "couronne", label: "Pose de couronne" },
        { value: "carie", label: "Traitement de carie" },
      ],
    },
  ],
  nurse: [
    {
      category: "Soins infirmiers",
      options: [
        { value: "injection", label: "Injection" },
        { value: "pansement", label: "Pansement" },
        { value: "perfusion", label: "Perfusion" },
        { value: "soins_domicile", label: "Soins à domicile" },
        { value: "prise_sang", label: "Prise de sang" },
        { value: "vaccination", label: "Vaccination" },
        { value: "surveillance", label: "Surveillance post-opératoire" },
      ],
    },
  ],
  midwife: [
    {
      category: "Maternité",
      options: [
        { value: "consultation_prenatale", label: "Consultation prénatale" },
        { value: "accouchement", label: "Accouchement" },
        { value: "suivi_postnatal", label: "Suivi postnatal" },
        { value: "echographie_obs", label: "Échographie obstétricale" },
        { value: "preparation_naissance", label: "Préparation à la naissance" },
        { value: "allaitement", label: "Conseil allaitement" },
      ],
    },
  ],
  pharmacist: [
    {
      category: "Pharmacie",
      options: [
        { value: "vente_medicaments", label: "Vente de médicaments" },
        { value: "conseil", label: "Conseil pharmaceutique" },
        { value: "preparation", label: "Préparation magistrale" },
        { value: "vaccination", label: "Vaccination" },
        { value: "garde", label: "Garde de nuit" },
        { value: "test_rapide", label: "Tests rapides" },
      ],
    },
  ],
  lab_technician: [
    {
      category: "Analyses",
      options: [
        { value: "hematologie", label: "Hématologie" },
        { value: "biochimie", label: "Biochimie" },
        { value: "microbiologie", label: "Microbiologie" },
        { value: "parasitologie", label: "Parasitologie" },
        { value: "serologie", label: "Sérologie" },
        { value: "pcr", label: "PCR / biologie moléculaire" },
      ],
    },
  ],
  other_provider: [
    {
      category: "Soins paramédicaux",
      options: [
        { value: "kine_seance", label: "Séance de kinésithérapie" },
        { value: "consultation_nutrition", label: "Consultation nutrition" },
        { value: "consultation_psy", label: "Consultation psychologique" },
        { value: "reeducation", label: "Rééducation fonctionnelle" },
      ],
    },
  ],
};

export const flattenGroups = (groups: OptionGroup[]) =>
  groups.flatMap((g) => g.options);

// ---- PROFESSIONS (paramedical / autres) ----
export const PROFESSIONS: OptionGroup[] = [
  {
    category: "Rééducation & physique",
    options: [
      { value: "kinesitherapeute", label: "Kinésithérapeute" },
      { value: "osteopathe", label: "Ostéopathe" },
      { value: "ergotherapeute", label: "Ergothérapeute" },
      { value: "podologue", label: "Podologue" },
      { value: "orthophoniste", label: "Orthophoniste" },
      { value: "orthoptiste", label: "Orthoptiste" },
    ],
  },
  {
    category: "Nutrition & bien-être",
    options: [
      { value: "nutritionniste", label: "Nutritionniste" },
      { value: "dieteticien", label: "Diététicien" },
      { value: "naturopathe", label: "Naturopathe" },
    ],
  },
  {
    category: "Santé mentale",
    options: [
      { value: "psychologue", label: "Psychologue" },
      { value: "psychotherapeute", label: "Psychothérapeute" },
      { value: "psychomotricien", label: "Psychomotricien" },
    ],
  },
  {
    category: "Imagerie & technique",
    options: [
      { value: "manipulateur_radio", label: "Manipulateur radio" },
      { value: "audioprothesiste", label: "Audioprothésiste" },
      { value: "opticien", label: "Opticien-lunetier" },
      { value: "prothesiste_dentaire", label: "Prothésiste dentaire" },
    ],
  },
  {
    category: "Aide & accompagnement",
    options: [
      { value: "aide_soignant", label: "Aide-soignant" },
      { value: "auxiliaire_puericulture", label: "Auxiliaire de puériculture" },
      { value: "ambulancier", label: "Ambulancier" },
      { value: "assistant_social", label: "Assistant(e) social(e) santé" },
    ],
  },
];

// ---- RÉGIONS du Sénégal ----
export const REGIONS: { value: string; label: string }[] = [
  { value: "dakar", label: "Dakar" },
  { value: "thies", label: "Thiès" },
  { value: "saint_louis", label: "Saint-Louis" },
  { value: "diourbel", label: "Diourbel" },
  { value: "louga", label: "Louga" },
  { value: "fatick", label: "Fatick" },
  { value: "kaolack", label: "Kaolack" },
  { value: "kaffrine", label: "Kaffrine" },
  { value: "tambacounda", label: "Tambacounda" },
  { value: "kedougou", label: "Kédougou" },
  { value: "kolda", label: "Kolda" },
  { value: "sedhiou", label: "Sédhiou" },
  { value: "ziguinchor", label: "Ziguinchor" },
  { value: "matam", label: "Matam" },
];

// ---- COUNTRIES ----
export const COUNTRIES: { value: string; label: string; dial: string }[] = [
  { value: "SN", label: "Sénégal", dial: "+221" },
  { value: "ML", label: "Mali", dial: "+223" },
  { value: "CI", label: "Côte d'Ivoire", dial: "+225" },
  { value: "GN", label: "Guinée", dial: "+224" },
  { value: "MR", label: "Mauritanie", dial: "+222" },
  { value: "GM", label: "Gambie", dial: "+220" },
];

// ---- VILLES par région (Sénégal) ----
export const CITIES_BY_REGION: Record<string, string[]> = {
  dakar: ["Dakar", "Pikine", "Guédiawaye", "Rufisque", "Bargny", "Diamniadio", "Keur Massar", "Yeumbeul", "Parcelles Assainies", "Ouakam"],
  thies: ["Thiès", "Mbour", "Tivaouane", "Joal-Fadiouth", "Saly", "Khombole", "Pout", "Mékhé"],
  saint_louis: ["Saint-Louis", "Dagana", "Richard-Toll", "Podor", "Ross-Béthio"],
  diourbel: ["Diourbel", "Touba", "Mbacké", "Bambey"],
  louga: ["Louga", "Linguère", "Kébémer", "Dahra"],
  fatick: ["Fatick", "Foundiougne", "Gossas", "Sokone"],
  kaolack: ["Kaolack", "Nioro du Rip", "Guinguinéo", "Kahone"],
  kaffrine: ["Kaffrine", "Birkilane", "Koungheul", "Malem-Hodar"],
  tambacounda: ["Tambacounda", "Bakel", "Goudiry", "Koumpentoum"],
  kedougou: ["Kédougou", "Salémata", "Saraya"],
  kolda: ["Kolda", "Vélingara", "Médina Yoro Foulah"],
  sedhiou: ["Sédhiou", "Bounkiling", "Goudomp"],
  ziguinchor: ["Ziguinchor", "Bignona", "Oussouye", "Cap Skirring"],
  matam: ["Matam", "Kanel", "Ranérou", "Ourossogui"],
};

// ---- ALLERGIES ----
export const ALLERGIES: OptionGroup[] = [
  {
    category: "Courantes",
    options: [
      { value: "medicaments", label: "Médicaments" },
      { value: "aliments", label: "Aliments" },
      { value: "poussiere", label: "Poussière" },
      { value: "pollen", label: "Pollen" },
      { value: "piqures", label: "Piqûres d'insectes" },
      { value: "latex", label: "Latex" },
      { value: "animaux", label: "Poils d'animaux" },
      { value: "aucune", label: "Aucune" },
    ],
  },
];

// ---- MALADIES CHRONIQUES ----
export const CHRONIC_CONDITIONS: OptionGroup[] = [
  {
    category: "Pathologies",
    options: [
      { value: "diabete", label: "Diabète" },
      { value: "hypertension", label: "Hypertension" },
      { value: "asthme", label: "Asthme" },
      { value: "cardiaque", label: "Maladies cardiaques" },
      { value: "renal", label: "Insuffisance rénale" },
      { value: "drepanocytose", label: "Drépanocytose" },
      { value: "vih", label: "VIH" },
      { value: "cancer", label: "Cancer" },
      { value: "thyroide", label: "Troubles de la thyroïde" },
      { value: "epilepsie", label: "Épilepsie" },
      { value: "aucune", label: "Aucune" },
    ],
  },
];

// ---- RELATIONS contact d'urgence ----
export const RELATIONS: { value: string; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "conjoint", label: "Conjoint(e)" },
  { value: "enfant", label: "Enfant" },
  { value: "frere_soeur", label: "Frère / Sœur" },
  { value: "ami", label: "Ami(e)" },
  { value: "autre", label: "Autre" },
];

// ---- MODE de communication préféré ----
export const COMMUNICATION_PREFS: { value: string; label: string }[] = [
  { value: "call", label: "Appel téléphonique" },
  { value: "sms", label: "SMS" },
  { value: "in_app", label: "Notification in-app" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

// ---- GENRE ----
export const GENDERS: { value: string; label: string }[] = [
  { value: "male", label: "Masculin" },
  { value: "female", label: "Féminin" },
  { value: "other", label: "Autre" },
];

// ---- GROUPES SANGUINS ----
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
