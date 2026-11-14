import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Points the app at a throw-away SQLite file and sets the env vars the auth layer needs. */
export function useTempDatabase(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-test-"));
  process.env.DATABASE_FILE = path.join(dir, "test.db");
  process.env.ADMIN_USER = "tester";
  process.env.ADMIN_PASSWORD = "correct-horse-battery";
  process.env.SESSION_SECRET = "k9X2mQp7ZrT4vB8nLc3WfH6yJd1sAu5Eg0";
  process.env.TRUST_PROXY = "true";
  return dir;
}

export function jsonRequest(
  url: string,
  body: unknown,
  init: { method?: string; headers?: Record<string, string> } = {},
): Request {
  return new Request(url, {
    method: init.method ?? "POST",
    headers: { "Content-Type": "application/json", ...init.headers },
    body: JSON.stringify(body),
  });
}
