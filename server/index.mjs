import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openAccountStore } from "./account-store.mjs";
import { createIdentityVerifier, IdentityError } from "./supabase-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.AYMANE_API_PORT ?? "8787", 10);
const host = process.env.AYMANE_API_HOST ?? "127.0.0.1";
const databasePath = path.resolve(root, process.env.AYMANE_DB_PATH ?? "server/data/aymane.sqlite");
const ipHashSecret = process.env.AYMANE_IP_HASH_SECRET ?? process.env.VITE_SUPABASE_PROJECT_ID ?? "aymane-local";
const store = openAccountStore(databasePath);
const verifyIdentity = createIdentityVerifier({
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});
const rateBuckets = new Map();

const securityHeaders = {
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const sendJson = (res, status, body) => {
  res.writeHead(status, { ...securityHeaders, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

const getClientIp = (req) => {
  const forwarded = req.headers["cf-connecting-ip"] ?? req.headers["x-forwarded-for"];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.socket.remoteAddress ?? "unknown")
    .split(",")[0]
    .trim();
};

const hashIp = (ip) => crypto.createHmac("sha256", ipHashSecret).update(ip).digest("hex");

const allowRequest = (key) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= 60;
};

const readJson = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new IdentityError(413, "Request is too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new IdentityError(400, "Invalid JSON request");
  }
};

const getBearerToken = (req) => {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
};

const welcomeMessage = (account, eventType) => {
  const firstName = account.fullName?.split(/\s+/)[0];
  const name = firstName ? `, ${firstName}` : "";
  if (eventType === "signup") return `Bienvenue chez AYMANE${name}. Votre espace santé est prêt.`;
  if (eventType === "signin") return `Bon retour${name}. Heureux de vous retrouver.`;
  return null;
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const requestId = crypto.randomUUID();

  try {
    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
      sendJson(res, 200, { ok: store.health() });
      return;
    }

    if (!["/api/account/sync", "/api/account/me"].includes(requestUrl.pathname)) {
      sendJson(res, 404, { error: "Not found", requestId });
      return;
    }

    const clientIp = getClientIp(req);
    const ipHash = hashIp(clientIp);
    if (!allowRequest(ipHash)) {
      sendJson(res, 429, { error: "Too many requests", requestId });
      return;
    }

    const user = await verifyIdentity(getBearerToken(req));

    if (req.method === "GET" && requestUrl.pathname === "/api/account/me") {
      const account = store.getAccount(user.id) ?? store.syncAccount(user);
      sendJson(res, 200, { account });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/account/sync") {
      const body = await readJson(req);
      const eventType = ["signup", "signin", "session"].includes(body.eventType)
        ? body.eventType
        : "session";
      const account = store.syncAccount(user, eventType, {
        ipHash,
        userAgent: req.headers["user-agent"],
      });
      sendJson(res, 200, { account, welcomeMessage: welcomeMessage(account, eventType) });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed", requestId });
  } catch (error) {
    const status = error instanceof IdentityError ? error.status : 500;
    if (status >= 500) console.error(`[${requestId}]`, error);
    sendJson(res, status, {
      error: status >= 500 ? "Service temporarily unavailable" : error.message,
      requestId,
    });
  }
});

server.listen(port, host, () => {
  console.log(`AYMANE account service listening on http://${host}:${port}`);
});

const shutdown = () => {
  server.close(() => {
    store.close();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
