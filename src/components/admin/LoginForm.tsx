"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/components/admin/api-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await api("/api/auth/login", "POST", {
      username: String(data.get("username") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (result.ok) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    setPending(false);
    setError(
      result.status === 429
        ? "Слишком много попыток. Попробуйте позже."
        : result.status === 401
          ? "Неверный логин или пароль."
          : "Не удалось войти. Проверьте данные и соединение.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[28px] bg-card p-7 shadow-[var(--shadow-card)]">
      <div className="space-y-5">
        <div>
          <label htmlFor="username" className="mb-2 block text-[15px] font-medium">
            Логин
          </label>
          <input id="username" name="username" autoComplete="username" required className="field" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-[15px] font-medium">
            Пароль
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
        </div>
      </div>
      <div aria-live="polite" className="mt-4 min-h-5 text-[14px] text-danger">
        {error}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary mt-2 w-full">
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
