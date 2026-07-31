import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetDirectory = resolve(root, "dist", "server");

await mkdir(targetDirectory, { recursive: true });
await copyFile(resolve(root, "server", "sites-worker.mjs"), resolve(targetDirectory, "index.js"));
