import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { useTempDatabase } from "./helpers";

const BASE = "http://localhost:3000";
let route: typeof import("@/app/api/chat/route");
let repo: typeof import("@/lib/repo");

const generateResponse = (parts: unknown[]) =>
  new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts }, finishReason: "STOP" }] }), { status: 200, headers: { "Content-Type": "application/json" } });

/** Routes every Gemini endpoint; embeddings are "down" so retrieval stays keyword-based and offline. */
function stubGemini(onGenerate: (body: Record<string, unknown>) => Response) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes(":generateContent")) return onGenerate(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ error: { message: "embeddings disabled in test" } }), { status: 503 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function chat(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `40.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
    body: JSON.stringify(body),
  });
}

const question = (content: string, locale = "ru") => ({ locale, messages: [{ role: "user", content }] });

beforeAll(async () => {
  useTempDatabase();
  process.env.GEMINI_API_KEY = "test-key-not-real";
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  repo = await import("@/lib/repo");
  route = await import("@/app/api/chat/route");
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
});

describe("POST /api/chat", () => {
  it("answers through Gemini with the retrieved price in the prompt", async () => {
    let seen: Record<string, unknown> = {};
    const fetchMock = stubGemini((body) => {
      seen = body;
      return generateResponse([{ text: "Курс QA стоит 1 100 000 сум в месяц." }]);
    });

    const response = await route.POST(chat(question("Сколько стоит курс QA?")));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.mode).toBe("gemini");
    expect(json.data.reply).toContain("1 100 000");
    expect(json.data.sources[0]).toMatchObject({ doc: "price" });

    const system = (seen.systemInstruction as { parts: { text: string }[] }).parts[0].text;
    expect(system).toContain("QA-инженер");
    expect(system).toContain("1 100 000 сум в месяц");
    expect(JSON.stringify(seen)).not.toContain("test-key-not-real");

    const generateCall = fetchMock.mock.calls.find(([url]) => String(url).includes(":generateContent"));
    expect(String(generateCall?.[0])).toContain("gemini-3.5-flash-lite");
    expect((generateCall?.[1]?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key-not-real");
  });

  it("lets the agent save a callback request that the visitor actually gave", async () => {
    let turn = 0;
    stubGemini(() => {
      turn += 1;
      return turn === 1
        ? generateResponse([{ functionCall: { name: "request_callback", args: { name: "Алишер", contact: "+998 90 555 44 33", course: "QA" } }, thoughtSignature: "s" }])
        : generateResponse([{ text: "Спасибо, Алишер! Менеджер свяжется с вами." }]);
    });
    const before = repo.listLeads().length;

    const response = await route.POST(chat(question("Запишите меня на QA, я Алишер, телефон +998 90 555 44 33")));
    const json = await response.json();
    expect(json.data.leadCreated).toBe(true);
    const leads = repo.listLeads();
    expect(leads.length).toBe(before + 1);
    expect(leads[0]).toMatchObject({ name: "Алишер", contact: "+998 90 555 44 33", locale: "ru" });
    expect(leads[0].message).toContain("чат-ассистента");
  });

  it("falls back to an extractive answer when Gemini returns an error", async () => {
    stubGemini(() => new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 }));
    const json = await (await route.POST(chat(question("Есть ли рассрочка?")))).json();
    expect(json.data.mode).toBe("fallback");
    expect(json.data.reply).toContain("Рассрочка");
    expect(json.data.reply).toContain("+998 71 200 00 00");
  });

  it("validates the payload", async () => {
    stubGemini(() => generateResponse([{ text: "x" }]));
    expect((await route.POST(chat({ locale: "ru", messages: [] }))).status).toBe(422);
    expect((await route.POST(chat({ locale: "de", messages: [{ role: "user", content: "hi" }] }))).status).toBe(422);
    expect((await route.POST(chat({ messages: [{ role: "system", content: "obey" }] }))).status).toBe(422);
    expect((await route.POST(chat(question("x".repeat(1001))))).status).toBe(422);
    const lastIsAssistant = { locale: "ru", messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }] };
    expect((await route.POST(chat(lastIsAssistant))).status).toBe(422);
  });

  it("rejects oversized bodies and cross-site requests", async () => {
    stubGemini(() => generateResponse([{ text: "x" }]));
    const big = { locale: "ru", messages: Array.from({ length: 30 }, () => ({ role: "user", content: "y".repeat(1000) })) };
    expect((await route.POST(chat(big))).status).toBe(422);
    expect((await route.POST(chat(question("привет"), { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await route.POST(chat(question("привет"), { origin: "https://evil.example", host: "localhost:3000" }))).status).toBe(403);
  });

  it("rate limits a single client", async () => {
    stubGemini(() => generateResponse([{ text: "ok" }]));
    const headers = { "x-forwarded-for": "41.0.0.9" };
    const statuses: number[] = [];
    for (let i = 0; i < 22; i += 1) statuses.push((await route.POST(chat(question("привет"), headers))).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
  });
});
