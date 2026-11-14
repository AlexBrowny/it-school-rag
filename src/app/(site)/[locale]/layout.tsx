import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/sections/Navbar";
import { isLocale, LOCALE_LABELS, LOCALES } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { inter } from "@/lib/fonts";
import { getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: { title: dict.meta.title, description: dict.meta.description, type: "website", locale },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const settings = getSettings();
  const schoolName = settings.school_name || "Orbit IT School";

  return (
    <html lang={LOCALE_LABELS[locale].htmlLang} className={inter.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-white"
        >
          {dict.nav.skip}
        </a>
        <Navbar locale={locale} schoolName={schoolName} nav={dict.nav} />
        <main id="main">{children}</main>
        <Footer locale={locale} schoolName={schoolName} dict={dict} settings={settings} />
        <ChatWidget locale={locale} schoolName={schoolName} dict={dict.chat} />
      </body>
    </html>
  );
}
