import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EmbeddingClient, dot } from "@/lib/rag/embeddings";
import {
  buildKnowledgeBase,
  EVAL_CASES,
  evaluateVectorRetrieval,
  rankBySimilarity,
  type KnowledgeBase,
} from "@/lib/rag/knowledge-base";

const RAG_DIR = path.resolve(import.meta.dirname, "..", "rag-data");
const topics = ["цена", "график", "возврат"];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

/** Fake embedding service: one dimension per topic word found in the text. */
function fakeFetch() {
  return vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const vectorFor = (text: string) => topics.map((t) => (text.toLowerCase().includes(t) ? 1 : 0.05));
    if (url.includes(":batchEmbedContents")) {
      return jsonResponse({ embeddings: body.requests.map((r: { content: { parts: { text: string }[] } }) => ({ values: vectorFor(r.content.parts[0].text) })) });
    }
    return jsonResponse({ embedding: { values: vectorFor(body.content.parts[0].text) } });
  });
}

function tempDocs(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-kb-"));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

const clientWith = (fetchImpl: ReturnType<typeof fakeFetch>) => new EmbeddingClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });

describe("buildKnowledgeBase", () => {
  it("turns markdown into titled chunks with unit-length vectors and provenance", async () => {
    const dir = tempDocs({
      "01-price-list.md": "# Прайс\n## Курсы\n### Alpha\nЦена: 100 сум\n### Beta\nЦена: 200 сум",
      "02-faq.md": "# FAQ\n## Оплата\n### Как вернуть деньги?\nВозврат за непроведённые занятия.",
      "notes.txt": "ignored: not markdown",
    });
    const fetchImpl = fakeFetch();
    const kb = await buildKnowledgeBase({ dir, client: clientWith(fetchImpl), now: () => new Date("2026-11-14T12:00:00Z") });

    expect(kb).toMatchObject({ version: 1, model: "gemini-embedding-001", dimensions: 768, createdAt: "2026-11-14T12:00:00.000Z" });
    expect(kb.sourceFiles.map((f) => [f.name, f.chunks])).toEqual([["01-price-list.md", 2], ["02-faq.md", 1]]);
    expect(kb.sourceFiles[0].sha256).toMatch(/^[0-9a-f]{64}$/);

    expect(kb.chunks.map((c) => c.title)).toEqual(["Курсы › Alpha", "Курсы › Beta", "Оплата › Как вернуть деньги?"]);
    expect(kb.chunks.map((c) => c.docKey)).toEqual(["price", "price", "faq"]);
    for (const chunk of kb.chunks) {
      expect(chunk.text).toContain(chunk.title);
      expect(dot(chunk.vector, chunk.vector)).toBeCloseTo(1);
    }
    // all chunks go out in one batch request, never one request per chunk
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes(":batchEmbedContents"))).toHaveLength(1);
  });

  it("records document-vs-query task types the way the skill requires", async () => {
    const dir = tempDocs({ "a.md": "# A\n## S\n### Item\nbody" });
    const fetchImpl = fakeFetch();
    const client = clientWith(fetchImpl);
    const kb = await buildKnowledgeBase({ dir, client });
    await client.embedQuery("q");

    const batch = JSON.parse(String(fetchImpl.mock.calls[0][1].body)).requests[0];
    expect(batch.taskType).toBe("RETRIEVAL_DOCUMENT");
    const single = JSON.parse(String(fetchImpl.mock.calls[1][1].body));
    expect(single.taskType).toBe("RETRIEVAL_QUERY");
    expect(kb.chunks).toHaveLength(1);
  });

  it("handles a missing or empty directory without calling the API", async () => {
    const fetchImpl = fakeFetch();
    const kb = await buildKnowledgeBase({ dir: path.join(os.tmpdir(), "no-such-dir-xyz"), client: clientWith(fetchImpl) });
    expect(kb.chunks).toEqual([]);
    expect(kb.sourceFiles).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("chunks the real documents into 38+ passages inside the recommended size range", async () => {
    const kb = await buildKnowledgeBase({ dir: RAG_DIR, client: clientWith(fakeFetch()) });
    expect(kb.chunks.length).toBeGreaterThanOrEqual(38);
    expect(kb.sourceFiles.map((f) => f.name)).toEqual(["01-price-list.md", "02-faq.md", "03-schedule-and-contacts.md"]);
    for (const chunk of kb.chunks) {
      expect(chunk.title.length).toBeGreaterThan(0);
      expect(chunk.text.length).toBeLessThanOrEqual(1700); // skill guidance: 300-1500 chars of body + header
    }
    expect(new Set(kb.chunks.map((c) => c.id)).size).toBe(kb.chunks.length);
  });
});

describe("rankBySimilarity", () => {
  const chunks = [
    { id: "a", title: "A", text: "A", docKey: "x", vector: [1, 0] },
    { id: "b", title: "B", text: "B", docKey: "x", vector: [0.6, 0.8] },
    { id: "c", title: "C", text: "C", docKey: "x", vector: [0, 1] },
  ];

  it("orders by cosine similarity and respects topK", () => {
    const ranked = rankBySimilarity([0, 1], chunks, 2);
    expect(ranked.map((r) => r.chunk.id)).toEqual(["c", "b"]);
    expect(ranked[0].similarity).toBeCloseTo(1);
  });

  it("does not mutate its input", () => {
    const before = chunks.map((c) => c.id);
    rankBySimilarity([1, 0], chunks);
    expect(chunks.map((c) => c.id)).toEqual(before);
  });
});

describe("evaluateVectorRetrieval", () => {
  const kb: KnowledgeBase = {
    version: 1,
    model: "m",
    dimensions: 3,
    createdAt: "",
    sourceFiles: [],
    chunks: [
      { id: "1", title: "Курсы › Цена QA", text: "", docKey: "price", vector: [1, 0, 0] },
      { id: "2", title: "График работы", text: "", docKey: "schedule", vector: [0, 1, 0] },
      { id: "3", title: "Возврат денег", text: "", docKey: "faq", vector: [0, 0, 1] },
    ],
  };

  it("scores hits at 1 and 3, case-insensitively, and reports misses", async () => {
    const report = await evaluateVectorRetrieval(kb, clientWith(fakeFetch()), [
      { q: "цена", expect: "цена qa" }, // matches despite different case
      { q: "график", expect: ["нет такого", "график работы"] }, // any alternative counts
      { q: "возврат", expect: "Цена QA" }, // wrong section: found in the top 3, but not first
      { q: "возврат", expect: "Раздела нет" }, // not retrieved at all → a miss
    ]);
    expect(report).toMatchObject({ total: 4, hitAt1: 2, hitAt3: 3 });
    expect(report.misses).toHaveLength(1);
    expect(report.misses[0]).toMatchObject({ q: "возврат", expected: "раздела нет" });
    expect(report.misses[0].got[0]).toBe("Возврат денег");
  });

  it("ships a labelled question set covering RU, EN and UZ", () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(15);
    expect(EVAL_CASES.some((c) => /[а-я]/i.test(c.q))).toBe(true);
    expect(EVAL_CASES.some((c) => /^[a-z ?]+$/i.test(c.q))).toBe(true);
    expect(EVAL_CASES.some((c) => /narxi|qancha/i.test(c.q))).toBe(true);
  });
});
