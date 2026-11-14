import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { signSession } from "@/lib/session";
import { useTempDatabase } from "./helpers";

let leadsRoute: typeof import("@/app/api/leads/route");
let resourceRoute: typeof import("@/app/api/admin/[resource]/route");
let resourceIdRoute: typeof import("@/app/api/admin/[resource]/[id]/route");
let loginRoute: typeof import("@/app/api/auth/login/route");
let cookie = "";

const BASE = "http://localhost:3000";

function post(url: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  useTempDatabase();
  cookie = `orbit_admin=${await signSession("tester")}`;
  leadsRoute = await import("@/app/api/leads/route");
  resourceRoute = await import("@/app/api/admin/[resource]/route");
  resourceIdRoute = await import("@/app/api/admin/[resource]/[id]/route");
  loginRoute = await import("@/app/api/auth/login/route");
});

const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

describe("POST /api/leads", () => {
  const body = { name: "Алишер", contact: "+998 90 123 45 67", message: "Hi", locale: "uz" };

  it("creates a lead", async () => {
    const response = await leadsRoute.POST(post("/api/leads", body, { "x-forwarded-for": "10.0.0.1" }));
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeGreaterThan(0);
  });

  it("returns field errors for invalid input", async () => {
    const response = await leadsRoute.POST(post("/api/leads", { ...body, name: "A", contact: "x" }, { "x-forwarded-for": "10.0.0.2" }));
    expect(response.status).toBe(422);
    const json = await response.json();
    expect(Object.keys(json.fields)).toEqual(expect.arrayContaining(["name", "contact"]));
  });

  it("silently accepts but does not store honeypot submissions", async () => {
    const response = await leadsRoute.POST(post("/api/leads", { ...body, website: "http://spam" }, { "x-forwarded-for": "10.0.0.3" }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.id).toBe(0);
  });

  it("rejects cross-origin posts", async () => {
    const response = await leadsRoute.POST(post("/api/leads", body, { origin: "https://evil.example", host: "localhost:3000", "x-forwarded-for": "10.0.0.4" }));
    expect(response.status).toBe(403);
  });

  it("rejects oversized bodies without crashing", async () => {
    const huge = { ...body, message: "x".repeat(100_000) };
    const response = await leadsRoute.POST(post("/api/leads", huge, { "x-forwarded-for": "10.0.0.5" }));
    expect(response.status).toBe(422);
  });

  it("rejects cross-site fetches flagged by the browser", async () => {
    const response = await leadsRoute.POST(post("/api/leads", body, { "sec-fetch-site": "cross-site", "x-forwarded-for": "10.0.0.6" }));
    expect(response.status).toBe(403);
  });

  it("ignores a forged course id instead of storing it", async () => {
    const response = await leadsRoute.POST(post("/api/leads", { ...body, courseId: 99999 }, { "x-forwarded-for": "10.0.0.7" }));
    expect(response.status).toBe(201);
  });

  it("rate limits repeated submissions from one IP", async () => {
    const headers = { "x-forwarded-for": "10.9.9.9" };
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await leadsRoute.POST(post("/api/leads", body, headers))).status);
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});

describe("admin API authorization", () => {
  it("rejects unauthenticated reads and writes", async () => {
    const get = await resourceRoute.GET(new NextRequest(`${BASE}/api/admin/courses`), ctx({ resource: "courses" }));
    expect(get.status).toBe(401);
    const put = await resourceIdRoute.PUT(post("/api/admin/courses/1", {}), ctx({ resource: "courses", id: "1" }));
    expect(put.status).toBe(401);
    const del = await resourceIdRoute.DELETE(post("/api/admin/courses/1", {}), ctx({ resource: "courses", id: "1" }));
    expect(del.status).toBe(401);
  });

  it("rejects a forged session cookie", async () => {
    const response = await resourceRoute.GET(
      new NextRequest(`${BASE}/api/admin/courses`, { headers: { cookie: "orbit_admin=not.a.jwt" } }),
      ctx({ resource: "courses" }),
    );
    expect(response.status).toBe(401);
  });

  it("lists resources for an authenticated admin and 404s unknown ones", async () => {
    const ok = await resourceRoute.GET(new NextRequest(`${BASE}/api/admin/courses`, { headers: { cookie } }), ctx({ resource: "courses" }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).data.length).toBeGreaterThanOrEqual(12);

    const missing = await resourceRoute.GET(new NextRequest(`${BASE}/api/admin/users`, { headers: { cookie } }), ctx({ resource: "users" }));
    expect(missing.status).toBe(404);

    // Prototype keys must not be treated as resource names.
    for (const name of ["constructor", "toString", "__proto__"]) {
      const proto = await resourceRoute.GET(new NextRequest(`${BASE}/api/admin/${name}`, { headers: { cookie } }), ctx({ resource: name }));
      expect(proto.status).toBe(404);
    }
  });

  it("validates admin writes", async () => {
    const response = await resourceRoute.POST(post("/api/admin/courses", { title_ru: "" }, { cookie }), ctx({ resource: "courses" }));
    expect(response.status).toBe(422);
  });

  it("blocks javascript: URLs on projects", async () => {
    const response = await resourceRoute.POST(
      post(
        "/api/admin/projects",
        {
          title_ru: "P", title_en: "", title_uz: "", description_ru: "D", description_en: "", description_uz: "",
          author: "A", category: "qa", tags: "", demo_url: "javascript:alert(1)", repo_url: "",
          accent: "0", sort_order: 0, published: true,
        },
        { cookie },
      ),
      ctx({ resource: "projects" }),
    );
    expect(response.status).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  it("rejects wrong credentials without revealing which part was wrong", async () => {
    const response = await loginRoute.POST(post("/api/auth/login", { username: "tester", password: "nope" }, { "x-forwarded-for": "20.0.0.1" }));
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid username or password");
  });

  it("sets an httpOnly session cookie on success", async () => {
    const response = await loginRoute.POST(
      post("/api/auth/login", { username: "tester", password: "correct-horse-battery" }, { "x-forwarded-for": "20.0.0.2" }),
    );
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/orbit_admin=/);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("throttles one username across many (spoofed) IPs", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      statuses.push((await loginRoute.POST(post("/api/auth/login", { username: "victim", password: `bad${i}` }, { "x-forwarded-for": `30.0.${i}.1` }))).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(20).every((s) => s === 429)).toBe(true);
  }, 30_000);

  it("throttles brute force attempts", async () => {
    const headers = { "x-forwarded-for": "20.0.0.3" };
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      statuses.push((await loginRoute.POST(post("/api/auth/login", { username: "tester", password: `bad${i}` }, headers))).status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
  });
});
