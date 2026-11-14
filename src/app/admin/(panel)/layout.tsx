import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminFromCookies } from "@/lib/auth";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const username = await getAdminFromCookies();
  if (!username) redirect("/admin/login");
  return <AdminShell username={username}>{children}</AdminShell>;
}
