import { beforeAll, describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/session";
import { useTempDatabase } from "./helpers";

beforeAll(() => {
  useTempDatabase();
});

describe("session tokens", () => {
  it("round-trips an admin username", async () => {
    const token = await signSession("tester");
    expect(await verifySession(token)).toBe("tester");
  });

  it("rejects missing, malformed and tampered tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
    const [header, payload, signature] = (await signSession("tester")).split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ role: "admin", sub: "root" })).toString("base64url");
    expect(await verifySession(`${header}.${forgedPayload}.${signature}`)).toBeNull();
    expect(await verifySession(`${header}.${payload}.`)).toBeNull();
  });

  it("rejects placeholder secrets copied from the example env file", async () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "replace-with-a-long-random-string";
    await expect(signSession("tester")).rejects.toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = original;
  });

  it("fails loudly (not as silent 401) when verifying without a secret", async () => {
    const token = await signSession("tester");
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "";
    await expect(verifySession(token)).rejects.toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = original;
  });

  it("refuses to sign without a strong secret", async () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "short";
    await expect(signSession("tester")).rejects.toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = original;
  });
});
