import Link from "next/link";
import type { Venue } from "@/data/venues";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { VenueOpenStatusBadge } from "@/components/shared/venue-open-status-badge";
import { getAtmosphereDisplayLabel } from "@/lib/venues/venue-tags";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** No máximo 2 características por card — nunca uma ficha técnica completa. */
const MAX_FEED_TRAITS = 2;

interface HomeVenueRowCardProps {
  venue: Venue;
  hoursStatus?: VenueHoursStatus | null;
  /**
   * "default" preserva exatamente o visual da Fase 1 (foto grande, sem
   * características, sem "Ver experiência") — usado por Explorar
   * (exploration-page.tsx), que reaproveita este componente e não deve
   * mudar silenciosamente aqui. "feed" é o novo visual mobile-first da Home
   * (Etapa 2 do redesign visual): card maior, características reais e
   * indicação "Ver experiência →". Só aplicado a quem pedir explicitamente.
   */
  variant?: "default" | "feed";
  className?: string;
}

/**
 * Card compacto pras fileiras horizontais da Home ("Perfeito para você",
 * "Hoje na sua cidade", "Perto de você") — foto grande, gradiente, texto
 * sobre a imagem, pensado pra scroll lateral. Também reaproveitado pelo
 * Explorar nas fileiras curadas e no grid filtrado (variant="default",
 * sempre) — `className`/`variant` permitem ajustar tamanho e conteúdo por
 * contexto sem duplicar o card nem afetar quem não pede a mudança.
 */
export function HomeVenueRowCard({
  venue,
  hoursStatus,
  variant = "default",
  className,
}: HomeVenueRowCardProps) {
  const isFeed = variant === "feed";

  // Mesmo comportamento de sempre quando `variant` não é passado: só quem
  // pede "feed" explicitamente ganha o tamanho/proporção novos.
  const resolvedClassName =
    className ??
    (isFeed
      ? "aspect-[4/5] w-[80vw] max-w-[340px] shrink-0 snap-start sm:w-56 sm:max-w-none lg:w-64"
      : "h-64 w-52 shrink-0 snap-start sm:h-72 sm:w-60");

  const linkBaseClassName = isFeed
    ? `group relative block overflow-hidden rounded-3xl shadow-xl shadow-black/50 transition-transform active:scale-[0.97] ${focusRing}`
    : "group relative block overflow-hidden rounded-2xl shadow-lg shadow-black/40 transition-transform active:scale-[0.97]";

  const imageSizes = isFeed
    ? "(min-width: 1024px) 256px, (min-width: 640px) 224px, 80vw"
    : "(min-width: 640px) 240px, 208px";

  // Só dados reais (atmospheres/tags), nunca inventados — mesma função
  // central usada no perfil público, nunca mostra "custom:..." nem id
  // interno (getAtmosphereDisplayLabel já filtra isso).
  const traits = isFeed
    ? venue.atmospheres
        .map((id) => getAtmosphereDisplayLabel(id))
        .filter((label): label is string => Boolean(label))
        .slice(0, MAX_FEED_TRAITS)
    : [];

  return (
    <Link href={`/lugares/${venue.id}`} className={`${linkBaseClassName} ${resolvedClassName}`}>
      <VenueCoverImage
        venue={venue}
        className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        sizes={imageSizes}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent"
      />

      <div className="absolute left-2.5 top-2.5">
        <VenueOpenStatusBadge hoursStatus={hoursStatus} openNow={venue.openNow} variant="onPhoto" />
      </div>

      {isFeed ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              {venue.category}
            </p>
            <h3 className="line-clamp-1 text-lg font-bold leading-tight text-white sm:text-xl">
              {venue.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-x-1.5 text-sm text-white/75">
              <span className="truncate">{venue.neighborhood}</span>
              <span aria-hidden="true">·</span>
              <span>{venue.priceRange}</span>
              {venue.distanceKm !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{venue.distanceKm.toFixed(1).replace(".", ",")} km</span>
                </>
              )}
            </p>
          </div>

          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full border border-white/20 bg-black/35 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur-sm"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          <p className="mt-1 text-xs font-medium text-white/60">Ver experiência →</p>
        </div>
      ) : (
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
      )}
    </Link>
  );
}
