import { describe, expect, it } from "vitest";
import { buildResourceSchema, leadSchema, projectUrlsSchema, settingsSchema } from "@/lib/validators";

describe("leadSchema", () => {
  const valid = { name: "Алишер", contact: "+998 90 123 45 67", message: "Hello", locale: "ru" as const };

  it("accepts phone, email and telegram contacts", () => {
    for (const contact of ["+998 90 123 45 67", "alisher@example.com", "@alisher_dev"]) {
      expect(leadSchema.safeParse({ ...valid, contact }).success).toBe(true);
    }
  });

  it("rejects short names and garbage contacts", () => {
    expect(leadSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, contact: "not a contact" }).success).toBe(false);
  });

  it("rejects an unknown locale", () => {
    expect(leadSchema.safeParse({ ...valid, locale: "de" }).success).toBe(false);
  });

  it("rejects a filled honeypot field", () => {
    expect(leadSchema.safeParse({ ...valid, website: "http://spam.example" }).success).toBe(false);
  });

  it("caps the message length", () => {
    expect(leadSchema.safeParse({ ...valid, message: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("buildResourceSchema(courses)", () => {
  const schema = buildResourceSchema("courses");
  const valid = {
    title_ru: "Курс", title_en: "", title_uz: "",
    summary_ru: "Описание", summary_en: "", summary_uz: "",
    program_ru: "", program_en: "", program_uz: "",
    category: "frontend", level: "beginner", format: "online",
    duration_months: "6", price: 100, sort_order: 0, published: true,
  };

  it("accepts a valid course and coerces numbers", () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.duration_months).toBe(6);
  });

  it("requires the Russian title only", () => {
    expect(schema.safeParse({ ...valid, title_ru: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, title_en: "" }).success).toBe(true);
  });

  it("rejects unknown categories and out-of-range numbers", () => {
    expect(schema.safeParse({ ...valid, category: "astrology" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, duration_months: 99 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, price: -1 }).success).toBe(false);
  });

  it("strips unknown keys so they cannot reach SQL", () => {
    const result = schema.safeParse({ ...valid, "id; DROP TABLE courses": 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).not.toContain("id; DROP TABLE courses");
  });
});

describe("projectUrlsSchema", () => {
  it("allows empty and http(s) URLs only", () => {
    expect(projectUrlsSchema.safeParse({ demo_url: "", repo_url: "https://github.com/x/y" }).success).toBe(true);
    expect(projectUrlsSchema.safeParse({ demo_url: "javascript:alert(1)", repo_url: "" }).success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("keeps only known setting keys", () => {
    const result = settingsSchema.parse({ phone: " +998 71 ", evil: "x", address_ru: "Ташкент" });
    expect(result).toEqual({ phone: "+998 71", address_ru: "Ташкент" });
  });
});
