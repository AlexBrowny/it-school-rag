export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
}

/** Thin fetch wrapper for the admin API envelope ({ success, data, error, fields }). */
export async function api<T>(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      data?: T;
      error?: string;
      fields?: Record<string, string>;
    };
    if (response.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
      // Session expired: a full reload deliberately resets all client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin/login";
    }
    return { ok: response.ok && json.success !== false, status: response.status, data: json.data, error: json.error, fields: json.fields };
  } catch {
    return { ok: false, status: 0, error: "Нет соединения с сервером" };
  }
}
