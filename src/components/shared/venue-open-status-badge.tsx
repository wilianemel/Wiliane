import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

interface VenueOpenStatusBadgeProps {
  /** Calculado no servidor a partir de venue_business_hours — `null`/ausente quando o venue ainda não tem horário estruturado. */
  hoursStatus?: VenueHoursStatus | null;
  /** Fallback antigo (venues.open_now) — só usado quando `hoursStatus` não está disponível. */
  openNow: boolean;
  className?: string;
  /** "onPhoto": texto claro + fundo escuro translúcido, para uso sobre a capa do estabelecimento (ver featured-venues.tsx, result-card.tsx). Default "muted": texto sóbrio, mesmo visual de sempre, usado fora de imagem. */
  variant?: "muted" | "onPhoto";
}

/**
 * Badge de aberto/fechado reaproveitado pelos cards (featured-venues,
 * search-result-card, result-card) — evita repetir a mesma decisão
 * "hoursStatus se existir, senão venues.open_now" em cada um.
 */
export function VenueOpenStatusBadge({
  hoursStatus,
  openNow,
  className,
  variant = "muted",
}: VenueOpenStatusBadgeProps) {
  const isOpen = hoursStatus ? hoursStatus.isOpen : openNow;
  const label = hoursStatus ? hoursStatus.label : openNow ? "Aberto agora" : "Fechado no momento";

  const baseClasses =
    variant === "onPhoto"
      ? "inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
      : "inline-flex items-center gap-2 text-xs font-medium text-muted";

  return (
    <span className={`${baseClasses} ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOpen ? "bg-emerald-400" : "bg-red-400"}`}
      />
      {label}
    </span>
  );
}
