// Assemble les migrations en quelques blocs a coller dans le SQL Editor du
// dashboard Supabase, pour installer le schema sans partager le mot de passe
// de la base.
//
//   npm run db:bundle
//
// Postgres refuse d'utiliser une valeur d'enum ajoutee dans la meme
// transaction, et le SQL Editor execute chaque bloc comme une transaction
// implicite : une migration qui etend un type est donc isolee dans son propre
// bloc, et les suivantes repartent dans un bloc neuf.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migDir = path.join(root, "supabase", "migrations");
const outDir = path.join(root, "tmp", "schema-a-coller");
mkdirSync(outDir, { recursive: true });

const files = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const extendsEnum = (sql) => /ALTER\s+TYPE[\s\S]*?ADD\s+VALUE/i.test(sql);

const parts = [];
let current = [];
for (const file of files) {
  const sql = readFileSync(path.join(migDir, file), "utf8");
  if (extendsEnum(sql)) {
    if (current.length) { parts.push(current); current = []; }
    parts.push([{ file, sql }]);          // isole
  } else {
    current.push({ file, sql });
  }
}
if (current.length) parts.push(current);

parts.forEach((part, index) => {
  const n = String(index + 1).padStart(2, "0");
  const body = part.map(({ file, sql }) =>
    `-- ===== ${file} =====\n${sql.trimEnd()}\n`).join("\n");
  const header = [
    `-- AYMANE — schema, bloc ${index + 1} / ${parts.length}`,
    `-- ${part.length} migration(s) : ${part.map((p) => p.file).join(", ")}`,
    "-- A coller dans Dashboard > SQL Editor, puis Run. Respecter l'ordre des blocs.",
    "", "",
  ].join("\n");
  const target = path.join(outDir, `bloc-${n}.sql`);
  writeFileSync(target, header + body, "utf8");
  console.log(`bloc ${n} — ${String(part.length).padStart(2)} migration(s), ${Math.round((header + body).length / 1024)} Ko`);
});

console.log(`\n${parts.length} blocs ecrits dans ${outDir}`);
console.log("Collez-les dans le SQL Editor dans l'ordre, un par un.");
