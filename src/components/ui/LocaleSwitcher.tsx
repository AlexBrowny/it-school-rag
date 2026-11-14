"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

interface LocaleSwitcherProps {
  current: Locale;
  label: string;
}

/** Segmented control (iOS style). Keeps the current #section when switching language. */
export function LocaleSwitcher({ current, label }: LocaleSwitcherProps) {
  const router = useRouter();

  return (
    <nav aria-label={label} className="inline-flex rounded-full bg-content/10 p-1">
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={`/${locale}`}
            lang={LOCALE_LABELS[locale].htmlLang}
            hrefLang={locale}
            aria-current={active ? "true" : undefined}
            title={LOCALE_LABELS[locale].name}
            onClick={(event) => {
              event.preventDefault();
              router.push(`/${locale}${window.location.hash}`);
            }}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
              active ? "bg-content text-surface" : "text-content-2 hover:text-content"
            }`}
          >
            {LOCALE_LABELS[locale].short}
          </Link>
        );
      })}
    </nav>
  );
}
