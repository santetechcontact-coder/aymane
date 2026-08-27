// Is the AYMANE backend actually reachable, and does it still hold what the app
// needs? Run this first whenever "nothing works" — it separates a platform
// outage from an application bug, in plain French.
//
//   npm run db:health
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lookup } from "node:dns/promises";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readEnvFile = (file) => {
  try {
    return Object.fromEntries(
      readFileSync(path.join(root, file), "utf8")
        .split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
    );
  } catch { return {}; }
};

const env = { ...readEnvFile(".env"), ...process.env };
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("=== État du backend AYMANE ===\n");

if (!URL_ || !KEY) {
  console.log("❌ VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY manquant dans .env");
  process.exit(1);
}

const host = new URL(URL_).hostname;
console.log(`  projet : ${host}\n`);

// 1. Le nom de domaine existe-t-il encore ?
let resolves = true;
try {
  await lookup(host);
  console.log("✅ DNS          le domaine résout");
} catch {
  resolves = false;
  console.log("❌ DNS          domaine introuvable");
}

if (!resolves) {
  console.log("\n=== DIAGNOSTIC ===");
  console.log("Le projet Supabase n'existe plus, ou il est en pause.");
  console.log("Aucune fonctionnalité ne peut marcher tant qu'il n'est pas réactivé :");
  console.log("ni connexion, ni inscription, ni dépôt de document, ni aucune donnée.");
  console.log("\nÀ FAIRE :");
  console.log("  1. Ouvrir https://supabase.com/dashboard");
  console.log(`  2. Retrouver le projet ${host.split(".")[0]}`);
  console.log("  3. S'il est en pause → Restore. S'il est supprimé → créer un projet neuf,");
  console.log("     puis : node scripts/db-bootstrap.mjs \"<connection-string>\"");
  console.log("  4. Mettre à jour .env ET les variables Vercel avec la nouvelle URL et la clé");
  process.exit(1);
}

// 2. L'API répond-elle ?
const timeout = (ms) => new Promise((_, r) => setTimeout(() => r(new Error("délai dépassé")), ms));
const probe = async (label, url, init) => {
  try {
    const res = await Promise.race([fetch(url, init), timeout(15000)]);
    return res;
  } catch (error) {
    console.log(`❌ ${label.padEnd(13)}injoignable (${error.message})`);
    return null;
  }
};

const H = { apikey: KEY, authorization: `Bearer ${KEY}` };

const auth = await probe("Auth", `${URL_}/auth/v1/settings`, { headers: H });
let confirmRequired = null;
if (auth?.ok) {
  const settings = await auth.json();
  confirmRequired = !settings.mailer_autoconfirm;
  console.log(`✅ Auth         opérationnel`);
} else if (auth) {
  console.log(`❌ Auth         HTTP ${auth.status}`);
}

const rest = await probe("REST", `${URL_}/rest/v1/profiles?select=id&limit=1`, { headers: H });
if (rest) console.log(`${rest.status < 500 ? "✅" : "❌"} REST         HTTP ${rest.status}`);

const storage = await probe("Storage", `${URL_}/storage/v1/object/list/provider-documents`, {
  method: "POST", headers: { ...H, "content-type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 1 }),
});
if (storage) console.log(`${storage.status < 500 ? "✅" : "❌"} Storage      HTTP ${storage.status}`);

// 3. Le sous-système documentaire est-il déployé ?
const doc = await probe("Documents", `${URL_}/rest/v1/rpc/register_provider_document`, {
  method: "POST", headers: { ...H, "content-type": "application/json" }, body: "{}",
});
let docDeployed = false;
if (doc) {
  const body = await doc.json().catch(() => ({}));
  docDeployed = body?.code !== "PGRST202";
  console.log(`${docDeployed ? "✅" : "⚠️ "} Documents    ${docDeployed ? "sous-système déployé" : "migration non appliquée"}`);
}

console.log("\n=== CE QUI RESTE À FAIRE ===");
let clean = true;
if (confirmRequired) {
  clean = false;
  console.log("⚠️  La confirmation par email est exigée : un professionnel n'a pas de session");
  console.log("    juste après son inscription, donc il ne peut pas déposer ses pièces dans la");
  console.log("    foulée. Dashboard > Authentication > Sign In / Providers > Email >");
  console.log("    décocher « Confirm email ».");
}
if (!docDeployed) {
  clean = false;
  console.log("⚠️  Le sous-système documentaire n'est pas déployé : les dépôts fonctionnent");
  console.log("    mais sans métadonnées. Appliquer");
  console.log("    supabase/migrations/20260801120000_provider_document_subsystem.sql");
  console.log("    (SQL Editor du dashboard, ou node scripts/db-bootstrap.mjs \"<uri>\").");
}
if (clean) console.log("🎉 Rien — tout est en place.");
