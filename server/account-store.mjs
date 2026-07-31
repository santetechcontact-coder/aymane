import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROLES = new Set([
  "patient",
  "doctor",
  "pharmacist",
  "admin",
  "application_reviewer",
  "hospital",
  "clinic",
  "dentist",
  "nurse",
  "midwife",
  "lab_technician",
  "other_provider",
]);

const normalizeRole = (user) => {
  const declared = user?.app_metadata?.role;
  return ROLES.has(declared) ? declared : "patient";
};

const publicAccount = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  emailVerified: Boolean(row.email_verified),
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
  loginCount: row.login_count,
});

export const openAccountStore = (filename) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'patient',
      email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_login_at TEXT,
      login_count INTEGER NOT NULL DEFAULT 0 CHECK (login_count >= 0)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS account_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'signin')),
      ip_hash TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS account_events_account_created_idx
      ON account_events(account_id, created_at DESC);
  `);

  const findAccount = db.prepare("SELECT * FROM accounts WHERE id = ?");
  const upsertAccount = db.prepare(`
    INSERT INTO accounts (
      id, email, full_name, role, email_verified, created_at, updated_at, last_seen_at
    ) VALUES (
      @id, @email, @fullName, @role, @emailVerified, @createdAt, @now, @now
    )
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      full_name = COALESCE(excluded.full_name, accounts.full_name),
      role = excluded.role,
      email_verified = excluded.email_verified,
      updated_at = excluded.updated_at,
      last_seen_at = excluded.last_seen_at
  `);
  const recordEvent = db.prepare(`
    INSERT INTO account_events (account_id, event_type, ip_hash, user_agent, created_at)
    VALUES (@accountId, @eventType, @ipHash, @userAgent, @now)
  `);
  const markLogin = db.prepare(`
    UPDATE accounts
    SET last_login_at = @now, login_count = login_count + 1, updated_at = @now
    WHERE id = @accountId
  `);

  const syncTransaction = db.transaction((user, eventType, context) => {
    const now = new Date().toISOString();
    const createdAt = user.created_at && !Number.isNaN(Date.parse(user.created_at))
      ? new Date(user.created_at).toISOString()
      : now;
    const fullName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim().slice(0, 120) || null
      : null;

    upsertAccount.run({
      id: user.id,
      email: user.email.trim().toLowerCase(),
      fullName,
      role: normalizeRole(user),
      emailVerified: user.email_confirmed_at ? 1 : 0,
      createdAt,
      now,
    });

    if (eventType === "signup" || eventType === "signin") {
      recordEvent.run({
        accountId: user.id,
        eventType,
        ipHash: context.ipHash ?? null,
        userAgent: context.userAgent?.slice(0, 300) ?? null,
        now,
      });
      if (eventType === "signin") markLogin.run({ accountId: user.id, now });
    }

    return publicAccount(findAccount.get(user.id));
  });

  return {
    syncAccount(user, eventType = "session", context = {}) {
      if (!user?.id || !user?.email) throw new Error("Verified user is incomplete");
      return syncTransaction(user, eventType, context);
    },
    getAccount(id) {
      const row = findAccount.get(id);
      return row ? publicAccount(row) : null;
    },
    getEventCount(id) {
      return db.prepare("SELECT COUNT(*) AS count FROM account_events WHERE account_id = ?").get(id).count;
    },
    health() {
      return db.pragma("quick_check", { simple: true }) === "ok";
    },
    close() {
      db.close();
    },
  };
};
