import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { openAccountStore } from "./account-store.mjs";

const user = {
  id: "4abfc5d7-5094-4bf7-84ba-a8140d28ba0f",
  email: "aissatou@example.sn",
  email_confirmed_at: "2026-07-17T10:00:00.000Z",
  created_at: "2026-07-17T09:00:00.000Z",
  app_metadata: {},
  user_metadata: { full_name: "Aissatou Diallo" },
};

test("account data and login history survive a database restart", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aymane-account-"));
  const filename = path.join(directory, "accounts.sqlite");

  const firstStore = openAccountStore(filename);
  const created = firstStore.syncAccount(user, "signup", { ipHash: "one" });
  firstStore.syncAccount(user, "signin", { ipHash: "two" });
  assert.equal(created.fullName, "Aissatou Diallo");
  assert.equal(firstStore.getEventCount(user.id), 2);
  firstStore.close();

  const reopenedStore = openAccountStore(filename);
  const persisted = reopenedStore.getAccount(user.id);
  assert.equal(persisted.email, "aissatou@example.sn");
  assert.equal(persisted.loginCount, 1);
  assert.equal(reopenedStore.getEventCount(user.id), 2);
  assert.equal(reopenedStore.health(), true);
  reopenedStore.close();

  fs.rmSync(directory, { recursive: true, force: true });
});
