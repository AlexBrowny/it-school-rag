"use client";

import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

interface NavbarProps {
  locale: Locale;
  schoolName: string;
  nav: Dictionary["nav"];
}

const LINKS = ["about", "courses", "projects", "reviews", "contacts"] as const;

export function Navbar({ locale, schoolName, nav }: NavbarProps) {
  const [overHero, setOverHero] = useState(true);
  const [open, setOpen] = useState(false);

  // The hero is always dark; switch the bar to its dark scope while it sits above it.
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setOverHero(entry.isIntersecting), {
      rootMargin: "-60px 0px 0px 0px",
      threshold: 0,
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const [first, ...rest] = schoolName.split(" ");

  return (
    <header className={`fixed inset-x-0 top-0 z-50 ${overHero ? "scope-dark" : ""}`}>
      <div className="glass border-x-0 border-t-0">
        <div className="container-x flex h-[60px] items-center justify-between gap-3">
          <a href={`/${locale}`} className="flex min-h-11 items-center gap-2 text-[17px] font-semibold tracking-tight text-content">
            <span aria-hidden className="inline-block size-5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dd3fc,#6366f1_55%,#1e1b4b)] shadow-[0_0_14px_rgb(99_102_241/0.7)]" />
            <span>
              {first}
              {rest.length > 0 && <span className="text-content-2"> {rest.join(" ")}</span>}
            </span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {LINKS.map((key) => (
              <a
                key={key}
                href={`#${key}`}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] text-content-2 transition-colors hover:text-content"
              >
                {nav[key]}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LocaleSwitcher current={locale} label={nav.language} />
            </div>
            <a href="#contacts" className="btn btn-primary hidden !min-h-11 !px-5 !text-[15px] md:inline-flex">
              {nav.enroll}
            </a>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full text-content lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? nav.closeMenu : nav.openMenu}
              onClick={() => setOpen((value) => !value)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                {open ? <path d="M5 5l12 12M17 5L5 17" /> : <path d="M3 7h16M3 15h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div id="mobile-menu" className="container-x pb-5 lg:hidden">
            <ul className="flex flex-col">
              {LINKS.map((key) => (
                <li key={key} className="border-t border-line">
                  <a
                    href={`#${key}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center text-[19px] font-medium text-content"
                  >
                    {nav[key]}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-3">
              <LocaleSwitcher current={locale} label={nav.language} />
              <a href="#contacts" onClick={() => setOpen(false)} className="btn btn-primary !min-h-11">
                {nav.enroll}
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
