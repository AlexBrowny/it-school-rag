import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, negotiateLocale, pickLocalized } from "@/i18n/config";
import { format, getDictionary } from "@/i18n/dictionaries";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  }
  return typeof value;
}

describe("negotiateLocale", () => {
  it("returns the default when no header is present", () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it("picks the highest-quality supported language", () => {
    expect(negotiateLocale("de;q=0.9,uz;q=0.8,en;q=0.5")).toBe("uz");
    expect(negotiateLocale("en-US,en;q=0.9,ru;q=0.8")).toBe("en");
  });

  it("falls back to the default for unsupported languages", () => {
    expect(negotiateLocale("fr-FR,de;q=0.8")).toBe(DEFAULT_LOCALE);
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("uz")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("admin")).toBe(false);
  });
});

describe("pickLocalized", () => {
  const row = { title_ru: "Привет", title_en: "Hello", title_uz: "" };

  it("returns the requested language when present", () => {
    expect(pickLocalized(row, "title", "en")).toBe("Hello");
  });

  it("falls back to Russian when the requested language is empty", () => {
    expect(pickLocalized(row, "title", "uz")).toBe("Привет");
  });

  it("returns an empty string when nothing is available", () => {
    expect(pickLocalized({}, "title", "en")).toBe("");
  });
});

describe("dictionaries", () => {
  it("keep exactly the same keys and value types in every language", () => {
    const ru = shape(getDictionary("ru"));
    expect(shape(getDictionary("en"))).toEqual(ru);
    expect(shape(getDictionary("uz"))).toEqual(ru);
  });

  it("have no empty strings", () => {
    const empties: string[] = [];
    const walk = (value: unknown, trail: string) => {
      if (typeof value === "string" && value.trim() === "") empties.push(trail);
      else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${trail}[${i}]`));
      else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, `${trail}.${k}`));
    };
    for (const locale of ["ru", "en", "uz"] as const) walk(getDictionary(locale), locale);
    expect(empties).toEqual([]);
  });
});

describe("format", () => {
  it("interpolates placeholders", () => {
    expect(format("Rated {rating} out of 5", { rating: 4 })).toBe("Rated 4 out of 5");
  });
});
