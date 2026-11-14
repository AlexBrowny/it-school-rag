import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chunkDocument } from "@/lib/rag/chunker";
import { dot, EMBEDDING_DIMENSIONS, type EmbeddingClient } from "@/lib/rag/embeddings";

/**
 * Markdown documents → a vector knowledge base (the "google-ai-studio-rag" skill pipeline):
 *   chunks with clear titles  →  RETRIEVAL_DOCUMENT embeddings  →  cosine-similarity retrieval.
 * The JSON shape is the skill's `{ id, title, text, vector }` plus provenance fields.
 */
export interface KnowledgeChunk {
  id: string;
  /** Section heading (what a reader would call this passage). */
  title: string;
  /** Self-contained passage that was embedded: document title › heading + body. */
  text: string;
  docKey: string;
  vector: number[];
}

export interface KnowledgeBase {
  version: 1;
  model: string;
  dimensions: number;
  createdAt: string;
  sourceFiles: { name: string; sha256: string; chunks: number }[];
  chunks: KnowledgeChunk[];
}

export interface BuildOptions {
  dir: string;
  client: EmbeddingClient;
  now?: () => Date;
}

export async function buildKnowledgeBase({ dir, client, now = () => new Date() }: BuildOptions): Promise<KnowledgeBase> {
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort() : [];
  const sourceFiles: KnowledgeBase["sourceFiles"] = [];
  const pending: { id: string; title: string; text: string; docKey: string }[] = [];

  for (const name of names) {
    const markdown = fs.readFileSync(path.join(dir, name), "utf8");
    const chunks = chunkDocument(name, markdown);
    sourceFiles.push({ name, sha256: createHash("sha256").update(markdown).digest("hex"), chunks: chunks.length });
    for (const chunk of chunks) pending.push({ id: chunk.id, title: chunk.heading, text: chunk.text, docKey: chunk.docKey });
  }

  const vectors = pending.length > 0 ? await client.embedDocuments(pending.map(({ title, text }) => ({ title, text }))) : [];
  return {
    version: 1,
    model: client.modelName,
    dimensions: EMBEDDING_DIMENSIONS,
    createdAt: now().toISOString(),
    sourceFiles,
    chunks: pending.map((chunk, index) => ({ ...chunk, vector: vectors[index] })),
  };
}

export interface RankedChunk {
  chunk: KnowledgeChunk;
  similarity: number;
}

/** Top-K chunks by cosine similarity (vectors are unit length, so a dot product is the cosine). */
export function rankBySimilarity(queryVector: number[], chunks: readonly KnowledgeChunk[], topK = 3): RankedChunk[] {
  return chunks
    .map((chunk) => ({ chunk, similarity: dot(queryVector, chunk.vector) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export interface EvalCase {
  q: string;
  /** Heading substring(s), matched case-insensitively; any one of them counts as a correct retrieval. */
  expect: string | readonly string[];
}

export interface EvalReport {
  total: number;
  hitAt1: number;
  hitAt3: number;
  misses: { q: string; expected: string; got: string[] }[];
}

/** Pure vector retrieval (no keyword search) over a labelled question set. */
export async function evaluateVectorRetrieval(kb: KnowledgeBase, client: EmbeddingClient, cases: readonly EvalCase[]): Promise<EvalReport> {
  const report: EvalReport = { total: cases.length, hitAt1: 0, hitAt3: 0, misses: [] };
  for (const { q, expect } of cases) {
    const ranked = rankBySimilarity(await client.embedQuery(q), kb.chunks, 3);
    const headings = ranked.map((item) => item.chunk.title);
    const wanted = (typeof expect === "string" ? [expect] : [...expect]).map((value) => value.toLowerCase());
    const matches = (title: string) => wanted.some((value) => title.toLowerCase().includes(value));
    if (headings[0] && matches(headings[0])) report.hitAt1 += 1;
    if (headings.some(matches)) report.hitAt3 += 1;
    else report.misses.push({ q, expected: wanted.join(" / "), got: headings });
  }
  return report;
}

/** Questions (RU / EN / UZ) with the section that must answer them; used by `npm run rag:index`. */
export const EVAL_CASES: readonly EvalCase[] = [
  { q: "Сколько стоит курс QA?", expect: "QA-инженер" },
  { q: "цена Frontend", expect: "Frontend-разработчик" },
  { q: "Сколько стоит курс по Unity для игр", expect: "Разработчик игр (Unity)" },
  { q: "How much is the UI/UX designer course?", expect: "UI/UX-дизайнер" },
  { q: "kiberxavfsizlik kursi narxi qancha", expect: "Кибербезопасность" },
  { q: "Есть ли рассрочка?", expect: "Рассрочка" },
  { q: "Can I pay in installments?", expect: "Рассрочка" },
  { q: "Можно ли вернуть деньги если откажусь", expect: "вернуть деньги" },
  { q: "Что взять с собой на первое занятие?", expect: "Что взять с собой" },
  { q: "Как оплатить обучение картой Click?", expect: "оплатить обучение" },
  { q: "Что делать если я пропустил занятие?", expect: "перенести занятие" },
  { q: "Do you help with finding a job?", expect: "трудоустройством" },
  { q: "Когда работает Азамат Исмоилов в среду?", expect: "Азамат Исмоилов" },
  { q: "Кто преподаёт Backend?", expect: "Рустам Каримов" },
  { q: "Какой у вас адрес и телефон?", expect: ["Адрес и режим работы школы", "Контакты для записи"] },
  { q: "school address and opening hours", expect: "Адрес и режим работы школы" },
];
