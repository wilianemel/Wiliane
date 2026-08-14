import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

interface VenueOpenStatusBadgeProps {
  /** Calculado no servidor a partir de venue_business_hours — `null`/ausente quando o venue ainda não tem horário estruturado. */
  hoursStatus?: VenueHoursStatus | null;
  /** Fallback antigo (venues.open_now) — só usado quando `hoursStatus` não está disponível. */
  openNow: boolean;
  className?: string;
}

/**
 * Badge de aberto/fechado reaproveitado pelos cards (featured-venues,
 * search-result-card, result-card) — evita repetir a mesma decisão
 * "hoursStatus se existir, senão venues.open_now" em cada um.
 */
export function VenueOpenStatusBadge({ hoursStatus, openNow, className }: VenueOpenStatusBadgeProps) {
  const isOpen = hoursStatus ? hoursStatus.isOpen : openNow;
  const label = hoursStatus ? hoursStatus.label : openNow ? "Aberto agora" : "Fechado no momento";

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium text-muted ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOpen ? "bg-emerald-400" : "bg-red-400"}`}
      />
      {label}
    </span>
  );
}
