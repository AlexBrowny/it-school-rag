import type { NextRequest } from "next/server";
import { fail, isSameOrigin, ok, readJson, validationFail } from "@/lib/api";
import { getAdminFromRequest } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/repo";
import { settingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  return ok(getSettings());
}

export async function PUT(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const parsed = settingsSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationFail(parsed.error);
  saveSettings(parsed.data);
  return ok(getSettings());
}
