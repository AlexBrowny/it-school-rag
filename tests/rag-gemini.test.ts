import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { dot, EmbeddingClient, normalize } from "@/lib/rag/embeddings";
import { generate, GeminiError } from "@/lib/rag/gemini";
import { createRetriever } from "@/lib/rag/retriever";

const SECRET = "AIza-super-secret-key-123";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const baseParams = { apiKey: SECRET, system: "sys", contents: [{ role: "user" as const, parts: [{ text: "hi" }] }] };

describe("Gemini generateContent client", () => {
  it("calls the documented endpoint with the key in a header and only universally supported fields", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ candidates: [{ content: { role: "model", parts: [{ text: "Привет" }] }, finishReason: "STOP" }] }));
    const result = await generate({ ...baseParams, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.text).toBe("Привет");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain(SECRET);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(SECRET);

    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction).toEqual({ parts: [{ text: "sys" }] });
    expect(body.contents).toEqual(baseParams.contents);
    expect(body.generationConfig).toEqual({ maxOutputTokens: 800 });
    expect(JSON.stringify(body)).not.toMatch(/temperature|topP|topK|thinking/i);
    expect(body.tools).toBeUndefined();
  });

  it("sends tool declarations and returns function calls with the original parts", async () => {
    const parts = [{ functionCall: { name: "search_knowledge_base", args: { query: "q" }, id: "1" }, thoughtSignature: "sig" }];
    const fetchImpl = vi.fn(async () => jsonResponse({ candidates: [{ content: { role: "model", parts } }] }));
    const tools = [{ functionDeclarations: [{ name: "search_knowledge_base", description: "d", parameters: { type: "OBJECT" as const, properties: {}, required: [] } }] }];
    const result = await generate({ ...baseParams, tools, model: "gemini-test", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body)).tools).toEqual(tools);
    expect(result.calls).toEqual([{ name: "search_knowledge_base", args: { query: "q" }, id: "1" }]);
    expect(result.content.parts).toEqual(parts);
  });

  it("ignores thought parts in the visible text", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ candidates: [{ content: { role: "model", parts: [{ text: "внутренние мысли", thought: true }, { text: "Ответ" }] } }] }),
    );
    expect((await generate({ ...baseParams, fetchImpl: fetchImpl as unknown as typeof fetch })).text).toBe("Ответ");
  });

  it("raises typed errors that never contain the API key", async () => {
    const cases: [() => Promise<Response>, string, number][] = [
      [async () => jsonResponse({ error: { message: "API key not valid" } }, 400), "http", 400],
      [async () => jsonResponse({ promptFeedback: { blockReason: "SAFETY" } }), "blocked", 0],
      [async () => jsonResponse({ candidates: [{ finishReason: "MAX_TOKENS" }] }), "empty", 0],
    ];
    for (const [impl, code, status] of cases) {
      const error = await generate({ ...baseParams, fetchImpl: vi.fn(impl) as unknown as typeof fetch }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(GeminiError);
      expect((error as GeminiError).code).toBe(code);
      expect((error as GeminiError).status).toBe(status);
      expect((error as GeminiError).message).not.toContain(SECRET);
    }

    const network = await generate({ ...baseParams, fetchImpl: vi.fn(async () => Promise.reject(new TypeError(`fetch failed for ${SECRET}`))) as unknown as typeof fetch }).catch((e: unknown) => e);
    expect((network as GeminiError).code).toBe("network");
    expect((network as GeminiError).message).not.toContain(SECRET);
  });
});

describe("embeddings", () => {
  it("normalises vectors so dot product equals cosine similarity", () => {
    const a = normalize([3, 4]);
    expect(a[0] ** 2 + a[1] ** 2).toBeCloseTo(1);
    expect(dot(a, a)).toBeCloseTo(1);
    expect(dot(normalize([1, 0]), normalize([0, 1]))).toBe(0);
    expect(normalize([0, 0])).toEqual([0, 0]);
  });

  function batchFetch() {
    return vi.fn(async (_url: string, init: RequestInit) => {
      const requests = JSON.parse(String(init.body)).requests as unknown[];
      return jsonResponse({ embeddings: requests.map((_, i) => ({ values: [i + 1, 2, 3] })) });
    });
  }

  it("uses text prefixes for gemini-embedding-2 and a taskType for gemini-embedding-001", async () => {
    const v2 = batchFetch();
    await new EmbeddingClient({ apiKey: SECRET, fetchImpl: v2 as unknown as typeof fetch }).embedDocuments([{ title: "T", text: "body" }]);
    const bodyV2 = JSON.parse(String(v2.mock.calls[0][1].body)).requests[0];
    expect(v2.mock.calls[0][0]).toContain("/models/gemini-embedding-2:batchEmbedContents");
    expect(bodyV2.content.parts[0].text).toBe("title: T | text: body");
    expect(bodyV2.taskType).toBeUndefined();
    expect(bodyV2.outputDimensionality).toBe(768);

    const v1 = batchFetch();
    await new EmbeddingClient({ apiKey: SECRET, model: "gemini-embedding-001", fetchImpl: v1 as unknown as typeof fetch }).embedDocuments([{ title: "T", text: "body" }]);
    const bodyV1 = JSON.parse(String(v1.mock.calls[0][1].body)).requests[0];
    expect(bodyV1.taskType).toBe("RETRIEVAL_DOCUMENT");
    expect(bodyV1.content.parts[0].text).toBe("body");
  });

  it("caches vectors on disk by content hash and re-embeds only what changed", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-emb-"));
    const cacheFile = path.join(dir, "emb.json");
    const items = [{ title: "A", text: "one" }, { title: "B", text: "two" }];

    const first = batchFetch();
    const vectors = await new EmbeddingClient({ apiKey: SECRET, cacheFile, fetchImpl: first as unknown as typeof fetch }).embedDocuments(items);
    expect(first).toHaveBeenCalledTimes(1);
    expect(vectors).toHaveLength(2);
    expect(fs.readFileSync(cacheFile, "utf8")).not.toContain(SECRET);

    const second = batchFetch();
    const again = await new EmbeddingClient({ apiKey: SECRET, cacheFile, fetchImpl: second as unknown as typeof fetch }).embedDocuments(items);
    expect(second).not.toHaveBeenCalled();
    expect(again).toEqual(vectors);

    const third = batchFetch();
    await new EmbeddingClient({ apiKey: SECRET, cacheFile, fetchImpl: third as unknown as typeof fetch }).embedDocuments([...items, { title: "C", text: "three" }]);
    expect(JSON.parse(String(third.mock.calls[0][1].body)).requests).toHaveLength(1);
  });

  it("parses single-query responses in both documented shapes and rejects bad ones", async () => {
    const make = (body: unknown, status = 200) => new EmbeddingClient({ apiKey: SECRET, fetchImpl: vi.fn(async () => jsonResponse(body, status)) as unknown as typeof fetch });
    expect(await make({ embedding: { values: [3, 4] } }).embedQuery("q")).toEqual([0.6, 0.8]);
    expect(await make({ embeddings: [{ values: [0, 5] }] }).embedQuery("q")).toEqual([0, 1]);
    await expect(make({}).embedQuery("q")).rejects.toThrow(/missing values/);
    await expect(make({}, 500).embedQuery("q")).rejects.toThrow(/HTTP 500/);
  });
});

describe("hybrid retrieval", () => {
  const RAG_DIR = path.resolve(import.meta.dirname, "..", "rag-data");
  const topics = ["рассрочка", "возврат", "график", "ноутбук"];

  /** Fake embedding service: one dimension per topic, so semantic hits can be asserted without a network. */
  function fakeEmbeddingFetch(queryTopic: number) {
    return vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (url.includes(":batchEmbedContents")) {
        return jsonResponse({
          embeddings: body.requests.map((r: { content: { parts: { text: string }[] } }) => ({
            // Only the heading ("title: … | text: …") decides the topic, like a model that understands what a section is about.
            values: topics.map((t) => (r.content.parts[0].text.split(" | text:")[0].toLowerCase().includes(t) ? 1 : 0.01)),
          })),
        });
      }
      return jsonResponse({ embedding: { values: topics.map((_, i) => (i === queryTopic ? 1 : 0)) } });
    });
  }

  it("surfaces a semantically matching chunk that keyword search misses", async () => {
    // "pay later" shares no document vocabulary with the installment section, but its embedding does.
    const fetchImpl = fakeEmbeddingFetch(0);
    const retriever = createRetriever({ dir: RAG_DIR, apiKey: SECRET, fetchImpl: fetchImpl as unknown as typeof fetch });
    const hits = await retriever.retrieve("pay later", 3);
    expect(hits.map((h) => h.chunk.heading).some((h) => h.includes("Рассрочка"))).toBe(true);
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes(":embedContent"))).toBe(true);
  });

  it("falls back to keyword search when the embedding service is down, and warns without leaking the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "down" } }, 503));
    const retriever = createRetriever({ dir: RAG_DIR, apiKey: SECRET, fetchImpl: fetchImpl as unknown as typeof fetch });

    const hits = await retriever.retrieve("Сколько стоит курс QA?", 3);
    expect(hits[0].chunk.heading).toContain("QA-инженер");
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);

    // The failure is remembered: a second question does not hammer the failing service again.
    const callsAfterFirst = fetchImpl.mock.calls.length;
    await retriever.retrieve("Есть ли рассрочка?", 3);
    expect(fetchImpl.mock.calls.length).toBe(callsAfterFirst);
    warn.mockRestore();
  });

  it("picks up edited documents without a restart", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-rag-"));
    const file = path.join(dir, "01-price-list.md");
    fs.writeFileSync(file, "# Прайс\n## Курсы\n### Alpha\nЦена: 100 сум");
    const retriever = createRetriever({ dir });
    expect((await retriever.retrieve("Alpha цена"))[0].chunk.body).toContain("100 сум");

    fs.writeFileSync(file, "# Прайс\n## Курсы\n### Alpha\nЦена: 999 сум");
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(file, future, future);
    expect((await retriever.retrieve("Alpha цена"))[0].chunk.body).toContain("999 сум");
  });

  it("returns nothing when the knowledge directory is missing", async () => {
    expect(await createRetriever({ dir: path.join(os.tmpdir(), "does-not-exist-xyz") }).retrieve("цена")).toEqual([]);
  });
});
