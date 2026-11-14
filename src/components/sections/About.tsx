import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/sections/SectionHeading";
import type { Dictionary } from "@/i18n/dictionaries";

const ICONS = [
  // code
  "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  // mentor
  "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  // briefcase
  "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  // layout
  "M3 5h18v14H3zM3 10h18M10 10v9",
  // community
  "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a2.5 2.5 0 100-5M16 20a5 5 0 015-5",
  // refresh
  "M20 11a8 8 0 10-2.3 6M20 5v6h-6",
] as const;

export function About({ dict }: { dict: Dictionary }) {
  const { about } = dict;
  return (
    <section id="about" aria-labelledby="about-title" className="section bg-surface">
      <div className="container-x">
        <SectionHeading id="about-title" eyebrow={about.eyebrow} title={about.title} subtitle={about.subtitle} />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {about.items.map((item, index) => (
            <li key={item.title}>
              <Reveal delay={(index % 3) * 0.08} className="h-full">
                <div className="h-full rounded-[28px] bg-surface-2 p-7 transition-transform duration-500 [transition-timing-function:var(--ease-apple)] hover:-translate-y-1">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-text">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={ICONS[index % ICONS.length]} />
                    </svg>
                  </span>
                  <h3 className="mt-6 text-[22px] font-semibold leading-tight tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-[16px] leading-snug text-content-2">{item.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
