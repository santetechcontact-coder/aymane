// Audit every endpoint the frontend calls, against the REAL production project,
// using only the public anon key.
//
// LESSON LEARNED: PostgREST resolves RPCs by ARGUMENT SIGNATURE. Probing with an
// empty body makes every function that has required parameters look "missing"
// (PGRST202), and `hint` is not always populated. So we parse each function's
// real signature out of the migrations and call it with correctly-named dummy
// arguments. Only then does PGRST202 actually mean "does not exist".
//
// Expected healthy outcomes per RPC:
//   42501 permission denied  -> exists, anon correctly refused (SECURE)
//   P0001 / business error   -> exists and executed
//   200                      -> exists and executed
//   PGRST202                 -> genuinely MISSING
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env"), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const H = { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" };

// ---- 1. Which RPCs does the frontend actually call? ----
const srcDir = path.join(root, "src");
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const srcFiles = walk(srcDir).filter((f) => /\.(ts|tsx)$/.test(f));
const called = new Set();
for (const f of srcFiles) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/\.rpc\(\s*"([a-z_0-9]+)"/g)) called.add(m[1]);
}

// ---- 2. Parse real signatures from migrations (last definition wins) ----
const migDir = path.join(root, "supabase", "migrations");
const sigs = new Map();
for (const f of readdirSync(migDir).sort()) {
  const sql = readFileSync(path.join(migDir, f), "utf8");
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.([a-z_0-9]+)\s*\(([\s\S]*?)\)\s*\n\s*RETURNS/gi)) {
    sigs.set(m[1], m[2]);
  }
}

const dummy = (type) => {
  const t = type.toLowerCase();
  if (t.includes("uuid")) return "00000000-0000-0000-0000-000000000000";
  if (t.includes("[]")) return [];
  if (t.includes("jsonb") || t.includes("json")) return {};
  if (t.includes("bool")) return false;
  if (t.includes("int") || t.includes("numeric") || t.includes("decimal")) return 0;
  if (t.includes("timestamptz") || t.includes("timestamp")) return "2026-01-01T00:00:00Z";
  if (t.includes("date")) return "2026-01-01";
  return "x";
};

const buildArgs = (raw) => {
  const body = {};
  if (!raw || !raw.trim()) return body;
  // split top-level commas only
  const parts = []; let depth = 0, cur = "";
  for (const ch of raw) {
    if (ch === "(") depth++; if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  for (const p of parts) {
    const clean = p.replace(/DEFAULT[\s\S]*$/i, "").trim();
    const m = clean.match(/^(_[a-z_0-9]+)\s+(.+)$/i);
    if (m) body[m[1]] = dummy(m[2]);
  }
  return body;
};

const missing = [], secure = [], executed = [], unknown = [];

console.log("=== AUDIT ENDPOINTS — production (signatures réelles) ===\n");
console.log("--- RPC appelées par le site ---");
for (const fn of [...called].sort()) {
  const raw = sigs.get(fn);
  const args = buildArgs(raw ?? "");
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
  let b = {}; try { b = await r.json(); } catch { /* */ }
  const code = b?.code ?? "";
  let icon, label;
  if (code === "PGRST202") { icon = "❌"; label = "ABSENTE de la production"; missing.push(fn); }
  else if (code === "42501") { icon = "🔒"; label = "existe · anon refusé (sécurisé)"; secure.push(fn); }
  else if (r.ok || code === "P0001" || code === "22P02" || code === "PGRST116") { icon = "✅"; label = `existe · exécutée (HTTP ${r.status}${code ? " " + code : ""})`; executed.push(fn); }
  else { icon = "✅"; label = `existe (HTTP ${r.status}${code ? " " + code : ""})`; unknown.push(fn); }
  console.log(`  ${icon} ${fn.padEnd(48)} ${label}`);
}

// ---- 3. Edge function ----
console.log("\n--- Edge function ---");
const ef = await fetch(`${URL_}/functions/v1/symptom-triage`, {
  method: "POST", headers: H, body: JSON.stringify({ symptoms: "fievre", age: 30 }),
});
let efBody = ""; try { efBody = (await ef.text()).slice(0, 120); } catch { /* */ }
const efMissing = ef.status === 404;
console.log(`  ${efMissing ? "❌" : "✅"} symptom-triage${" ".repeat(35)}HTTP ${ef.status} ${efBody.replace(/\s+/g, " ")}`);

// ---- 4. HTTP /api endpoints (Vercel) ----
console.log("\n--- Endpoints HTTP /api (hébergement Vercel) ---");
for (const [method, p] of [["GET", "/api/health"], ["POST", "/api/account/sync"], ["GET", "/api/account/me"]]) {
  const r = await fetch(`https://aymane-sante.vercel.app${p}`, {
    method, headers: { "content-type": "application/json" },
    body: method === "POST" ? "{}" : undefined,
  });
  const ct = r.headers.get("content-type") ?? "";
  const isHtml = ct.includes("text/html");
  console.log(`  ${isHtml || r.status === 405 ? "❌" : "✅"} ${method} ${p.padEnd(42)} HTTP ${r.status} ${isHtml ? "→ renvoie le HTML du SPA (endpoint inexistant)" : ct}`);
}

console.log("\n=== SYNTHÈSE ===");
console.log(`RPC : ${called.size} appelées — ${executed.length} exécutées, ${secure.length} sécurisées (anon refusé), ${unknown.length} autres, ${missing.length} absentes`);
if (missing.length) { console.log("❌ ABSENTES :"); missing.forEach((m) => console.log("   - " + m)); }
else console.log("✅ Aucune RPC manquante : toutes les fonctions appelées existent en production.");
console.log(`Edge function symptom-triage : ${efMissing ? "❌ NON DÉPLOYÉE" : "✅ déployée"}`);
