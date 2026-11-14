import Link from "next/link";
import { getDashboardStats, listLeads } from "@/lib/repo";

export default function AdminDashboardPage() {
  const stats = getDashboardStats();
  const latest = listLeads(5);

  const cards = [
    { label: "Новые заявки", value: stats.leadsNew, href: "/admin/leads", highlight: stats.leadsNew > 0 },
    { label: "Всего заявок", value: stats.leadsTotal, href: "/admin/leads" },
    { label: "Курсов на сайте", value: stats.courses, href: "/admin/courses" },
    { label: "Проектов на сайте", value: stats.projects, href: "/admin/projects" },
    { label: "Отзывы на модерации", value: stats.reviewsPending, href: "/admin/reviews", highlight: stats.reviewsPending > 0 },
    { label: "Опубликовано отзывов", value: stats.reviewsApproved, href: "/admin/reviews" },
  ];

  return (
    <div>
      <h1 className="text-[32px] font-bold tracking-tight">Дашборд</h1>
      <p className="mt-1 text-content-2">Что происходит на сайте прямо сейчас.</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <li key={card.label}>
            <Link
              href={card.href}
              className={`block rounded-[24px] p-6 shadow-[var(--shadow-card)] transition-transform duration-300 hover:-translate-y-0.5 ${
                card.highlight ? "bg-accent text-white" : "bg-card"
              }`}
            >
              <p className={`text-[15px] ${card.highlight ? "text-white" : "text-content-2"}`}>{card.label}</p>
              <p className="mt-2 text-[44px] font-semibold leading-none tracking-tight">{card.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="latest" className="mt-10">
        <div className="flex items-center justify-between">
          <h2 id="latest" className="text-[22px] font-semibold tracking-tight">
            Последние заявки
          </h2>
          <Link href="/admin/leads" className="inline-flex min-h-11 items-center text-accent-text hover:underline">
            Все заявки →
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-4 rounded-[24px] bg-card p-8 text-center text-content-2">Заявок пока нет.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[24px] bg-card shadow-[var(--shadow-card)]">
            {latest.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                <div>
                  <p className="font-semibold">{lead.name}</p>
                  <p className="text-[14px] text-content-2">{lead.contact}</p>
                </div>
                <p className="text-[14px] text-content-2">{new Date(lead.createdAt).toLocaleString("ru-RU")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
