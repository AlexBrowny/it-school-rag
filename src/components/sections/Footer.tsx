import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

interface FooterProps {
  locale: Locale;
  schoolName: string;
  dict: Dictionary;
  settings: Record<string, string>;
}

const LINKS = ["about", "courses", "projects", "reviews", "contacts"] as const;

export function Footer({ locale, schoolName, dict, settings }: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="scope-dark bg-surface">
      <div className="container-x py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="text-xl font-semibold tracking-tight text-content">{schoolName}</p>
            <p className="mt-2 text-content-2">{dict.footer.tagline}</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 sm:grid-cols-3">
            {LINKS.map((key) => (
              <a key={key} href={`#${key}`} className="flex min-h-11 items-center text-[15px] text-content-2 transition-colors hover:text-content">
                {dict.nav[key]}
              </a>
            ))}
            <a href={`/${locale}#top`} className="flex min-h-11 items-center text-[15px] text-content-2 transition-colors hover:text-content">
              {dict.footer.backToTop}
            </a>
          </nav>
          <LocaleSwitcher current={locale} label={dict.nav.language} />
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-[13px] text-content-2 sm:flex-row sm:justify-between">
          <p>
            © {year} {schoolName}. {dict.footer.rights}
          </p>
          <p>{settings.email}</p>
        </div>
      </div>
    </footer>
  );
}
