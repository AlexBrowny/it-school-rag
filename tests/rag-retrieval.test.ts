import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { chunkDocument, docKey } from "@/lib/rag/chunker";
import { Bm25Index, queryTokens, tokenize } from "@/lib/rag/lexical";
import { createRetriever } from "@/lib/rag/retriever";

const RAG_DIR = path.resolve(import.meta.dirname, "..", "rag-data");

describe("chunker", () => {
  const price = chunkDocument("01-price-list.md", fs.readFileSync(path.join(RAG_DIR, "01-price-list.md"), "utf8"));
  const faq = chunkDocument("02-faq.md", fs.readFileSync(path.join(RAG_DIR, "02-faq.md"), "utf8"));
  const schedule = chunkDocument("03-schedule-and-contacts.md", fs.readFileSync(path.join(RAG_DIR, "03-schedule-and-contacts.md"), "utf8"));

  it("maps file names to stable document keys", () => {
    expect(docKey("01-price-list.md")).toBe("price");
    expect(docKey("02-faq.md")).toBe("faq");
    expect(docKey("03-schedule-and-contacts.md")).toBe("schedule");
    expect(docKey("99-something.md")).toBe("something");
  });

  it("creates one self-contained chunk per course, FAQ answer and teacher", () => {
    expect(price.filter((c) => c.heading.startsWith("Курсы и цены ›")).length).toBe(12);
    expect(faq.filter((c) => c.heading.includes("›")).length).toBe(8);
    expect(schedule.filter((c) => c.heading.startsWith("График работы преподавателей ›")).length).toBe(7);
  });

  it("keeps the price next to the course name", () => {
    const qa = price.find((c) => c.heading.endsWith("QA-инженер (тестировщик)"));
    expect(qa?.body).toContain("1 100 000 сум в месяц");
    expect(qa?.text.startsWith("Прайс-лист Orbit IT School")).toBe(true);
  });

  it("never produces oversized or empty chunks", () => {
    for (const chunk of [...price, ...faq, ...schedule]) {
      expect(chunk.body.trim().length).toBeGreaterThan(0);
      expect(chunk.body.length).toBeLessThanOrEqual(1500);
    }
  });

  it("repeats the table header when a long table is split", () => {
    const table = ["| A | B |", "| --- | --- |", ...Array.from({ length: 40 }, (_, i) => `| row ${i} | ${"x".repeat(60)} |`)].join("\n");
    const parts = chunkDocument("t.md", `# T\n## S\n${table}`, 600);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part.body.startsWith("| A | B |")).toBe(true);
  });
});

describe("lexical helpers", () => {
  it("drops stopwords and stems Russian word forms together", () => {
    expect(tokenize("Как оплатить обучение?")).toEqual(expect.arrayContaining(["оплати", "обучен"]));
    expect(tokenize("рассрочка")[0]).toBe(tokenize("рассрочку")[0]);
  });

  it("expands English and Uzbek hints into document vocabulary", () => {
    expect(queryTokens("how much is the price")).toEqual(expect.arrayContaining(tokenize("цена")));
    expect(queryTokens("ish vaqti")).toEqual(expect.arrayContaining(tokenize("график")));
  });

  it("ranks the matching document first", () => {
    const index = new Bm25Index([
      { id: "a", text: "оплата картой Humo и Click" },
      { id: "b", text: "график работы по субботам" },
    ]);
    expect(index.search("когда работает школа в субботу")[0].id).toBe("b");
    expect(index.search("zzzz")).toEqual([]);
  });
});

describe("retrieval quality on the real knowledge base (keyword mode, no API key)", () => {
  const retriever = createRetriever({ dir: RAG_DIR });

  const cases: { q: string; expectHeading: string; topK?: number }[] = [
    { q: "Сколько стоит курс QA?", expectHeading: "QA-инженер" },
    { q: "цена Frontend", expectHeading: "Frontend-разработчик" },
    { q: "Сколько стоит курс по Unity для игр", expectHeading: "Разработчик игр (Unity)" },
    { q: "How much is the UI/UX designer course?", expectHeading: "UI/UX-дизайнер" },
    { q: "kiberxavfsizlik kursi narxi qancha", expectHeading: "Кибербезопасность" },
    { q: "Есть ли рассрочка?", expectHeading: "Рассрочка и скидки" },
    { q: "Можно ли вернуть деньги если откажусь", expectHeading: "Можно ли отказаться от обучения и вернуть деньги?" },
    { q: "Что взять с собой на первое занятие?", expectHeading: "Что взять с собой на первое занятие и как подготовиться?" },
    { q: "Как оплатить обучение картой Click?", expectHeading: "Как и когда можно оплатить обучение?" },
    { q: "Что делать если я пропустил занятие, можно перенести?", expectHeading: "Что делать, если я не могу прийти на занятие? Можно ли перенести занятие?" },
    { q: "Помогаете с трудоустройством?", expectHeading: "Какие у вас гарантии качества? Помогаете ли вы с трудоустройством?" },
    { q: "Как забронировать место в группе", expectHeading: "Можно ли забронировать место в группе и попробовать занятие до оплаты?" },
    { q: "Когда работает Азамат Исмоилов в среду?", expectHeading: "Азамат Исмоилов" },
    { q: "Кто преподаёт Backend?", expectHeading: "Рустам Каримов" },
    { q: "Какой у вас адрес и телефон?", expectHeading: "Адрес и режим работы школы" },
    { q: "Telegram для связи", expectHeading: "Контакты для записи" },
    { q: "school address", expectHeading: "Адрес и режим работы школы" },
  ];

  it.each(cases)("$q", async ({ q, expectHeading, topK = 3 }) => {
    const hits = await retriever.retrieve(q, topK);
    const headings = hits.map((hit) => hit.chunk.heading);
    expect(headings.some((h) => h.includes(expectHeading)), `got: ${headings.join(" | ")}`).toBe(true);
  });

  it.each([
    ["How much is the Backend course?", "Backend-разработчик (Node.js)"],
    ["How much does the AI course cost?", "AI и машинное обучение"],
    ["Сколько стоит DevOps?", "DevOps-инженер"],
  ])("ranks the price chunk first for %s", async (q, heading) => {
    const [top] = await retriever.retrieve(q, 1);
    expect(top.chunk.heading).toBe(`Курсы и цены › ${heading}`);
  });

  it("returns nothing for unrelated or empty queries", async () => {
    expect(await retriever.retrieve("   ")).toEqual([]);
    expect(await retriever.retrieve("квантовая гравитация и кулинария")).toEqual([]);
  });

  it("reports a non-trivial index size", () => {
    expect(retriever.chunkCount()).toBeGreaterThan(30);
  });
});
