import type { DashboardRole } from "@/lib/media-dashboard/types";
import { RoleBadge } from "./role-badge";

interface MediaDashboardHeaderProps {
  venueName: string;
  role: DashboardRole;
}

export function MediaDashboardHeader({ venueName, role }: MediaDashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Painel de mídias
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Gerenciar mídias
        </h1>
        <p className="mt-1 text-sm text-muted">{venueName}</p>
      </div>
      <RoleBadge role={role} />
    </header>
  );
}
