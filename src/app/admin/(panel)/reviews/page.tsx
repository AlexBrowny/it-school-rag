import { ResourceManager } from "@/components/admin/ResourceManager";
import { adminList } from "@/lib/repo";

export default function AdminReviewsPage() {
  return <ResourceManager resource="reviews" initial={adminList("reviews")} />;
}
