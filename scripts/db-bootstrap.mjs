// Rebuild the whole AYMANE database on a Supabase project, from zero.
//
// Applies the 32 migrations in order, each in its own transaction, and reports
// exactly where it stops if anything fails. Safe to re-run: the migrations are
// written with IF NOT EXISTS / CREATE OR REPLACE, and already-applied ones are
// simply re-affirmed.
//
// Usage:
//   node tmp/bootstrap-supabase.mjs "postgresql://postgres.<ref>:<motdepasse>@<host>:5432/postgres"
//
// The connection string is the one shown in the Supabase dashboard under
// Project Settings > Database > Connection string > URI (session pooler).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migDir = path.join(root, "supabase", "migrations");

const connectionString = process.argv[2];
if (!connectionString) {
  console.error("Usage: node tmp/bootstrap-supabase.mjs \"<connection-string>\"");
  console.error("Dashboard Supabase > Project Settings > Database > Connection string > URI");
  process.exit(1);
}

const files = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
console.log(`=== Reconstruction de la base AYMANE — ${files.length} migrations ===\n`);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });

try {
  await client.connect();
  console.log("✅ Connecté\n");
} catch (error) {
  console.error("❌ Connexion impossible :", error.message);
  console.error("   Vérifiez la chaîne de connexion et que le projet est bien actif.");
  process.exit(1);
}

// Keep track of what has been applied, like the Supabase CLI does.
await client.query(`
  CREATE TABLE IF NOT EXISTS public._aymane_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);
const done = new Set(
  (await client.query("SELECT name FROM public._aymane_migrations")).rows.map((r) => r.name),
);

let applied = 0, skipped = 0;
for (const file of files) {
  if (done.has(file)) { skipped++; console.log(`⏭️  déjà appliquée  ${file}`); continue; }

  const sql = readFileSync(path.join(migDir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO public._aymane_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
    await client.query("COMMIT");
    applied++;
    console.log(`✅ appliquée      ${file}`);
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* */ }
    console.error(`\n❌ ÉCHEC sur ${file}`);
    console.error(`   ${error.message}`);
    console.error("\n   Les migrations précédentes restent appliquées.");
    console.error("   Corrigez ce fichier puis relancez : la reprise se fera ici.");
    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Storage buckets are created by the migrations themselves; confirm they exist.
const buckets = await client.query("SELECT id, public FROM storage.buckets ORDER BY id");
console.log(`\n=== Buckets de stockage (${buckets.rowCount}) ===`);
for (const b of buckets.rows) console.log(`  ${b.id} ${b.public ? "(public)" : "(privé)"}`);

const fns = await client.query(`
  SELECT count(*)::int AS n FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
`);
const tables = await client.query(`
  SELECT count(*)::int AS n FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`);

console.log(`\n=== RÉSULTAT ===`);
console.log(`  migrations appliquées : ${applied}`);
console.log(`  déjà en place        : ${skipped}`);
console.log(`  tables               : ${tables.rows[0].n}`);
console.log(`  fonctions            : ${fns.rows[0].n}`);
console.log(`\n🎉 Base reconstruite. Mettez à jour VITE_SUPABASE_URL et`);
console.log(`   VITE_SUPABASE_PUBLISHABLE_KEY dans .env puis dans Vercel.`);

await client.end().catch(() => {});
