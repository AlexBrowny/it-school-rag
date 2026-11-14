import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, isSameOrigin, ok, readJson, validationFail } from "@/lib/api";
import { LOCALES } from "@/i18n/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { runAssistant } from "@/lib/rag/agent";
import { generate } from "@/lib/rag/gemini";
import { getRetriever } from "@/lib/rag/retriever";
import { createLead, getSettings } from "@/lib/repo";

const CHAT_LIMIT = 20;
const CHAT_WINDOW_MS = 10 * 60 * 1000;
// Every chat message can cost model tokens: cap total traffic regardless of (spoofable) client IPs.
const GLOBAL_LIMIT = 300;
const LEAD_LIMIT = 5;
const LEAD_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 24 * 1024;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(30),
  locale: z.enum(LOCALES).default("ru"),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return fail("Forbidden", 403);

  const ip = clientIp(request.headers);
  if (!rateLimit(`chat:ip:${ip}`, CHAT_LIMIT, CHAT_WINDOW_MS).ok || !rateLimit("chat:global", GLOBAL_LIMIT, CHAT_WINDOW_MS).ok) {
    return fail("Too many requests", 429);
  }

  const parsed = bodySchema.safeParse(await readJson(request, MAX_BODY_BYTES));
  if (!parsed.success) return validationFail(parsed.error);
  const { messages, locale } = parsed.data;
  if (messages.at(-1)?.role !== "user") return fail("The last message must come from the user", 422);

  const settings = getSettings();
  const result = await runAssistant(messages, locale, {
    apiKey: process.env.GEMINI_API_KEY || undefined,
    model: process.env.GEMINI_MODEL || undefined,
    retrieve: (query, limit) => getRetriever().retrieve(query, limit),
    generate,
    // Callback requests from the chat share the contact-form limiter, so the assistant cannot be used to spam leads.
    createLead: (input) => {
      if (!rateLimit(`lead:${ip}`, LEAD_LIMIT, LEAD_WINDOW_MS).ok) return { ok: false, error: "Too many requests, try again later." };
      createLead(input);
      return { ok: true };
    },
    school: {
      name: settings.school_name || "Orbit IT School",
      phone: settings.phone || "",
      telegram: settings.telegram || "",
    },
  });

  return ok(result);
}
