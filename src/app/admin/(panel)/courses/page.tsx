import { ResourceManager } from "@/components/admin/ResourceManager";
import { adminList } from "@/lib/repo";

export default function AdminCoursesPage() {
  return <ResourceManager resource="courses" initial={adminList("courses")} />;
}
