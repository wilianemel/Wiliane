import Link from "next/link";
import type { Venue } from "@/data/venues";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { VenueOpenStatusBadge } from "@/components/shared/venue-open-status-badge";
import { ATMOSPHERE_TAG_LABELS } from "@/lib/venues/venue-tags";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

/** A Home mostra só uma vitrine, não o catálogo inteiro — o restante fica em /buscar. */
const MAX_FEATURED_VENUES = 6;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * A experiência é a protagonista: card imagem-primeiro, com nome/categoria/
 * atmosfera escritos direto sobre a foto (gradiente por baixo do texto), em
 * vez de uma foto pequena seguida de um bloco de texto tipo ficha técnica.
 * O card inteiro é o link — não precisa mais de um botão "Ver experiência"
 * separado.
 */
function VenueCard({
  venue,
  hoursStatus,
}: {
  venue: Venue;
  hoursStatus?: VenueHoursStatus | null;
}) {
  const atmosphereLabel = venue.atmospheres
    .map((id) => ATMOSPHERE_TAG_LABELS[id])
    .find((label): label is string => Boolean(label));

  return (
    <Link
      href={`/lugares/${venue.id}`}
      className={`group relative flex h-64 flex-col overflow-hidden rounded-3xl border border-border/60 transition-transform active:scale-[0.98] sm:h-72 ${focusRing}`}
    >
      <VenueCoverImage
        venue={venue}
        className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent"
      />

      {hoursStatus && (
        <div className="absolute left-3 top-3">
          <VenueOpenStatusBadge hoursStatus={hoursStatus} openNow={venue.openNow} variant="onPhoto" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
          {venue.category}
        </p>
        <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">{venue.name}</h3>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-white/70">
          <span>{venue.neighborhood}</span>
          <span aria-hidden="true">·</span>
          <span>{venue.priceRange}</span>
          {atmosphereLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{atmosphereLabel}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

export function FeaturedVenues({
  venues,
  hoursStatusByVenueId,
}: {
  venues: Venue[];
  /** venue.venueId -> status calculado no servidor — ver comentário equivalente em search-page.tsx. */
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
}) {
  // A consulta em getPublishedVenues() já ordena is_featured primeiro, então
  // um corte simples aqui preserva os destaques reais sem precisar reordenar.
  const displayedVenues = venues.slice(0, MAX_FEATURED_VENUES);

  return (
    <section id="experiencias" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Continue descobrindo
        </h2>
        <p className="mt-1 text-sm text-muted sm:text-base">
          Mais experiências publicadas na plataforma — demonstrativas quando indicado no perfil.
        </p>

        {venues.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-8 text-center text-sm text-muted">
            Nenhuma experiência publicada no momento. Volte em breve para descobrir novas opções.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                hoursStatus={hoursStatusByVenueId?.[venue.venueId] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
