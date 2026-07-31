import { copyFile, mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "dist");
const clientDirectory = resolve(outputDirectory, "client");
const serverDirectory = resolve(outputDirectory, "server");
const metadataDirectory = resolve(outputDirectory, ".openai");

await mkdir(clientDirectory, { recursive: true });

for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
  if (["client", "server", ".openai"].includes(entry.name)) continue;
  await rename(resolve(outputDirectory, entry.name), resolve(clientDirectory, entry.name));
}

await mkdir(serverDirectory, { recursive: true });
await mkdir(metadataDirectory, { recursive: true });
await copyFile(resolve(root, "server", "sites-worker.mjs"), resolve(serverDirectory, "index.js"));
await copyFile(resolve(root, ".openai", "hosting.json"), resolve(metadataDirectory, "hosting.json"));

await writeFile(
  resolve(clientDirectory, ".assetsignore"),
  "wrangler.json\n.dev.vars\n",
);
await writeFile(
  resolve(clientDirectory, "_headers"),
  "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n",
);
await writeFile(
  resolve(serverDirectory, "wrangler.json"),
  `${JSON.stringify({
    name: "aymane-sante-senegal",
    compatibility_date: "2026-05-15",
    compatibility_flags: ["nodejs_compat"],
    main: "index.js",
    no_bundle: true,
    rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
    assets: { directory: "../client" },
    observability: { enabled: true },
  })}\n`,
);
