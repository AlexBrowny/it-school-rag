import type { NextRequest } from "next/server";
import { fail, isSameOrigin, ok, parseId, readJson, validationFail } from "@/lib/api";
import { getAdminFromRequest } from "@/lib/auth";
import { adminDelete, adminUpdate } from "@/lib/repo";
import { isResourceName } from "@/lib/resources";
import { buildResourceSchema, projectUrlsSchema } from "@/lib/validators";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/admin/[resource]/[id]">) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const { resource, id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (!isResourceName(resource) || id === null) return fail("Not found", 404);

  const parsed = buildResourceSchema(resource).safeParse(await readJson(request));
  if (!parsed.success) return validationFail(parsed.error);
  if (resource === "projects") {
    const urls = projectUrlsSchema.safeParse(parsed.data);
    if (!urls.success) return validationFail(urls.error);
  }
  const updated = adminUpdate(resource, id, parsed.data);
  return updated ? ok(updated) : fail("Not found", 404);
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/[resource]/[id]">) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const { resource, id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (!isResourceName(resource) || id === null) return fail("Not found", 404);
  return adminDelete(resource, id) ? ok({ id }) : fail("Not found", 404);
}
