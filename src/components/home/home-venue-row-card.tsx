import Link from "next/link";
import type { Venue } from "@/data/venues";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { VenueOpenStatusBadge } from "@/components/shared/venue-open-status-badge";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

/**
 * Card compacto pras fileiras horizontais da Home ("Perfeito para você",
 * "Hoje na sua cidade", "Perto de você") — mesma linguagem visual da Fase 1
 * (foto grande, gradiente, texto sobre a imagem), só menor e pensado pra
 * scroll lateral. Prioriza exatamente o que a Fase 2 pediu: imagem, nome,
 * categoria, aberto agora, distância/preço — sem lista de horário, sem tags
 * em série.
 */
export function HomeVenueRowCard({
  venue,
  hoursStatus,
}: {
  venue: Venue;
  hoursStatus?: VenueHoursStatus | null;
}) {
  return (
    <Link
      href={`/lugares/${venue.id}`}
      className="group relative block h-64 w-52 shrink-0 snap-start overflow-hidden rounded-2xl shadow-lg shadow-black/40 transition-transform active:scale-[0.97] sm:h-72 sm:w-60"
    >
      <VenueCoverImage
        venue={venue}
        className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        sizes="(min-width: 640px) 240px, 208px"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent"
      />

      <div className="absolute left-2.5 top-2.5">
        <VenueOpenStatusBadge hoursStatus={hoursStatus} openNow={venue.openNow} variant="onPhoto" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
          {venue.category}
        </p>
        <h3 className="line-clamp-1 text-base font-bold leading-tight text-white">{venue.name}</h3>
        <p className="mt-0.5 flex items-center gap-x-1.5 text-[11px] text-white/70">
          <span>{venue.priceRange}</span>
          {venue.distanceKm !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>{venue.distanceKm.toFixed(1).replace(".", ",")} km</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
