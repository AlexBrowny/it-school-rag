export const LOCALES = ["ru", "en", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_LABELS: Record<Locale, { short: string; name: string; htmlLang: string }> = {
  ru: { short: "RU", name: "Русский", htmlLang: "ru" },
  en: { short: "EN", name: "English", htmlLang: "en" },
  uz: { short: "UZ", name: "O‘zbekcha", htmlLang: "uz" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Picks the best supported locale from an Accept-Language header value. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export type Localized<T extends string = string> = Record<Locale, T>;

/** Reads `<field>_ru/_en/_uz` from a row and falls back to Russian, then any non-empty value. */
export function pickLocalized(row: Record<string, unknown>, field: string, locale: Locale): string {
  const value = (key: string): string => {
    const raw = row[`${field}_${key}`];
    return typeof raw === "string" ? raw.trim() : "";
  };
  return value(locale) || value(DEFAULT_LOCALE) || value("en") || value("uz");
}
