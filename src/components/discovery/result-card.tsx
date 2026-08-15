import type { MatchResult } from "@/types/discovery";
import { formatRecommendationReason } from "@/lib/format/format-recommendation-reason";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { VenueOpenStatusBadge } from "@/components/shared/venue-open-status-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { RecommendationFeedbackButton } from "@/components/recommendation-feedback-button";
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

interface ResultCardProps {
  result: MatchResult;
  position: number;
  featured?: boolean;
  onRestart: () => void;
  onSelect: () => void;
  recommendationHistoryId?: string;
  /** Calculado no servidor — ausente = venue sem horário estruturado (nenhum badge, mesmo comportamento de antes). */
  hoursStatus?: VenueHoursStatus | null;
}

export function ResultCard({
  result,
  position,
  featured = false,
  onRestart,
  onSelect,
  recommendationHistoryId,
  hoursStatus = null,
}: ResultCardProps) {
  const { venue, score, reasons } = result;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border transition-colors ${
        featured
          ? "border-accent bg-background-elevated shadow-[0_0_45px_-18px_rgba(255,194,30,0.55)]"
          : "border-border/60 bg-background-elevated"
      }`}
    >
      <div className="relative h-56 w-full shrink-0 overflow-hidden sm:h-64">
        <VenueCoverImage venue={venue} className="h-full w-full" sizes="(min-width: 1024px) 33vw, 100vw" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
        />

        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              featured ? "bg-accent text-accent-foreground" : "bg-black/55 text-white backdrop-blur-sm"
            }`}
          >
            {position}ª opção{featured ? " · Maior afinidade" : ""}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <FavoriteButton venueId={venue.venueId} size="lg" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              {venue.category}
            </p>
            <h3 className="truncate text-xl font-bold leading-tight text-white sm:text-2xl">
              {venue.name}
            </h3>
          </div>
          <span
            title="Compatibilidade calculada com base nas suas respostas"
            className="shrink-0 text-2xl font-bold text-accent sm:text-3xl"
          >
            {score}%
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <PinIcon />
            {venue.neighborhood}
          </span>
          <span aria-hidden="true">·</span>
          <span>{venue.priceRange}</span>
          <span aria-hidden="true">·</span>
          <span>
            {venue.distanceKm !== null
              ? `${venue.distanceKm.toFixed(1).replace(".", ",")} km`
              : "Distância indisponível"}
          </span>
          {hoursStatus && (
            <>
              <span aria-hidden="true">·</span>
              <VenueOpenStatusBadge hoursStatus={hoursStatus} openNow={venue.openNow} />
            </>
          )}
        </div>

        <div className="rounded-xl border border-border/80 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Por que essa recomendação
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-foreground">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {formatRecommendationReason(reason)}
              </li>
            ))}
          </ul>

          {recommendationHistoryId && (
            <div className="mt-3 border-t border-border/60 pt-3">
              <RecommendationFeedbackButton recommendationHistoryId={recommendationHistoryId} />
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onSelect}
            className={`inline-flex min-h-11 items-center justify-center rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver experiência
          </button>
          <button
            type="button"
            onClick={onRestart}
            className={`inline-flex min-h-11 items-center justify-center text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline ${focusRing} rounded`}
          >
            Refazer escolha
          </button>
        </div>
      </div>
    </article>
  );
}
