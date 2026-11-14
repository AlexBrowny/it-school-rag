/**
 * Markdown → retrieval chunks. Pure functions (no I/O) so they are trivial to test.
 *
 * Every `###` item (a course, an FAQ answer, a teacher) becomes its own chunk, and every `##`
 * section without `###` children becomes one chunk. Each chunk carries its document title and
 * heading path so it stays self-contained when retrieved on its own.
 */
export interface Chunk {
  id: string;
  /** Short stable key derived from the file name, e.g. "price", "faq", "schedule". */
  docKey: string;
  docTitle: string;
  /** Heading path, e.g. "Курсы и цены › Frontend-разработчик". */
  heading: string;
  body: string;
  /** Text used for embeddings and for citing: title + heading + body. */
  text: string;
}

const DOC_KEYS: Record<string, string> = {
  "price-list": "price",
  faq: "faq",
  "schedule-and-contacts": "schedule",
};

export function docKey(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
  return DOC_KEYS[base] ?? base;
}

const MAX_CHUNK_CHARS = 1400;

function splitLong(body: string, maxChars: number): string[] {
  if (body.length <= maxChars) return [body];
  const lines = body.split("\n");
  // Repeat a table header on every part so split tables stay readable.
  const tableHeader = lines[0]?.startsWith("|") && lines[1]?.startsWith("|") ? [lines[0], lines[1]] : [];
  const parts: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length + 1 > maxChars && current.length > 0) {
      parts.push(current.join("\n"));
      current = line.startsWith("|") ? [...tableHeader] : [];
      size = current.join("\n").length;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length > 0) parts.push(current.join("\n"));
  return parts;
}

export function chunkDocument(fileName: string, markdown: string, maxChars: number = MAX_CHUNK_CHARS): Chunk[] {
  const key = docKey(fileName);
  const chunks: Chunk[] = [];
  let docTitle = key;
  let h2 = "";
  let h3 = "";
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    buffer = [];
    if (!body) return;
    const heading = [h2, h3].filter(Boolean).join(" › ") || docTitle;
    for (const part of splitLong(body, maxChars)) {
      chunks.push({
        id: `${key}:${chunks.length}`,
        docKey: key,
        docTitle,
        heading,
        body: part,
        text: `${docTitle} › ${heading}\n${part}`,
      });
    }
  };

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const heading = /^(#{1,3})\s+(.*\S)\s*$/.exec(line);
    if (!heading) {
      buffer.push(line);
      continue;
    }
    flush();
    const level = heading[1].length;
    const title = heading[2].trim();
    if (level === 1) {
      docTitle = title;
      h2 = "";
      h3 = "";
    } else if (level === 2) {
      h2 = title;
      h3 = "";
    } else {
      h3 = title;
    }
  }
  flush();
  return chunks;
}
