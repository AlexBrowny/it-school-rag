import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/repo";

export default function AdminSettingsPage() {
  return <SettingsForm initial={getSettings()} />;
}
