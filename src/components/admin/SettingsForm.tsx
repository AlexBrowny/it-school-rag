"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/components/admin/api-client";
import { SETTING_FIELDS, type SettingField } from "@/lib/settings-config";

const LANGS = ["ru", "en", "uz"] as const;

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const groups = SETTING_FIELDS.reduce<Record<string, SettingField[]>>((acc, field) => {
    acc[field.group] = [...(acc[field.group] ?? []), field];
    return acc;
  }, {});

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus("idle");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    const result = await api<Record<string, string>>("/api/admin/settings", "PUT", values);
    if (result.ok && result.data) {
      setValues(result.data);
      setStatus("saved");
      setMessage("Настройки сохранены. Изменения уже на сайте.");
    } else {
      setStatus("error");
      const [key, problem] = Object.entries(result.fields ?? {})[0] ?? [];
      const label = SETTING_FIELDS.find((f) => key === f.key || key?.startsWith(`${f.key}_`))?.label;
      setMessage(key ? `${label ?? key}: ${problem}` : (result.error ?? "Не удалось сохранить настройки."));
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[32px] font-bold tracking-tight">Настройки сайта</h1>
      <p className="mt-1 text-content-2">Контакты, адрес и цифры, которые показываются на сайте.</p>

      <div className="mt-8 space-y-6">
        {Object.entries(groups).map(([group, fields]) => (
          <fieldset key={group} className="rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)]">
            <legend className="float-left mb-4 w-full text-[19px] font-semibold tracking-tight">{group}</legend>
            <div className="clear-both grid gap-5 sm:grid-cols-2">
              {fields.map((field) =>
                field.localized ? (
                  LANGS.map((lang) => (
                    <div key={`${field.key}_${lang}`}>
                      <label htmlFor={`s-${field.key}_${lang}`} className="mb-2 block text-[14px] font-medium">
                        {field.label} ({lang.toUpperCase()})
                      </label>
                      <input id={`s-${field.key}_${lang}`} value={values[`${field.key}_${lang}`] ?? ""} maxLength={field.max} onChange={(e) => update(`${field.key}_${lang}`, e.target.value)} className="field" />
                    </div>
                  ))
                ) : (
                  <div key={field.key}>
                    <label htmlFor={`s-${field.key}`} className="mb-2 block text-[14px] font-medium">
                      {field.label}
                    </label>
                    <input
                      id={`s-${field.key}`}
                      type="text"
                      inputMode={field.type === "number" ? "numeric" : undefined}
                      value={values[field.key] ?? ""}
                      maxLength={field.max}
                      onChange={(e) => update(field.key, field.type === "number" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                      className="field"
                    />
                  </div>
                ),
              )}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={status === "saving"} className="btn btn-primary">
          {status === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
        <p aria-live="polite" className={`text-[15px] ${status === "error" ? "text-danger" : "text-success"}`}>
          {status === "saved" || status === "error" ? message : ""}
        </p>
      </div>
    </form>
  );
}
