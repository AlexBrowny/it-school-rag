import type { NextRequest } from "next/server";
import { fail, isSameOrigin, ok, readJson, validationFail } from "@/lib/api";
import { getAdminFromRequest } from "@/lib/auth";
import { adminCreate, adminList } from "@/lib/repo";
import { isResourceName } from "@/lib/resources";
import { buildResourceSchema, projectUrlsSchema } from "@/lib/validators";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/[resource]">) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  const { resource } = await ctx.params;
  if (!isResourceName(resource)) return fail("Not found", 404);
  return ok(adminList(resource));
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/admin/[resource]">) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  if (!isSameOrigin(request)) return fail("Forbidden", 403);
  const { resource } = await ctx.params;
  if (!isResourceName(resource)) return fail("Not found", 404);

  const body = await readJson(request);
  const parsed = buildResourceSchema(resource).safeParse(body);
  if (!parsed.success) return validationFail(parsed.error);
  if (resource === "projects") {
    const urls = projectUrlsSchema.safeParse(parsed.data);
    if (!urls.success) return validationFail(urls.error);
  }
  return ok(adminCreate(resource, parsed.data), { status: 201 });
}
