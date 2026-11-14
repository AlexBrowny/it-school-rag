"use client";

import { useMemo, useState } from "react";
import { api } from "@/components/admin/api-client";
import type { Lead } from "@/lib/repo";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/validators";

const STATUS_LABEL: Record<LeadStatus, string> = { new: "Новая", contacted: "В работе", closed: "Закрыта" };
const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-[#0a84ff]/15 text-[#0a60c2] dark:text-[#64b5ff]",
  contacted: "bg-[#ff9f0a]/18 text-[#a05a00] dark:text-[#ffb340]",
  closed: "bg-[#30d158]/18 text-[#1d7a34] dark:text-[#4cd964]",
};

/** Neutralise spreadsheet formula injection and quote the cell. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCsv(leads: Lead[]) {
  const header = ["ID", "Дата", "Имя", "Контакт", "Курс", "Сообщение", "Язык", "Статус"];
  const lines = leads.map((l) =>
    [String(l.id), l.createdAt, l.name, l.contact, l.courseTitle ?? "", l.message, l.locale, STATUS_LABEL[l.status]].map(csvCell).join(","),
  );
  const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  // Revoking immediately can abort the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LeadsManager({ initial }: { initial: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => (filter === "all" ? leads : leads.filter((l) => l.status === filter)), [leads, filter]);
  const counts = useMemo(
    () => Object.fromEntries(LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])) as Record<LeadStatus, number>,
    [leads],
  );

  async function changeStatus(id: number, status: LeadStatus) {
    const previousStatus = leads.find((l) => l.id === id)?.status;
    setLeads((current) => current.map((l) => (l.id === id ? { ...l, status } : l)));
    const result = await api(`/api/admin/leads/${id}`, "PATCH", { status });
    if (!result.ok && previousStatus) {
      // Roll back only this lead so concurrent edits are not undone.
      setLeads((current) => current.map((l) => (l.id === id ? { ...l, status: previousStatus } : l)));
      setError(result.error ?? "Не удалось изменить статус");
    }
  }

  async function remove(id: number) {
    const result = await api(`/api/admin/leads/${id}`, "DELETE");
    setConfirmId(null);
    if (result.ok) setLeads((current) => current.filter((l) => l.id !== id));
    else setError(result.error ?? "Не удалось удалить");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">Заявки</h1>
          <p className="mt-1 text-content-2">Всего: {leads.length}</p>
        </div>
        <button type="button" onClick={() => exportCsv(visible)} disabled={visible.length === 0} className="btn btn-quiet">
          Экспорт CSV
        </button>
      </div>

      <div role="group" aria-label="Фильтр по статусу" className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          Все ({leads.length})
        </button>
        {LEAD_STATUSES.map((status) => (
          <button key={status} type="button" className="chip" aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {STATUS_LABEL[status]} ({counts[status]})
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-[14px] text-danger">
        {error}
      </p>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-[24px] bg-card p-10 text-center text-content-2">Заявок нет.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {visible.map((lead) => (
            <li key={lead.id} className="rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[18px] font-semibold tracking-tight">{lead.name}</p>
                  <p className="mt-0.5 break-all text-[16px] text-accent-text">{lead.contact}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${STATUS_STYLE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
              </div>
              <p className="mt-3 text-[14px] text-content-2">
                {new Date(lead.createdAt).toLocaleString("ru-RU")} · {lead.locale.toUpperCase()}
                {lead.courseTitle ? ` · ${lead.courseTitle}` : ""}
              </p>
              {lead.message && <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 text-[15px]">{lead.message}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`status-${lead.id}`}>
                  Статус заявки
                </label>
                <select id={`status-${lead.id}`} value={lead.status} onChange={(e) => changeStatus(lead.id, e.target.value as LeadStatus)} className="field !w-auto !min-h-11 !py-2">
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
                {confirmId === lead.id ? (
                  <>
                    <button type="button" onClick={() => remove(lead.id)} className="btn !min-h-11 !px-4 !text-[15px] bg-[#d70015] text-white">
                      Удалить навсегда
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="btn btn-quiet !min-h-11 !px-4 !text-[15px]">
                      Отмена
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(lead.id)} className="btn btn-quiet !min-h-11 !px-4 !text-[15px] !text-danger">
                    Удалить
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
