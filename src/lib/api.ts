import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
}

const MAX_BODY_BYTES = 32 * 1024;

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: string, status: number, extra?: Pick<ApiResponse<never>, "fields">): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

export function validationFail(error: ZodError): NextResponse<ApiResponse<never>> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fail("Validation failed", 422, { fields });
}

/**
 * Rejects cross-site state-changing requests (defence in depth on top of SameSite=Lax).
 * Browsers always send Sec-Fetch-Site; non-browser clients (curl, tests) send neither header.
 */
export function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Reads a JSON body with a hard size cap (streamed, so chunked uploads without a
 * Content-Length cannot exhaust memory). Returns undefined when missing, too large or invalid.
 */
export async function readJson(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return undefined;
  const stream = request.body;
  if (!stream) return undefined;

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

/** Parses a positive integer route id; null when malformed. */
export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
