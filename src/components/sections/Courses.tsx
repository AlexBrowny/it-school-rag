"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { PROFESSIONS, isProfessionKey, type ProfessionKey } from "@/config/professions";
import type { Dictionary } from "@/i18n/dictionaries";
import { CATEGORY_EVENT, COURSE_EVENT } from "@/lib/events";
import type { PublicCourse } from "@/lib/repo";

interface CoursesProps {
  courses: PublicCourse[];
  dict: Dictionary;
  currency: string;
}

type Filter<T extends string> = T | "all";

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: Filter<T>;
  options: { value: T; label: string }[];
  onChange: (next: Filter<T>) => void;
  allLabel: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-2">
      <span className="text-[13px] font-semibold uppercase tracking-wide text-content-2">{label}</span>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [scrollbar-width:none]">
        <button type="button" className="chip" aria-pressed={value === "all"} onClick={() => onChange("all")}>
          {allLabel}
        </button>
        {options.map((option) => (
          <button key={option.value} type="button" className="chip" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Courses({ courses, dict, currency }: CoursesProps) {
  const { courses: t, professions } = dict;
  const [category, setCategory] = useState<Filter<ProfessionKey>>("all");
  const [level, setLevel] = useState<Filter<string>>("all");
  const [format, setFormat] = useState<Filter<string>>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  // A profession picked on the hero planet pre-filters this list.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (isProfessionKey(detail)) {
        setCategory(detail);
        setLevel("all");
        setFormat("all");
      }
    };
    window.addEventListener(CATEGORY_EVENT, handler);
    return () => window.removeEventListener(CATEGORY_EVENT, handler);
  }, []);

  const presentCategories = useMemo(() => {
    const present = new Set(courses.map((course) => course.category));
    return PROFESSIONS.filter((p) => present.has(p.key)).map((p) => ({ value: p.key, label: professions[p.key].name }));
  }, [courses, professions]);

  const visible = useMemo(
    () =>
      courses.filter(
        (course) =>
          (category === "all" || course.category === category) &&
          (level === "all" || course.level === level) &&
          (format === "all" || course.format === format),
      ),
    [courses, category, level, format],
  );

  const levels = Object.entries(t.levels).map(([value, label]) => ({ value, label }));
  const formats = Object.entries(t.formats).map(([value, label]) => ({ value, label }));
  const filtered = category !== "all" || level !== "all" || format !== "all";

  const reset = () => {
    setCategory("all");
    setLevel("all");
    setFormat("all");
  };

  return (
    <section id="courses" aria-labelledby="courses-title" className="section bg-surface-2">
      <div className="container-x">
        <SectionHeading id="courses-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

        <div className="mt-12 grid grid-cols-1 gap-6 rounded-[28px] bg-card p-5 shadow-[var(--shadow-card)] md:p-7">
          <FilterGroup label={t.filters.category} value={category} options={presentCategories} onChange={setCategory} allLabel={t.filters.all} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FilterGroup label={t.filters.level} value={level} options={levels} onChange={setLevel} allLabel={t.filters.all} />
            <FilterGroup label={t.filters.format} value={format} options={formats} onChange={setFormat} allLabel={t.filters.all} />
          </div>
        </div>

        <p className="mt-6 text-[15px] text-content-2" role="status" aria-live="polite">
          {t.count} <span className="font-semibold text-content">{visible.length}</span>
          {filtered && (
            <button type="button" onClick={reset} className="ml-3 min-h-11 text-accent-text underline-offset-4 hover:underline">
              {t.reset}
            </button>
          )}
        </p>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-[28px] bg-card p-10 text-center shadow-[var(--shadow-card)]">
            <p className="mx-auto max-w-md text-content-2">{t.empty}</p>
            <button type="button" onClick={reset} className="btn btn-quiet mt-6">
              {t.reset}
            </button>
          </div>
        ) : (
          <ul className="mt-4 grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((course) => {
              const meta = PROFESSIONS.find((p) => p.key === course.category);
              const open = expanded === course.id;
              return (
                <li key={course.id} className="rounded-[var(--radius-card)] bg-card p-6 shadow-[var(--shadow-card)] transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]">
                  <div className="flex items-center gap-2 text-[14px] font-medium text-content-2">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: `hsl(${meta?.hue ?? 210} 90% 58%)` }} />
                    {professions[course.category as ProfessionKey]?.name ?? course.category}
                  </div>
                  <h3 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight">{course.title}</h3>
                  <p className="mt-2 text-[16px] leading-snug text-content-2">{course.summary}</p>

                  <dl className="mt-5 grid grid-cols-3 gap-2 text-[14px]">
                    <div>
                      <dt className="text-content-2">{t.labels.duration}</dt>
                      <dd className="font-semibold">
                        {course.durationMonths} {t.labels.months}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-content-2">{t.labels.level}</dt>
                      <dd className="font-semibold">{t.levels[course.level as keyof typeof t.levels] ?? course.level}</dd>
                    </div>
                    <div>
                      <dt className="text-content-2">{t.labels.format}</dt>
                      <dd className="font-semibold">{t.formats[course.format as keyof typeof t.formats] ?? course.format}</dd>
                    </div>
                  </dl>

                  {course.program.length > 0 && (
                    <div className="mt-5 border-t border-line pt-2">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`program-${course.id}`}
                        onClick={() => setExpanded(open ? null : course.id)}
                        className="flex min-h-11 w-full items-center justify-between text-left text-[16px] font-medium"
                      >
                        {open ? t.labels.hideDetails : t.labels.details}
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
                          <path d="M2 5l5 5 5-5" />
                        </svg>
                      </button>
                      {open && (
                        <ul id={`program-${course.id}`} className="mb-2 mt-1 space-y-2 text-[15px] text-content-2">
                          {course.program.map((item) => (
                            <li key={item} className="flex gap-3">
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0">
                                <path d="M4 9.5l3.2 3L14 5.5" />
                              </svg>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p>
                      <span className="text-[26px] font-semibold tracking-tight">
                        {currency}
                        {new Intl.NumberFormat("en").format(course.price)}
                      </span>{" "}
                      <span className="text-[14px] text-content-2">{t.labels.perMonth}</span>
                    </p>
                    <a
                      href="#contacts"
                      onClick={() => window.dispatchEvent(new CustomEvent<number>(COURSE_EVENT, { detail: course.id }))}
                      className="btn btn-primary !min-h-11 !px-5 !text-[15px]"
                    >
                      {t.labels.apply}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
