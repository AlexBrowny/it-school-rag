import { ResourceManager } from "@/components/admin/ResourceManager";
import { adminList } from "@/lib/repo";

export default function AdminProjectsPage() {
  return <ResourceManager resource="projects" initial={adminList("projects")} />;
}
