import "server-only";
import fs from "node:fs";
import path from "node:path";
import { chunkDocument, type Chunk } from "@/lib/rag/chunker";
import { dot, EmbeddingClient } from "@/lib/rag/embeddings";
import { Bm25Index } from "@/lib/rag/lexical";

export interface Retrieved {
  chunk: Chunk;
  /** Reciprocal-rank-fusion score (higher is better). */
  score: number;
}

export interface Retriever {
  retrieve(query: string, limit?: number): Promise<Retrieved[]>;
  chunkCount(): number;
}

const RRF_K = 60;
const EMBEDDING_RETRY_AFTER_MS = 5 * 60 * 1000;

function ragDir(): string {
  return process.env.RAG_DIR ?? path.join(process.cwd(), "rag-data");
}

function readDocs(dir: string): { files: { name: string; mtime: number }[]; chunks: Chunk[] } {
  if (!fs.existsSync(dir)) return { files: [], chunks: [] };
  const names = fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort();
  const files = names.map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }));
  const chunks = names.flatMap((name) => chunkDocument(name, fs.readFileSync(path.join(dir, name), "utf8")));
  return { files, chunks };
}

interface IndexState {
  signature: string;
  chunks: Chunk[];
  bm25: Bm25Index;
  vectors: number[][] | null;
  embeddingsBuilding: Promise<void> | null;
  embeddingsRetryAt: number;
}

export interface RetrieverOptions {
  dir?: string;
  apiKey?: string;
  embeddingModel?: string;
  cacheFile?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Hybrid retriever: BM25 always; Gemini embeddings when an API key is configured. Both rankings are
 * fused with reciprocal rank fusion. Embedding failures degrade silently to BM25 and are retried later.
 */
export function createRetriever(options: RetrieverOptions = {}): Retriever {
  const dir = options.dir ?? ragDir();
  let state: IndexState | null = null;
  let client: EmbeddingClient | null = null;
  if (options.apiKey) {
    client = new EmbeddingClient({
      apiKey: options.apiKey,
      model: options.embeddingModel,
      cacheFile: options.cacheFile,
      fetchImpl: options.fetchImpl,
    });
  }

  function ensureIndex(): IndexState {
    const { files, chunks } = readDocs(dir);
    const signature = files.map((file) => `${file.name}:${file.mtime}`).join("|");
    if (state && state.signature === signature) return state;
    state = {
      signature,
      chunks,
      // Headings are repeated so a question like "Frontend цена" prefers the Frontend chunk.
      bm25: new Bm25Index(chunks.map((chunk) => ({ id: chunk.id, text: `${chunk.heading} ${chunk.heading} ${chunk.body}` }))),
      vectors: null,
      embeddingsBuilding: null,
      embeddingsRetryAt: 0,
    };
    return state;
  }

  async function ensureVectors(current: IndexState): Promise<number[][] | null> {
    if (!client || current.chunks.length === 0) return null;
    if (current.vectors) return current.vectors;
    if (Date.now() < current.embeddingsRetryAt) return null;
    const embeddings = client;
    current.embeddingsBuilding ??= embeddings
      .embedDocuments(current.chunks.map((chunk) => ({ title: chunk.heading, text: chunk.text })))
      .then((vectors) => {
        current.vectors = vectors;
      })
      .catch((error: unknown) => {
        current.embeddingsRetryAt = Date.now() + EMBEDDING_RETRY_AFTER_MS;
        console.warn(`[rag] embeddings unavailable, using keyword search only: ${error instanceof Error ? error.message : "unknown error"}`);
      })
      .finally(() => {
        current.embeddingsBuilding = null;
      });
    await current.embeddingsBuilding;
    return current.vectors;
  }

  return {
    chunkCount: () => ensureIndex().chunks.length,

    async retrieve(query, limit = 5) {
      const current = ensureIndex();
      if (current.chunks.length === 0 || query.trim() === "") return [];
      const byId = new Map(current.chunks.map((chunk) => [chunk.id, chunk]));
      const fused = new Map<string, number>();
      const add = (ids: string[]) => ids.forEach((id, rank) => fused.set(id, (fused.get(id) ?? 0) + 1 / (RRF_K + rank + 1)));

      const lexical = current.bm25.search(query, 12);
      add(lexical.map((hit) => hit.id));

      const vectors = await ensureVectors(current);
      if (client && vectors) {
        try {
          const queryVector = await client.embedQuery(query);
          const ranked = current.chunks
            .map((chunk, index) => ({ id: chunk.id, score: dot(queryVector, vectors[index]) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);
          add(ranked.map((hit) => hit.id));
        } catch (error) {
          console.warn(`[rag] query embedding failed: ${error instanceof Error ? error.message : "unknown error"}`);
        }
      }

      return [...fused.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .flatMap(([id, score]) => {
          const chunk = byId.get(id);
          return chunk ? [{ chunk, score }] : [];
        });
    },
  };
}

/** Process-wide retriever configured from the environment. */
const globalForRag = globalThis as unknown as { __ragRetriever?: Retriever };

export function getRetriever(): Retriever {
  globalForRag.__ragRetriever ??= createRetriever({
    apiKey: process.env.GEMINI_API_KEY || undefined,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || undefined,
    cacheFile: path.join(process.cwd(), "data", "rag-embeddings.json"),
  });
  return globalForRag.__ragRetriever;
}
