import { afterEach, describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit and then blocks with a retry hint", () => {
    const key = `k-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    expect(rateLimit(`a-${Math.random()}`, 1, 60_000).ok).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, 1, 60_000).ok).toBe(true);
  });
});

describe("clientIp", () => {
  const original = process.env.TRUST_PROXY;
  afterEach(() => {
    process.env.TRUST_PROXY = original;
  });

  it("ignores spoofable proxy headers unless TRUST_PROXY=true", () => {
    process.env.TRUST_PROXY = "false";
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "7.7.7.7" }))).toBe("local");
  });

  it("uses the right-most x-forwarded-for hop behind a trusted proxy", () => {
    process.env.TRUST_PROXY = "true";
    // The left-most entry is client-supplied; the right-most is what our proxy observed.
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then a constant", () => {
    process.env.TRUST_PROXY = "true";
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("local");
  });
});

describe("bucket cap", () => {
  it("stays bounded under a flood of unique keys", () => {
    for (let i = 0; i < 6000; i += 1) rateLimit(`flood-${i}`, 1, 60_000);
    // Oldest buckets are evicted, so an early key is allowed again instead of memory growing forever.
    expect(rateLimit("flood-0", 1, 60_000).ok).toBe(true);
  });
});
