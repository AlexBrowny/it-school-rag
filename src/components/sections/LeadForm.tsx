"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { isValidContact } from "@/lib/contact";
import { COURSE_EVENT } from "@/lib/events";

interface LeadFormProps {
  locale: Locale;
  dict: Dictionary["contacts"]["form"];
  courses: { id: number; title: string }[];
}

type Status = "idle" | "sending" | "success" | "error" | "rate";
type FieldErrors = Partial<Record<"name" | "contact", string>>;

export function LeadForm({ locale, dict, courses }: LeadFormProps) {
  const uid = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [courseId, setCourseId] = useState("");

  // "Enroll" buttons in the courses section preselect the course here.
  useEffect(() => {
    const handler = (event: Event) => setCourseId(String((event as CustomEvent<number>).detail));
    window.addEventListener(COURSE_EVENT, handler);
    return () => window.removeEventListener(COURSE_EVENT, handler);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();

    const nextErrors: FieldErrors = {};
    if (name.length < 2) nextErrors.name = dict.errors.name;
    if (!isValidContact(contact)) nextErrors.contact = dict.errors.contact;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      form.querySelector<HTMLElement>(nextErrors.name ? "[name=name]" : "[name=contact]")?.focus();
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          courseId: courseId ? Number(courseId) : null,
          message: String(data.get("message") ?? ""),
          website: String(data.get("website") ?? ""),
          locale,
        }),
      });
      if (response.status === 429) return setStatus("rate");
      if (response.status === 422) {
        const body = (await response.json()) as { fields?: Record<string, string> };
        setErrors({
          name: body.fields?.name ? dict.errors.name : undefined,
          contact: body.fields?.contact ? dict.errors.contact : undefined,
        });
        return setStatus("idle");
      }
      if (!response.ok) return setStatus("error");
      form.reset();
      setCourseId("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] bg-card p-10 text-center shadow-[var(--shadow-card)]">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-[#30d158]/15 text-success">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 15.5l5.5 5.5L23 10" />
          </svg>
        </span>
        <h3 className="mt-6 text-[26px] font-semibold tracking-tight">{dict.successTitle}</h3>
        <p className="mt-2 max-w-sm text-content-2">{dict.success}</p>
        <button type="button" onClick={() => setStatus("idle")} className="btn btn-quiet mt-8">
          {dict.again}
        </button>
      </div>
    );
  }

  const sending = status === "sending";
  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <h3 className="text-[24px] font-semibold tracking-tight">{dict.title}</h3>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor={`${uid}-name`} className="mb-2 block text-[15px] font-medium">
            {dict.name}
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            autoComplete="name"
            maxLength={80}
            placeholder={dict.namePlaceholder}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
            className="field"
          />
          {errors.name && (
            <p id={`${uid}-name-err`} className="mt-2 text-[14px] text-danger">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${uid}-contact`} className="mb-2 block text-[15px] font-medium">
            {dict.contact}
          </label>
          <input
            id={`${uid}-contact`}
            name="contact"
            autoComplete="tel"
            inputMode="text"
            maxLength={120}
            placeholder={dict.contactPlaceholder}
            aria-invalid={Boolean(errors.contact)}
            aria-describedby={errors.contact ? `${uid}-contact-err` : undefined}
            className="field"
          />
          {errors.contact && (
            <p id={`${uid}-contact-err`} className="mt-2 text-[14px] text-danger">
              {errors.contact}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${uid}-course`} className="mb-2 block text-[15px] font-medium">
            {dict.course}
          </label>
          <select id={`${uid}-course`} value={courseId} onChange={(event) => setCourseId(event.target.value)} className="field">
            <option value="">{dict.courseAny}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-message`} className="mb-2 block text-[15px] font-medium">
            {dict.message}
          </label>
          <textarea id={`${uid}-message`} name="message" maxLength={1000} placeholder={dict.messagePlaceholder} className="field" />
        </div>

        {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </div>

      <button type="submit" disabled={sending} className="btn btn-primary mt-7 w-full">
        {sending ? dict.sending : dict.submit}
      </button>
      <p className="mt-4 text-[13px] leading-snug text-content-2">{dict.consent}</p>

      <div aria-live="polite" className="mt-3 min-h-5">
        {status === "error" && <p className="text-[14px] text-danger">{dict.error}</p>}
        {status === "rate" && <p className="text-[14px] text-danger">{dict.tooMany}</p>}
      </div>
    </form>
  );
}
