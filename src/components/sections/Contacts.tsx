import { Reveal } from "@/components/ui/Reveal";
import { LeadForm } from "@/components/sections/LeadForm";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { pickLocalized, type Locale } from "@/i18n/config";
import { safeHttpUrl } from "@/lib/url";
import type { Dictionary } from "@/i18n/dictionaries";

interface ContactsProps {
  locale: Locale;
  dict: Dictionary;
  settings: Record<string, string>;
  courses: { id: number; title: string }[];
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <dt className="text-[14px] text-content-2">{label}</dt>
      <dd className="mt-1 text-[19px] font-medium leading-snug tracking-tight">{children}</dd>
    </div>
  );
}

export function Contacts({ locale, dict, settings, courses }: ContactsProps) {
  const t = dict.contacts;
  const phone = settings.phone;
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  const address = pickLocalized(settings, "address", locale);
  const hours = pickLocalized(settings, "hours", locale);
  const socials = [
    { label: "Telegram", href: safeHttpUrl(settings.telegram) },
    { label: "Instagram", href: safeHttpUrl(settings.instagram) },
    { label: "YouTube", href: safeHttpUrl(settings.youtube) },
  ].filter((item): item is { label: string; href: string } => item.href !== null);

  return (
    <section id="contacts" aria-labelledby="contacts-title" className="section bg-surface">
      <div className="container-x">
        <SectionHeading id="contacts-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <Reveal>
            <dl className="rounded-[28px] bg-surface-2 p-7 sm:p-8">
              {phone && (
                <InfoRow label={t.info.phone}>
                  <a href={phoneHref} className="hover:text-accent-text">
                    {phone}
                  </a>
                </InfoRow>
              )}
              {settings.email && (
                <InfoRow label={t.info.email}>
                  <a href={`mailto:${settings.email}`} className="break-all hover:text-accent-text">
                    {settings.email}
                  </a>
                </InfoRow>
              )}
              {address && <InfoRow label={t.info.address}>{address}</InfoRow>}
              {hours && <InfoRow label={t.info.hours}>{hours}</InfoRow>}
              {socials.length > 0 && (
                <InfoRow label={t.info.social}>
                  <ul className="flex flex-wrap gap-x-2">
                    {socials.map((social) => (
                      <li key={social.label}>
                        <a href={social.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center pr-4 text-accent-text hover:underline">
                          {social.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </InfoRow>
              )}
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <LeadForm locale={locale} dict={t.form} courses={courses} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
