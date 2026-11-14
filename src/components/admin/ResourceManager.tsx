"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api } from "@/components/admin/api-client";
import { columnsFor, LANG_SUFFIXES, RESOURCES, type AdminRow, type FieldDef, type ResourceName } from "@/lib/resources";

type Value = string | number | boolean;
type Row = AdminRow;
type Draft = Record<string, Value | undefined>;
type Editing = { mode: "create" } | { mode: "edit"; id: number };

const LANG_LABEL: Record<(typeof LANG_SUFFIXES)[number], string> = { ru: "RU", en: "EN", uz: "UZ" };

const NUMBER_DEFAULTS: Record<string, number> = { duration_months: 6, rating: 5, price: 100 };

function defaults(resource: ResourceName, nextOrder: number): Draft {
  const draft: Draft = {};
  for (const col of columnsFor(RESOURCES[resource])) {
    if (col.kind === "bool") draft[col.column] = true;
    else if (col.kind === "number") draft[col.column] = NUMBER_DEFAULTS[col.column] ?? col.field.min ?? 0;
    else if (col.field.kind === "select" && col.field.options) draft[col.column] = col.field.options[0].value;
    else draft[col.column] = "";
  }
  draft.sort_order = nextOrder;
  return draft;
}

function toDraft(resource: ResourceName, row: Row): Draft {
  const draft: Draft = {};
  for (const col of columnsFor(RESOURCES[resource])) draft[col.column] = row[col.column] ?? "";
  return draft;
}

function optionLabel(field: FieldDef, value: Value): string {
  return field.options?.find((option) => option.value === String(value))?.label ?? String(value);
}

export function ResourceManager({ resource, initial }: { resource: ResourceName; initial: Row[] }) {
  const def = RESOURCES[resource];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Row[]>(initial);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [lang, setLang] = useState<(typeof LANG_SUFFIXES)[number]>("ru");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasLocalized = useMemo(() => def.fields.some((f) => f.kind === "localized" || f.kind === "localizedTextarea"), [def]);
  const listFields = def.fields.filter((f) => f.list && f.key !== "title" && f.key !== def.titleField);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (editing && !dialog.open) dialog.showModal();
    if (!editing && dialog.open) dialog.close();
  }, [editing]);

  function openCreate() {
    setDraft(defaults(resource, rows.length));
    setErrors({});
    setFormError(null);
    setLang("ru");
    setEditing({ mode: "create" });
  }

  function openEdit(row: Row) {
    setDraft(toDraft(resource, row));
    setErrors({});
    setFormError(null);
    setLang("ru");
    setEditing({ mode: "edit", id: row.id });
  }

  function set(column: string, value: Value) {
    setDraft((current) => ({ ...current, [column]: value }));
    setErrors((current) =>
      column in current ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== column)) : current,
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const payload: Draft = {};
    for (const col of columnsFor(def)) {
      const value = draft[col.column];
      // An empty number input is sent as "missing" so the server rejects it instead of saving 0.
      payload[col.column] = col.kind === "number" ? (value === "" ? undefined : Number(value)) : value;
    }
    const result =
      editing.mode === "create"
        ? await api<Row>(`/api/admin/${resource}`, "POST", payload)
        : await api<Row>(`/api/admin/${resource}/${editing.id}`, "PUT", payload);
    setSaving(false);

    if (!result.ok || !result.data) {
      if (result.fields) {
        setErrors(result.fields);
        const firstLangError = LANG_SUFFIXES.find((l) => Object.keys(result.fields ?? {}).some((k) => k.endsWith(`_${l}`)));
        if (firstLangError) setLang(firstLangError);
        setFormError("Проверьте выделенные поля.");
      } else {
        setFormError(result.error ?? "Не удалось сохранить.");
      }
      return;
    }
    const saved = result.data;
    setRows((current) => {
      const next = editing.mode === "create" ? [...current, saved] : current.map((r) => (r.id === saved.id ? saved : r));
      return [...next].sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || a.id - b.id);
    });
    setEditing(null);
    setNotice(editing.mode === "create" ? "Добавлено" : "Сохранено");
  }

  async function toggleFlag(row: Row) {
    const flag = def.boolFlag.key;
    const payload: Draft = { ...toDraft(resource, row), [flag]: !row[flag] };
    const result = await api<Row>(`/api/admin/${resource}/${row.id}`, "PUT", payload);
    if (result.ok && result.data) {
      const saved = result.data;
      setRows((current) => current.map((r) => (r.id === saved.id ? saved : r)));
    } else setNotice(result.error ?? "Не удалось обновить");
  }

  async function remove(id: number) {
    const result = await api(`/api/admin/${resource}/${id}`, "DELETE");
    setConfirmId(null);
    if (result.ok) {
      setRows((current) => current.filter((r) => r.id !== id));
      setNotice("Удалено");
    } else setNotice(result.error ?? "Не удалось удалить");
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function renderField(field: FieldDef) {
    const localized = field.kind === "localized" || field.kind === "localizedTextarea";
    const column = localized ? `${field.key}_${lang}` : field.key;
    const id = `f-${column}`;
    const error = errors[column];
    const value = draft[column];
    const label = localized ? `${field.label} (${LANG_LABEL[lang]})${field.required && lang === "ru" ? " *" : ""}` : `${field.label}${field.required ? " *" : ""}`;

    if (field.kind === "bool") {
      return (
        <label key={column} className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(column, e.target.checked)} className="size-5 accent-[var(--accent)]" />
          <span className="text-[16px] font-medium">{field.label}</span>
        </label>
      );
    }

    return (
      <div key={column}>
        <label htmlFor={id} className="mb-2 block text-[14px] font-medium">
          {label}
        </label>
        {field.kind === "select" ? (
          <select id={id} value={String(value ?? "")} onChange={(e) => set(column, e.target.value)} className="field">
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.kind === "textarea" || field.kind === "localizedTextarea" ? (
          <textarea id={id} value={String(value ?? "")} onChange={(e) => set(column, e.target.value)} maxLength={field.max} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} className="field" />
        ) : (
          <input
            id={id}
            type={field.kind === "number" ? "number" : "text"}
            value={String(value ?? "")}
            onChange={(e) => set(column, e.target.value)}
            min={field.min}
            max={field.max}
            maxLength={field.kind === "number" ? undefined : field.max}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined}
            className="field"
          />
        )}
        {error && (
          <p id={`${id}-err`} className="mt-1.5 text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">{def.title}</h1>
          <p className="mt-1 text-content-2">Всего: {rows.length}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary">
          + Добавить {def.singular}
        </button>
      </div>

      <div aria-live="polite" className="mt-3 h-6 text-[14px] font-medium text-success">
        {notice}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[24px] bg-card p-10 text-center text-content-2">Пока пусто. Добавьте первый {def.singular}.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-4 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[18px] font-semibold tracking-tight">{String(row[def.titleField] || row.title_en || "—")}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 text-[14px] text-content-2">
                  {listFields.map((field) => (
                    <span key={field.key}>
                      {field.label}: <span className="font-medium text-content">{field.kind === "select" ? optionLabel(field, row[field.key]) : String(row[field.key])}</span>
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(row[def.boolFlag.key])}
                  aria-label={def.boolFlag.label}
                  onClick={() => toggleFlag(row)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-[14px] text-content-2"
                >
                  <span className={`relative inline-block h-7 w-12 rounded-full transition-colors ${row[def.boolFlag.key] ? "bg-[#30d158]" : "bg-content-2/40"}`}>
                    <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${row[def.boolFlag.key] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </span>
                  {def.boolFlag.label}
                </button>
                <button type="button" onClick={() => openEdit(row)} className="btn btn-quiet !min-h-11 !px-4 !text-[15px]">
                  Изменить
                </button>
                {confirmId === row.id ? (
                  <>
                    <button type="button" onClick={() => remove(row.id)} className="btn !min-h-11 !px-4 !text-[15px] bg-[#d70015] text-white">
                      Удалить навсегда
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="btn btn-quiet !min-h-11 !px-4 !text-[15px]">
                      Отмена
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(row.id)} className="btn btn-quiet !min-h-11 !px-4 !text-[15px] !text-danger">
                    Удалить
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setEditing(null)}
        onClick={(event) => event.target === dialogRef.current && setEditing(null)}
        aria-labelledby="dialog-title"
        className="m-auto w-[min(680px,calc(100vw-24px))] max-h-[92dvh] overflow-hidden rounded-[28px] bg-card p-0 text-content shadow-[var(--shadow-lift)] backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={save} className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="dialog-title" className="text-[22px] font-semibold tracking-tight">
              {editing?.mode === "create" ? `Новый ${def.singular}` : `Редактирование: ${def.singular}`}
            </h2>
            <button type="button" onClick={() => setEditing(null)} aria-label="Закрыть" className="inline-flex size-11 items-center justify-center rounded-full text-content-2 hover:bg-surface-2">
              ✕
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-6">
            {hasLocalized && (
              <div role="tablist" aria-label="Язык контента" className="inline-flex rounded-full bg-surface-2 p-1">
                {LANG_SUFFIXES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={lang === l}
                    onClick={() => setLang(l)}
                    className={`min-h-11 min-w-14 rounded-full px-4 text-[14px] font-semibold ${lang === l ? "bg-content text-surface" : "text-content-2"}`}
                  >
                    {LANG_LABEL[l]}
                    {Object.keys(errors).some((k) => k.endsWith(`_${l}`)) && (
                      <>
                        <span aria-hidden> •</span>
                        <span className="sr-only"> (есть ошибки)</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
            {def.fields.map(renderField)}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
            <p aria-live="polite" className="text-[14px] text-danger">
              {formError}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-quiet !min-h-11">
                Отмена
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary !min-h-11">
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
}
