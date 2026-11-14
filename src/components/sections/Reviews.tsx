import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { format, type Dictionary } from "@/i18n/dictionaries";
import type { PublicReview } from "@/lib/repo";

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="18" height="18" viewBox="0 0 20 20" aria-hidden fill={n <= rating ? "#ff9f0a" : "none"} stroke={n <= rating ? "#ff9f0a" : "var(--content-2)"} strokeWidth="1.4" strokeLinejoin="round">
          <path d="M10 1.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z" />
        </svg>
      ))}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Reviews({ reviews, dict }: { reviews: PublicReview[]; dict: Dictionary }) {
  const { reviews: t } = dict;
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="section bg-surface-2">
      <div className="container-x">
        <SectionHeading id="reviews-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      </div>

      {reviews.length === 0 ? (
        <p className="container-x mt-12 text-content-2">{t.empty}</p>
      ) : (
        <Reveal className="mt-12">
          <ul
            tabIndex={0}
            aria-label={t.title}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-8 [scrollbar-width:none] md:px-[max(2rem,calc((100vw-1056px)/2))] [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((review, index) => (
              <li key={review.id} className="w-[min(86vw,380px)] shrink-0 snap-center md:snap-start">
                <figure className="flex h-full flex-col rounded-[28px] bg-card p-7 shadow-[var(--shadow-card)]">
                  <Stars rating={review.rating} label={format(t.rating, { rating: review.rating })} />
                  <blockquote className="mt-5 flex-1 text-[18px] leading-snug tracking-tight">“{review.text}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, hsl(${(index * 57 + 210) % 360} 80% 55%), hsl(${(index * 57 + 260) % 360} 80% 45%))` }}
                    >
                      {initials(review.author)}
                    </span>
                    <span>
                      <span className="block text-[16px] font-semibold">{review.author}</span>
                      <span className="block text-[14px] leading-snug text-content-2">{review.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}
