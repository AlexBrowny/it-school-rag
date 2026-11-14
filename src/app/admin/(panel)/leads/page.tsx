import { LeadsManager } from "@/components/admin/LeadsManager";
import { listLeads } from "@/lib/repo";

export default function AdminLeadsPage() {
  return <LeadsManager initial={listLeads()} />;
}
