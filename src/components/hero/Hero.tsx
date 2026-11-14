"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PROFESSIONS, type ProfessionKey } from "@/config/professions";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { CATEGORY_EVENT } from "@/lib/events";

const Planet = dynamic(() => import("./Planet").then((module) => module.Planet), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center" aria-hidden>
      <div className="size-40 animate-pulse rounded-full bg-[radial-gradient(circle_at_32%_30%,#4f6bff55,#0b0b2e00_70%)]" />
    </div>
  ),
});

interface HeroProps {
  locale: Locale;
  dict: Dictionary;
  stats: { students: number; employed: number; years: number; mentors: number };
}

export function Hero({ locale, dict, stats }: HeroProps) {
  const [selected, setSelected] = useState<ProfessionKey | null>(null);
  const { hero, professions } = dict;

  const labels = useMemo(
    () => PROFESSIONS.map((p) => ({ key: p.key, name: professions[p.key].name })),
    [professions],
  );
  const active = selected ? PROFESSIONS.find((p) => p.key === selected) : undefined;

  const openCourses = useCallback(() => {
    if (!selected) return;
    window.dispatchEvent(new CustomEvent<ProfessionKey>(CATEGORY_EVENT, { detail: selected }));
  }, [selected]);

  const number = new Intl.NumberFormat(locale);
  const statItems = [
    { value: `${number.format(stats.students)}+`, label: hero.stats.students },
    { value: `${stats.employed}%`, label: hero.stats.employed },
    { value: `${stats.years}`, label: hero.stats.years },
    { value: `${stats.mentors}+`, label: hero.stats.mentors },
  ];

  return (
    <section id="top" className="scope-dark relative overflow-hidden bg-surface pt-[60px] text-content">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_55%_at_70%_50%,rgb(64_80_255/0.30),transparent_72%),radial-gradient(40%_30%_at_90%_15%,rgb(167_139_250/0.16),transparent_70%)]"
      />

      <div className="relative mx-auto grid w-full max-w-[1320px] gap-x-4 px-5 sm:px-8 lg:min-h-[min(calc(100dvh-60px),820px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:grid-rows-[1fr_auto] lg:[grid-template-areas:'text_stage'_'stats_stage']">
        <div className="pt-12 text-center lg:[grid-area:text] sm:pt-16 lg:self-center lg:pt-8 lg:text-left">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 className="mt-4 text-[clamp(42px,9vw,76px)] font-bold leading-[1.03] tracking-[-0.035em] lg:text-[clamp(44px,4.2vw,66px)]">
            {hero.title}
            <span className="block bg-gradient-to-r from-[#64d2ff] via-[#a78bfa] to-[#ff7ab8] bg-clip-text text-transparent">
              {hero.titleAccent}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[clamp(18px,2vw,21px)] leading-snug text-content-2 lg:mx-0">{hero.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <a href="#courses" className="btn btn-primary w-full sm:w-auto">
              {hero.ctaPrimary}
            </a>
            <a href="#contacts" className="btn btn-secondary w-full sm:w-auto">
              {hero.ctaSecondary}
            </a>
          </div>
        </div>

        <div className="relative -mx-5 mt-4 h-[clamp(350px,96vw,600px)] lg:[grid-area:stage] sm:-mx-8 lg:mx-0 lg:mt-0 lg:h-full lg:min-h-[560px]">
          <Planet labels={labels} selected={selected} onSelect={setSelected} ariaLabel={hero.planetLabel} />

          <div aria-live="polite" className="pointer-events-none absolute inset-x-4 bottom-3 flex justify-center sm:inset-x-8 lg:inset-x-0 lg:justify-start">
            {active ? (
              <div
                key={active.key}
                className="glass pointer-events-auto w-full max-w-[380px] animate-[card-in_0.5s_var(--ease-apple)] rounded-[24px] p-5 shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: `hsl(${active.hue} 90% 64%)` }} />
                    <h2 className="text-[22px] font-semibold tracking-tight">{professions[active.key].name}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label={hero.cardClose}
                    className="-mr-2 -mt-2 inline-flex size-11 items-center justify-center rounded-full text-content-2 transition-colors hover:text-content"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-[16px] leading-snug text-content-2">{professions[active.key].desc}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[15px] text-content">
                    <span className="text-[22px] font-semibold tracking-tight">{active.months}</span>{" "}
                    <span className="text-content-2">{hero.cardMonths}</span>
                  </p>
                  <a href="#courses" onClick={openCourses} className="btn btn-primary !min-h-11 !px-5 !text-[15px]">
                    {hero.cardCta}
                  </a>
                </div>
              </div>
            ) : (
              <p className="pointer-events-none px-4 py-2 text-center text-[14px] text-content-2 lg:text-left">{hero.hint}</p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-6 border-t border-line pb-10 pt-8 lg:[grid-area:stats] md:grid-cols-4 lg:pb-12">
          {statItems.map((item) => (
            <div key={item.label} className="px-2 text-center lg:text-left">
              <dt className="sr-only">{item.label}</dt>
              <dd className="whitespace-nowrap text-[clamp(26px,5vw,36px)] font-semibold leading-none tracking-tight lg:text-[clamp(24px,2.1vw,30px)]">{item.value}</dd>
              <p aria-hidden className="mt-2 text-[14px] leading-tight text-content-2">
                {item.label}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
