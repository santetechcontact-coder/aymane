// Enregistre la cle publique Supabase dans .env, puis verifie immediatement que
// le projet repond. La cle reste sur votre machine : elle ne transite nulle part.
//
//   npm run db:setkey "<cle-anon>" [url-du-projet]
//
// Cle : Dashboard > Project Settings > API Keys > anon / public
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

const key = (process.argv[2] ?? "").trim();
let url = (process.argv[3] ?? "").trim();

if (!key) {
  console.error("Usage : npm run db:setkey \"<cle-anon>\" [url]");
  console.error("Dashboard Supabase > Project Settings > API Keys > anon / public");
  process.exit(1);
}
if (key.startsWith("sb_secret") || key.startsWith("service_role")) {
  console.error("❌ Ceci est une cle SECRETE (service_role). Elle ne doit jamais partir dans le navigateur.");
  console.error("   Prenez la cle « anon / public ».");
  process.exit(1);
}

// Conserve l'URL deja presente si aucune n'est fournie.
const previous = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (!url) url = (previous.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] ?? "").trim();
if (!url) { console.error("❌ Aucune URL de projet : passez-la en second argument."); process.exit(1); }

const ref = new URL(url).hostname.split(".")[0];

if (previous) copyFileSync(envPath, `${envPath}.backup-${Date.now()}`);
writeFileSync(envPath, [
  `# Projet Supabase actif : ${ref}`,
  `VITE_SUPABASE_PROJECT_ID=${ref}`,
  `VITE_SUPABASE_URL=${url}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${key}`,
  "",
].join("\n"), "utf8");
console.log(`✅ .env enregistre (projet ${ref})\n`);

const H = { apikey: key, authorization: `Bearer ${key}` };
const check = async (label, path_, init) => {
  try {
    const res = await fetch(`${url}${path_}`, { ...init, headers: { ...H, ...(init?.headers ?? {}) } });
    const ok = res.status < 400 || res.status === 401 || res.status === 404;
    console.log(`${res.status === 401 ? "❌" : "✅"} ${label.padEnd(12)} HTTP ${res.status}`);
    return res;
  } catch (error) {
    console.log(`❌ ${label.padEnd(12)} injoignable (${error.message})`);
    return null;
  }
};

console.log("=== Verification ===");
const auth = await check("Auth", "/auth/v1/settings");
const rest = await check("REST", "/rest/v1/profiles?select=id&limit=1");

if (auth?.status === 401 || rest?.status === 401) {
  console.log("\n❌ La cle est refusee. Verifiez que vous avez copie la cle « anon / public »");
  console.log("   du projet " + ref + " (et non celle d'un autre projet).");
  process.exit(1);
}

if (auth?.ok) {
  const settings = await auth.json();
  if (!settings.mailer_autoconfirm) {
    console.log("\n⚠️  La confirmation par email est exigee : un professionnel n'aura pas de");
    console.log("    session juste apres son inscription et ne pourra pas deposer ses pieces.");
    console.log("    Dashboard > Authentication > Sign In / Providers > Email > decocher « Confirm email ».");
  }
}

const rpc = await fetch(`${url}/rest/v1/rpc/register_provider_document`, {
  method: "POST", headers: { ...H, "content-type": "application/json" }, body: "{}",
}).then((r) => r.json()).catch(() => ({}));

console.log("\n=== Schema ===");
if (rpc?.code === "PGRST202") {
  console.log("⚠️  La base est vide : les migrations restent a appliquer.");
  console.log("    npm run db:bootstrap \"<connection-string>\"");
  console.log("    (Dashboard > Project Settings > Database > Connection string > URI)");
} else {
  console.log("✅ Le schema est en place.");
}
console.log("\nEnsuite : npm run db:health");
