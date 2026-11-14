import { notFound } from "next/navigation";
import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/sections/About";
import { Contacts } from "@/components/sections/Contacts";
import { Courses } from "@/components/sections/Courses";
import { Projects } from "@/components/sections/Projects";
import { Reviews } from "@/components/sections/Reviews";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPublicCourses, getPublicProjects, getPublicReviews, getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const settings = getSettings();
  const courses = getPublicCourses(locale);
  const projects = getPublicProjects(locale);
  const reviews = getPublicReviews(locale);

  return (
    <>
      <Hero
        locale={locale}
        dict={dict}
        stats={{
          students: toNumber(settings.stat_students, 0),
          employed: toNumber(settings.stat_employed, 0),
          years: toNumber(settings.stat_years, 0),
          mentors: toNumber(settings.stat_mentors, 0),
        }}
      />
      <About dict={dict} />
      <Courses courses={courses} dict={dict} currency={settings.currency || "$"} />
      <Projects projects={projects} dict={dict} />
      <Reviews reviews={reviews} dict={dict} />
      <Contacts locale={locale} dict={dict} settings={settings} courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
    </>
  );
}
