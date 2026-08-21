import Link from "next/link";
import Image from "next/image";
import type { Venue } from "@/data/venues";
import { humanizeSlug } from "@/lib/format/humanize-slug";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { VenueOpenStatusBadge } from "@/components/shared/venue-open-status-badge";
import { FavoriteButton } from "@/components/favorite-button";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z"
      />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

interface SearchResultCardProps {
  venue: Venue;
  /** Calculado no servidor (venue-repository.ts) — ausente = venue sem horário estruturado, cai no venue.openNow. */
  hoursStatus?: VenueHoursStatus | null;
}

/**
 * Imagem grande (capa/foto principal — nunca vídeo aqui, ver decisão de
 * produto) com nome/categoria sobre a foto (gradiente por baixo do texto,
 * logo ao lado do nome quando existir) + uma linha compacta de contexto
 * abaixo — não mais uma ficha técnica (tags em série, lista de horários).
 * FavoriteButton fica fora do <Link> (irmão, sobreposto via
 * position:absolute) porque <button> dentro de <a> é inválido/ambíguo para
 * acessibilidade. Vídeo como mídia principal só aparece no perfil completo
 * (/lugares/[id], ver venue-profile.tsx) — o card de busca é só a foto.
 */
export function SearchResultCard({ venue, hoursStatus = null }: SearchResultCardProps) {
  const highlightTag = venue.cuisineTypes[0] ?? venue.tags[0] ?? null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-background-elevated transition-transform active:scale-[0.98]">
      <Link href={`/lugares/${venue.id}`} className={`flex flex-1 flex-col ${focusRing}`}>
        <div className="relative h-48 w-full shrink-0 overflow-hidden">
          <VenueCoverImage
            venue={venue}
            className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-4">
            {venue.logoUrl && (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/30">
                <Image src={venue.logoUrl} alt={`Logo de ${venue.name}`} fill sizes="36px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {venue.category}
              </p>
              <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">{venue.name}</h3>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <PinIcon />
              {venue.neighborhood}
            </span>
            <span aria-hidden="true">·</span>
            <span>{venue.priceRange}</span>
            {highlightTag && (
              <>
                <span aria-hidden="true">·</span>
                <span>{humanizeSlug(highlightTag)}</span>
              </>
            )}
          </p>

          <p className="text-sm leading-relaxed text-muted line-clamp-2">{venue.description}</p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <VenueOpenStatusBadge hoursStatus={hoursStatus} openNow={venue.openNow} />
            <span className="text-xs font-semibold text-accent">Ver experiência →</span>
          </div>
        </div>
      </Link>

      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton venueId={venue.venueId} />
      </div>
    </article>
  );
}
