import type { NextRequest } from "next/server";
import { fail, isSameOrigin, ok, parseId, readJson, validationFail } from "@/lib/api";
import { getAdminFromRequest } from "@/lib/auth";
import { deleteLead, updateLeadStatus } from "@/lib/repo";
import { leadStatusSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/leads/[id]">) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const id = parseId((await ctx.params).id);
  if (id === null) return fail("Not found", 404);

  const parsed = leadStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationFail(parsed.error);
  return updateLeadStatus(id, parsed.data.status) ? ok({ id, status: parsed.data.status }) : fail("Not found", 404);
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/leads/[id]">) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const id = parseId((await ctx.params).id);
  if (id === null) return fail("Not found", 404);
  return deleteLead(id) ? ok({ id }) : fail("Not found", 404);
}
