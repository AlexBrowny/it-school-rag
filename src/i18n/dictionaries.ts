import type { Locale } from "@/i18n/config";
import ru from "@/i18n/dictionaries/ru.json";
import en from "@/i18n/dictionaries/en.json";
import uz from "@/i18n/dictionaries/uz.json";

export type Dictionary = typeof ru;

// `en` and `uz` must keep exactly the same shape as `ru` (enforced by the type below + tests).
const dictionaries: Record<Locale, Dictionary> = { ru, en, uz };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
