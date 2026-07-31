import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const children = [
  spawn(process.execPath, ["--env-file-if-exists=.env", "server/index.mjs"], { stdio: "inherit" }),
  spawn(npmCommand, ["run", "dev", "--", "--host", "0.0.0.0", "--port", "4173"], {
    stdio: "inherit",
    shell: isWindows,
  }),
];

let stopping = false;
const stop = (exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(exitCode), 250);
};

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code) stop(code);
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
