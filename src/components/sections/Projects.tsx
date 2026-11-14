import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { PROFESSIONS } from "@/config/professions";
import { safeHttpUrl } from "@/lib/url";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PublicProject } from "@/lib/repo";

const GRADIENTS = [
  ["#0a84ff", "#5e5ce6"],
  ["#5e5ce6", "#bf5af2"],
  ["#ff375f", "#ff9f0a"],
  ["#ff9f0a", "#ff453a"],
  ["#30d158", "#0a84ff"],
  ["#64d2ff", "#5e5ce6"],
] as const;

function Cover({ accent, seed }: { accent: number; seed: number }) {
  const [from, to] = GRADIENTS[accent % GRADIENTS.length];
  return (
    <div aria-hidden className="relative h-full min-h-[190px] overflow-hidden" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-12 left-6 size-40 rounded-full bg-black/20 blur-2xl" />
      {/* Abstract window sketch */}
      <div className="absolute inset-x-6 bottom-0 top-8 rounded-t-2xl bg-white/90 p-3 shadow-2xl dark:bg-white/85">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-[#ff5f57]" />
          <span className="size-2 rounded-full bg-[#febc2e]" />
          <span className="size-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2.5 rounded-full bg-black/10" style={{ width: `${55 + ((seed * 13) % 35)}%` }} />
          <div className="h-2.5 w-4/5 rounded-full bg-black/[0.07]" />
          <div className="h-2.5 rounded-full bg-black/[0.07]" style={{ width: `${30 + ((seed * 7) % 40)}%` }} />
        </div>
      </div>
    </div>
  );
}

export function Projects({ projects, dict }: { projects: PublicProject[]; dict: Dictionary }) {
  const { projects: t, professions } = dict;
  return (
    <section id="projects" aria-labelledby="projects-title" className="section bg-surface">
      <div className="container-x">
        <SectionHeading id="projects-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

        {projects.length === 0 ? (
          <p className="mt-12 text-content-2">{t.empty}</p>
        ) : (
          <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => {
              const demo = safeHttpUrl(project.demoUrl);
              const repo = safeHttpUrl(project.repoUrl);
              const feature = index === 0;
              const meta = PROFESSIONS.find((p) => p.key === project.category);
              return (
                <li key={project.id} className={feature ? "lg:col-span-2" : ""}>
                  <Reveal delay={(index % 3) * 0.08} className="h-full">
                    <article className={`group flex h-full flex-col overflow-hidden rounded-[28px] bg-card shadow-[var(--shadow-card)] transition-shadow duration-500 hover:shadow-[var(--shadow-lift)] ${feature ? "lg:flex-row" : ""}`}>
                      <div className={feature ? "lg:w-[46%]" : "h-[210px]"}>
                        <Cover accent={project.accent} seed={project.id} />
                      </div>
                      <div className="flex flex-1 flex-col p-6 sm:p-7">
                        <p className="flex items-center gap-2 text-[14px] font-medium text-content-2">
                          <span aria-hidden className="size-2 rounded-full" style={{ background: `hsl(${meta?.hue ?? 210} 90% 58%)` }} />
                          {professions[project.category as keyof typeof professions]?.name ?? project.category}
                        </p>
                        <h3 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">{project.title}</h3>
                        <p className="mt-2 text-[16px] leading-snug text-content-2">{project.description}</p>
                        {project.tags.length > 0 && (
                          <ul className="mt-4 flex flex-wrap gap-2">
                            {project.tags.map((tag) => (
                              <li key={tag} className="rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-content">
                                {tag}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                          <p className="text-[14px] text-content-2">
                            {t.by} <span className="font-semibold text-content">{project.author}</span>
                          </p>
                          <div className="flex gap-1">
                            {demo && (
                              <a href={demo} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-medium text-accent-text hover:underline">
                                {t.demo} ↗
                              </a>
                            )}
                            {repo && (
                              <a href={repo} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-medium text-accent-text hover:underline">
                                {t.code} ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
