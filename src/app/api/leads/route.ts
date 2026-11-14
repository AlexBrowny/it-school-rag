import type { NextRequest } from "next/server";
import { fail, isSameOrigin, ok, readJson, validationFail } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createLead } from "@/lib/repo";
import { leadSchema } from "@/lib/validators";

const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return fail("Forbidden", 403);

  const limit = rateLimit(`lead:${clientIp(request.headers)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return fail("Too many requests", 429);
  }

  const parsed = leadSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    // Honeypot hit looks like a success to bots so they don't adapt.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) return ok({ id: 0 });
    return validationFail(parsed.error);
  }

  const id = createLead(parsed.data);
  return ok({ id }, { status: 201 });
}
