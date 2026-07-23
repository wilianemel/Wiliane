import type { DashboardRole } from "@/lib/media-dashboard/types";

const ROLE_LABELS: Record<DashboardRole, string> = {
  admin: "Administrador",
  owner: "Proprietário",
};

export function RoleBadge({ role }: { role: DashboardRole }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
      {ROLE_LABELS[role]}
    </span>
  );
}
