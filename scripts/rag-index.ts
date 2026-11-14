/**
 * Builds the vector knowledge base from rag-data/*.md and checks retrieval quality.
 *
 *   npm run rag:index                 # use cached vectors, embed only new/changed chunks
 *   npm run rag:index -- --force      # drop the cache and re-embed everything
 *   npm run rag:index -- --no-eval    # skip the retrieval self-check
 *
 * Reads GEMINI_API_KEY (and optionally GEMINI_EMBEDDING_MODEL) from .env.local.
 * Output: data/rag-knowledge-base.json (inspectable) and data/rag-embeddings.json (runtime cache),
 * so the chat server starts with warm vectors and makes no embedding calls for unchanged text.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_EMBEDDING_MODEL, EmbeddingClient } from "@/lib/rag/embeddings";
import { buildKnowledgeBase, EVAL_CASES, evaluateVectorRetrieval } from "@/lib/rag/knowledge-base";

const root = process.cwd();
const ragDir = process.env.RAG_DIR ?? path.join(root, "rag-data");
const cacheFile = path.join(root, "data", "rag-embeddings.json");
const outFile = path.join(root, "data", "rag-knowledge-base.json");
const args = new Set(process.argv.slice(2));

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).");
    process.exitCode = 1;
    return;
  }
  if (args.has("--force") && fs.existsSync(cacheFile)) fs.rmSync(cacheFile);

  const client = new EmbeddingClient({ apiKey, model: process.env.GEMINI_EMBEDDING_MODEL || undefined, cacheFile });
  console.log(`Model: ${client.modelName} (default: ${DEFAULT_EMBEDDING_MODEL}) | source: ${ragDir}`);

  const started = Date.now();
  const kb = await buildKnowledgeBase({ dir: ragDir, client });
  if (kb.chunks.length === 0) {
    console.error(`No .md documents found in ${ragDir}.`);
    process.exitCode = 1;
    return;
  }

  // Round to 6 decimals: ~40% smaller file, no measurable effect on similarity.
  const compact = { ...kb, chunks: kb.chunks.map((chunk) => ({ ...chunk, vector: chunk.vector.map((v) => Math.round(v * 1e6) / 1e6) })) };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const tmp = `${outFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(compact));
  fs.renameSync(tmp, outFile);

  console.log(`\nIndexed ${kb.chunks.length} chunks, ${kb.dimensions} dimensions, in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  for (const file of kb.sourceFiles) console.log(`  ${file.name.padEnd(30)} ${String(file.chunks).padStart(3)} chunks  sha256:${file.sha256.slice(0, 10)}`);
  console.log(`Wrote ${path.relative(root, outFile)} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);

  if (args.has("--no-eval")) return;
  const report = await evaluateVectorRetrieval(kb, client, EVAL_CASES);
  const pct = (n: number) => `${n}/${report.total} (${Math.round((n / report.total) * 100)}%)`;
  console.log(`\nVector-only retrieval check: top-1 ${pct(report.hitAt1)} | top-3 ${pct(report.hitAt3)}`);
  for (const miss of report.misses) console.log(`  MISS "${miss.q}" expected "${miss.expected}", got: ${miss.got.join(" | ")}`);
}

main().catch((error: unknown) => {
  // Never print request details: they could include the API key header.
  console.error(`rag-index failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
