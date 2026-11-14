"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Locale } from "@/i18n/config";
import { format, type Dictionary } from "@/i18n/dictionaries";
import { safeHttpUrl } from "@/lib/url";

interface Source {
  doc: string;
  heading: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface ChatWidgetProps {
  locale: Locale;
  schoolName: string;
  dict: Dictionary["chat"];
}

const STORAGE_KEY = "orbit-chat-v1";
const MAX_HISTORY_SENT = 12;

function loadHistory(): Message[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m): m is Message => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-30);
  } catch {
    return [];
  }
}

function saveHistory(messages: Message[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
  } catch {
    /* storage can be unavailable (private mode): the chat still works */
  }
}

/** Renders plain text, turning http(s) URLs into safe links. Never uses innerHTML. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s)]+)/g).map((part, index) => {
        const href = index % 2 === 1 ? safeHttpUrl(part) : null;
        return href ? (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

export function ChatWidget({ locale, schoolName, dict }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => (typeof window === "undefined" ? [] : loadHistory()));
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending, open]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  function reset() {
    setMessages([]);
    saveHistory([]);
    setError(null);
    inputRef.current?.focus();
  }

  async function send(raw: string) {
    const content = raw.trim().slice(0, 1000);
    if (!content || pending) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    saveHistory(next);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: next.slice(-MAX_HISTORY_SENT).map(({ role, content: text }) => ({ role, content: text })),
        }),
      });
      if (response.status === 429) {
        setError(dict.rate);
        return;
      }
      const json = (await response.json()) as { success?: boolean; data?: { reply: string; sources?: Source[] } };
      if (!response.ok || !json.data?.reply) {
        setError(dict.error);
        return;
      }
      const reply: Message = { role: "assistant", content: json.data.reply, sources: json.data.sources };
      const withReply = [...next, reply];
      setMessages(withReply);
      saveHistory(withReply);
    } catch {
      setError(dict.error);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  }

  const greeting = format(dict.greeting, { school: schoolName });

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`btn btn-primary fixed bottom-4 right-4 z-40 !min-h-12 gap-2 !px-5 shadow-[var(--shadow-lift)] ${open ? "hidden" : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
        </svg>
        {dict.launcher}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label={dict.title}
          onKeyDown={(event) => event.key === "Escape" && close()}
          className="fixed inset-x-3 bottom-3 z-50 flex h-[min(640px,calc(100dvh-24px))] flex-col overflow-hidden rounded-[28px] bg-card text-content shadow-[var(--shadow-lift)] ring-1 ring-line animate-[card-in_0.4s_var(--ease-apple)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span aria-hidden className="size-9 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dd3fc,#6366f1_55%,#1e1b4b)]" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{dict.title}</h2>
              <p className="truncate text-[13px] text-content-2">{dict.subtitle}</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} aria-label={dict.newChat} title={dict.newChat} className="inline-flex size-11 items-center justify-center rounded-full text-content-2 hover:bg-surface-2 hover:text-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5" />
                </svg>
              </button>
            )}
            <button type="button" onClick={close} aria-label={dict.close} className="inline-flex size-11 items-center justify-center rounded-full text-content-2 hover:bg-surface-2 hover:text-content">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </header>

          <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="max-w-[88%] whitespace-pre-wrap rounded-[20px] rounded-bl-md bg-surface-2 px-4 py-3 text-[16px] leading-snug">{greeting}</div>

            {messages.length === 0 && (
              <ul className="flex flex-wrap gap-2 pt-1" aria-label={dict.suggestionsLabel}>
                {dict.suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button type="button" onClick={() => void send(suggestion)} className="chip !h-auto !min-h-11 whitespace-normal py-2 text-left">
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="ml-auto max-w-[88%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-accent px-4 py-3 text-[16px] leading-snug text-white">
                  {message.content}
                </div>
              ) : (
                <div key={index} className="max-w-[92%]">
                  <div className="whitespace-pre-wrap break-words rounded-[20px] rounded-bl-md bg-surface-2 px-4 py-3 text-[16px] leading-snug">
                    <RichText text={message.content} />
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <p className="mt-1.5 px-1 text-[13px] leading-snug text-content-2">
                      {dict.sources}:{" "}
                      {[...new Set(message.sources.map((source) => dict.sourceNames[source.doc as keyof typeof dict.sourceNames] ?? source.doc))].join(" · ")}
                    </p>
                  )}
                </div>
              ),
            )}

            {pending && (
              <div role="status" className="inline-flex items-center gap-1.5 rounded-[20px] rounded-bl-md bg-surface-2 px-4 py-3 text-content-2">
                <span className="sr-only">{dict.typing}</span>
                {[0, 1, 2].map((dot) => (
                  <span key={dot} aria-hidden className="size-2 animate-pulse rounded-full bg-content-2" style={{ animationDelay: `${dot * 180}ms` }} />
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-line px-3 pb-3 pt-3">
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                {dict.placeholder}
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                rows={1}
                maxLength={1000}
                placeholder={dict.placeholder}
                onChange={(event) => {
                  setInput(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={onKeyDown}
                className="field !min-h-12 resize-none !py-3"
              />
              <button type="submit" disabled={pending || input.trim() === ""} aria-label={dict.send} className="btn btn-primary !size-12 !min-h-12 shrink-0 !px-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
            <p className="mt-2 px-1 text-[12px] leading-snug text-content-2">{dict.disclaimer}</p>
          </form>
        </section>
      )}
    </>
  );
}
