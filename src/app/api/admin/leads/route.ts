import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getAdminFromRequest } from "@/lib/auth";
import { listLeads } from "@/lib/repo";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return fail("Unauthorized", 401);
  return ok(listLeads());
}
