import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Gemini embeddings with an on-disk cache keyed by content hash, so documents are embedded once
 * (re-embedded only when their text or the model changes). Vectors are L2-normalised so cosine
 * similarity is a plain dot product.
 */
export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
export const EMBEDDING_DIMENSIONS = 768;
const OUTPUT_DIMENSIONS = EMBEDDING_DIMENSIONS;
const BATCH_SIZE = 50;
const TIMEOUT_MS = 30_000;

export function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

export function dot(a: number[], b: number[]): number {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
  return sum;
}

export interface EmbeddingClientOptions {
  apiKey: string;
  model?: string;
  cacheFile?: string;
  fetchImpl?: typeof fetch;
}

interface CacheFile {
  model: string;
  dimensions: number;
  vectors: Record<string, number[]>;
}

function hashText(model: string, text: string): string {
  return createHash("sha256").update(`${model}\n${text}`).digest("hex").slice(0, 32);
}

/** gemini-embedding-001 takes a taskType; gemini-embedding-2 expects the task written into the text. */
function legacyTaskType(model: string): boolean {
  return /embedding-001/.test(model);
}

function documentPayload(model: string, title: string, text: string): { text: string; taskType?: string } {
  return legacyTaskType(model)
    ? { text, taskType: "RETRIEVAL_DOCUMENT" }
    : { text: `title: ${title || "none"} | text: ${text}` };
}

function queryPayload(model: string, query: string): { text: string; taskType?: string } {
  return legacyTaskType(model)
    ? { text: query, taskType: "RETRIEVAL_QUERY" }
    : { text: `task: search result | query: ${query}` };
}

export class EmbeddingClient {
  private readonly model: string;
  private readonly doFetch: typeof fetch;
  private cache: CacheFile | null = null;

  /** Model id this client embeds with. */
  get modelName(): string {
    return this.model;
  }

  constructor(private readonly options: EmbeddingClientOptions) {
    this.model = options.model ?? DEFAULT_EMBEDDING_MODEL;
    this.doFetch = options.fetchImpl ?? fetch;
  }

  private loadCache(): CacheFile {
    if (this.cache) return this.cache;
    const empty: CacheFile = { model: this.model, dimensions: OUTPUT_DIMENSIONS, vectors: {} };
    try {
      if (this.options.cacheFile && fs.existsSync(this.options.cacheFile)) {
        const parsed = JSON.parse(fs.readFileSync(this.options.cacheFile, "utf8")) as CacheFile;
        if (parsed.model === this.model && parsed.dimensions === OUTPUT_DIMENSIONS) {
          this.cache = parsed;
          return parsed;
        }
      }
    } catch {
      /* corrupt cache: start over */
    }
    this.cache = empty;
    return empty;
  }

  private saveCache(): void {
    if (!this.options.cacheFile || !this.cache) return;
    try {
      fs.mkdirSync(path.dirname(this.options.cacheFile), { recursive: true });
      const tmp = `${this.options.cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.cache));
      fs.renameSync(tmp, this.options.cacheFile);
    } catch {
      /* cache is an optimisation only */
    }
  }

  private async request(url: string, body: unknown): Promise<unknown> {
    const response = await this.doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.options.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Embedding request failed with HTTP ${response.status}`);
    return response.json();
  }

  /** Embeds documents, reusing cached vectors. Order of the result matches the input. */
  async embedDocuments(items: { title: string; text: string }[]): Promise<number[][]> {
    const cache = this.loadCache();
    const keys = items.map((item) => hashText(this.model, `${item.title}\n${item.text}`));
    const missing = items.map((item, index) => ({ item, index })).filter(({ index }) => !cache.vectors[keys[index]]);

    for (let start = 0; start < missing.length; start += BATCH_SIZE) {
      const batch = missing.slice(start, start + BATCH_SIZE);
      const json = (await this.request(`${API_ROOT}/models/${this.model}:batchEmbedContents`, {
        requests: batch.map(({ item }) => {
          const payload = documentPayload(this.model, item.title, item.text);
          return {
            model: `models/${this.model}`,
            content: { parts: [{ text: payload.text }] },
            ...(payload.taskType ? { taskType: payload.taskType } : {}),
            outputDimensionality: OUTPUT_DIMENSIONS,
          };
        }),
      })) as { embeddings?: { values?: number[] }[] };

      const vectors = json.embeddings ?? [];
      if (vectors.length !== batch.length) throw new Error("Embedding response size mismatch");
      batch.forEach(({ index }, i) => {
        const values = vectors[i]?.values;
        if (!Array.isArray(values) || values.length === 0) throw new Error("Embedding response missing values");
        cache.vectors[keys[index]] = normalize(values);
      });
    }
    if (missing.length > 0) this.saveCache();
    return keys.map((key) => cache.vectors[key]);
  }

  async embedQuery(query: string): Promise<number[]> {
    const payload = queryPayload(this.model, query);
    const json = (await this.request(`${API_ROOT}/models/${this.model}:embedContent`, {
      model: `models/${this.model}`,
      content: { parts: [{ text: payload.text }] },
      ...(payload.taskType ? { taskType: payload.taskType } : {}),
      outputDimensionality: OUTPUT_DIMENSIONS,
    })) as { embedding?: { values?: number[] }; embeddings?: { values?: number[] }[] };
    const values = json.embedding?.values ?? json.embeddings?.[0]?.values;
    if (!Array.isArray(values) || values.length === 0) throw new Error("Embedding response missing values");
    return normalize(values);
  }
}
