"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/components/admin/api-client";

const NAV = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/leads", label: "Заявки" },
  { href: "/admin/courses", label: "Курсы" },
  { href: "/admin/projects", label: "Проекты" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/settings", label: "Настройки" },
] as const;

export function AdminShell({ username, children }: { username: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-card lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block lg:px-6 lg:py-7">
          <p className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            <span aria-hidden className="inline-block size-5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dd3fc,#6366f1_55%,#1e1b4b)]" />
            Orbit Admin
          </p>
          <p className="hidden text-[13px] text-content-2 lg:mt-1 lg:block">{username}</p>
          <button type="button" onClick={logout} className="btn btn-quiet !min-h-11 !px-4 !text-[15px] lg:hidden">
            Выйти
          </button>
        </div>
        <nav aria-label="Разделы админ-панели" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0 [scrollbar-width:none]">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-[16px] font-medium transition-colors ${
                  active ? "bg-accent text-white" : "text-content hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-3 pb-6 pt-6 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:block">
          <a href="/" target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-xl px-4 text-[15px] text-content-2 hover:bg-surface-2">
            Открыть сайт ↗
          </a>
          <button type="button" onClick={logout} className="flex min-h-11 w-full items-center rounded-xl px-4 text-left text-[15px] text-content-2 hover:bg-surface-2">
            Выйти
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
