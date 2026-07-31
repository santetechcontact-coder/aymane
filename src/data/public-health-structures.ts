export type DirectoryStructureSource = "aymane_partner" | "public_reference";

export type DirectoryStructure = {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  address: string;
  phone_landline: string;
  phone_mobile: string;
  email: string;
  logo_url: string | null;
  description: string | null;
  source: DirectoryStructureSource;
  source_name: string;
  source_url: string;
};

type PublicStructureRow = readonly [name: string, type: string, city?: string];

const PUBLIC_STRUCTURE_ROWS: readonly PublicStructureRow[] = [
  ["Pharmacie de l'Aeroport", "pharmacy", "Yoff"],
  ["Pharmacie Mouhamadou El Hamid Almadies", "pharmacy", "Almadies"],
  ["Pharmacie As Salihou", "pharmacy"],
  ["Pharmacie Baye Issa", "pharmacy"],
  ["Clinique Alhamdoulilah", "clinic"],
  ["Clinique KOTI", "clinic"],
  ["Clinique Maryam", "clinic"],
  ["Clinique Maimouna Toure (CMT)", "clinic"],
  ["Institut d'Hygiene Sociale - Polyclinique", "hospital", "Dakar-Plateau"],
  ["Hopital Youssou Mbargane Diop", "hospital", "Rufisque"],
  ["Hopital Roi Baudouin", "hospital", "Guediawaye"],
  ["Hopital psychiatrique de Thiaroye", "hospital", "Thiaroye"],
  ["Hopital Principal de Dakar", "hospital", "Dakar-Plateau"],
  ["Hopital Militaire de Ouakam", "hospital", "Ouakam"],
  ["Hopital Masroor", "hospital"],
  ["Hopital Idrissa Pouye", "hospital", "Grand-Yoff"],
  ["Hopital d'Enfants de Diamniadio", "hospital", "Diamniadio"],
  ["Hopital de Pikine", "hospital", "Pikine"],
  ["Hopital Dalal Jamm", "hospital", "Guediawaye"],
  ["Hopital Aristide Le Dantec", "hospital", "Dakar-Plateau"],
  ["Centre hospitalier universitaire de Fann", "hospital", "Fann"],
  ["Centre hospitalier Abass Ndao", "hospital", "Dakar"],
  ["Centre de traitement ambulatoire du CHNU de Fann", "hospital", "Fann"],
  ["CS Wahinane Guediawaye", "health_center", "Guediawaye"],
  ["CS Tivaouane Peulh", "health_center", "Tivaouane Peulh"],
  ["CS Sheikh Khalifa Bin Hamad Al Thiani (CS Yeumbeul)", "health_center", "Yeumbeul"],
  ["CS Seydina Issa Rohou Lahi (CS Camberene)", "health_center", "Camberene"],
  ["CS Sangalkam", "health_center", "Sangalkam"],
  ["CS SAMU municipal", "health_center", "Dakar"],
  ["CS Rufisque Polyclinique", "health_center", "Rufisque"],
  ["CS Plateau", "health_center", "Dakar-Plateau"],
  ["CS Philippe Maguilen Senghor", "health_center", "Yoff"],
  ["CS Ouakam", "health_center", "Ouakam"],
  ["CS Ndiaye Diouf (CS Bargny)", "health_center", "Bargny"],
  ["CS Nabil Choucair", "health_center", "Dakar"],
  ["CS Mutuelle de Rufisque", "health_center", "Rufisque"],
  ["CS maternel et infantile", "health_center", "Dakar"],
  ["CS Mamadou Diop (CS Liberte 6)", "health_center", "Liberte 6"],
  ["CS Le Technopole", "health_center", "Pikine"],
  ["CS Khadimoul Rassoul (CS Mbao)", "health_center", "Mbao"],
  ["CS Keur Massar", "health_center", "Keur Massar"],
  ["CS HLM", "health_center", "HLM"],
  ["CS Hann-sur-Mer", "health_center", "Hann"],
  ["CS Hann Maristes", "health_center", "Hann"],
  ["CS Grand Dakar", "health_center", "Grand Dakar"],
  ["CS Golf Sud", "health_center", "Guediawaye"],
  ["CS Gaspard Camara", "health_center", "Dakar"],
  ["CS Fondation Elizabeth Diouf", "health_center", "Dakar"],
  ["CS Elisabeth Diouf", "health_center", "Dakar"],
  ["CS du district sanitaire de Yeumbeul", "health_center", "Yeumbeul"],
  ["CS du district sanitaire de Guediawaye", "health_center", "Guediawaye"],
  ["CS Diogali Mousse Samb (CS Ngor)", "health_center", "Ngor"],
  ["CS Diamniadio", "health_center", "Diamniadio"],
  ["CS communautaire Awa Marie Coll Seck", "health_center", "Dakar"],
  ["CS Colobane", "health_center", "Colobane"],
  ["CS Cheikh A. Bamba (PMI Medina)", "health_center", "Medina"],
  ["CS Baye Talla Diop", "health_center", "Dakar"],
  ["CS Aristide Mensah", "health_center", "Dakar"],
  ["CS Annette Mbaye d'Erneville", "health_center", "Ouakam"],
  ["CS Abdou Aziz Sy Dabakh", "health_center", "Dakar"],
  ["Centre national de transfusion sanguine", "health_center", "Fann"],
  ["Centre national d'appareillage orthopedique", "health_center", "Dakar"],
  ["Centre medical Ademis", "health_center", "Dakar"],
  ["Centre international de cancerologie", "health_center", "Dakar"],
  ["Centre d'hemodialyse de Dakar", "health_center", "Dakar"],
  ["Centre de geriatrie et de gerontologie", "health_center", "Dakar"],
  ["Centre de sante de Bopp", "health_center", "Bopp"],
  ["Centre antidiabete Marc Sankale", "health_center", "Dakar"],
  ["PS Yoff Tonghor", "other", "Yoff"],
  ["PS Yoff Ndenatte", "other", "Yoff"],
  ["PS Yeumbeul Nord", "other", "Yeumbeul"],
  ["PS Yeumbeul Diamalaye", "other", "Yeumbeul"],
  ["PS Yene", "other", "Yene"],
  ["PS Yeba", "other", "Dakar"],
  ["PS Wayambam", "other", "Dakar"],
  ["PS Touba Diacksao", "other", "Thiaroye"],
  ["PS Tonghor", "other", "Yoff"],
  ["PS Tivaouane Peulh", "other", "Tivaouane Peulh"],
  ["PS Thiawlene", "other", "Rufisque"],
  ["PS Thiaroye-sur-Mer", "other", "Thiaroye"],
  ["PS Thiaroye Minam", "other", "Thiaroye"],
  ["PS Thiaroye Gare", "other", "Thiaroye"],
  ["PS Thiaroye Azur", "other", "Thiaroye"],
  ["PS Tawfekh", "other", "Dakar"],
  ["PS Sonatel Malika", "other", "Malika"],
  ["PS Sokhna Safietou Laye Niang (Yeumbeul Sud)", "other", "Yeumbeul"],
  ["PS Serigne Saliou Mbacke (Darou Rahmane 2)", "other", "Dakar"],
  ["PS Sendou", "other", "Sendou"],
  ["PS Seby Ponty", "other", "Sebikotane"],
  ["PS Sebikotane", "other", "Sebikotane"],
  ["PS Sant Yalla", "other", "Dakar"],
  ["PS Sandial", "other", "Dakar"],
  ["PS Sam Sam 3", "other", "Guediawaye"],
  ["PS Raffenel", "other", "Dakar"],
  ["PS du Port", "other", "Dakar-Plateau"],
  ["PS Petit Mbao", "other", "Mbao"],
  ["PS Pepiniere", "other", "Dakar"],
  ["PS Omar Mbassou Niang U16", "other", "Dakar"],
  ["PS Norade", "other", "Dakar"],
  ["PS Toubab Dialaw", "other", "Toubab Dialaw"],
  ["PS Unite 22", "other", "Guediawaye"],
  ["PS Unite 26", "other", "Guediawaye"],
  ["PS Unite 4", "other", "Guediawaye"],
  ["PS Unite 8", "other", "Guediawaye"],
  ["PS Unite 9", "other", "Guediawaye"],
  ["PS Nimzatt", "other", "Guediawaye"],
  ["PS Nianghal", "other", "Dakar"],
  ["PS Niague", "other", "Niague"],
  ["PS Niacoul Rab", "other", "Rufisque"],
  ["PS Nguinaw Rail Sud", "other", "Pikine"],
] as const;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

export const publicHealthStructures: DirectoryStructure[] = PUBLIC_STRUCTURE_ROWS.map(([name, type, city], index) => ({
  id: `public-santemap-dakar-${String(index + 1).padStart(3, "0")}`,
  name,
  type,
  city: city ?? "Dakar",
  region: "Dakar",
  address: city && city !== "Dakar" ? `${city}, region de Dakar` : "Region de Dakar",
  phone_landline: "",
  phone_mobile: "",
  email: "",
  logo_url: null,
  description: "Structure repertoriee publiquement. Confirmez les coordonnees et horaires avant de vous deplacer.",
  source: "public_reference",
  source_name: "SanteMap",
  source_url: "https://santemap.com/",
}));

export const mergeDirectoryStructures = (
  partnerStructures: DirectoryStructure[],
  publicStructures = publicHealthStructures,
) => {
  const merged = new Map<string, DirectoryStructure>();

  for (const structure of [...partnerStructures, ...publicStructures]) {
    const key = normalize(`${structure.name}|${structure.city}`);
    if (!merged.has(key)) merged.set(key, structure);
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source === "aymane_partner" ? -1 : 1;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
};

export const matchesDirectorySearch = (structure: DirectoryStructure, query: string) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const typeAliases: Record<string, string> = {
    hospital: "hopital chu urgences",
    clinic: "clinique",
    medical_office: "cabinet medical",
    dental_office: "cabinet dentaire dentiste",
    lab: "laboratoire analyses",
    pharmacy: "pharmacie medicaments",
    health_center: "centre de sante cs",
    other: "poste de sante ps",
  };
  const searchable = normalize(
    `${structure.name} ${structure.type} ${typeAliases[structure.type] ?? ""} ${structure.city} ${structure.region} ${structure.address}`,
  );

  return normalizedQuery.split(" ").every((token) => searchable.includes(token));
};

export const structureDirectionsUrl = (structure: DirectoryStructure) => {
  const destination = `${structure.name}, ${structure.city}, Senegal`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};
