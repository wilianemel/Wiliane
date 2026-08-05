import type { MatchResult } from "@/types/discovery";
import { humanizeSlug } from "@/lib/format/humanize-slug";
import { formatRecommendationReason } from "@/lib/format/format-recommendation-reason";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4.3l3 1.7" />
    </svg>
  );
}

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
}

export function ResultCard({
  result,
  position,
  featured = false,
  onRestart,
  onSelect,
}: ResultCardProps) {
  const { venue, score, reasons } = result;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border transition-colors ${
        featured
          ? "border-accent bg-background-elevated shadow-[0_0_45px_-18px_rgba(255,194,30,0.55)]"
          : "border-border bg-background-elevated"
      }`}
    >
      <VenueCoverImage
        venue={venue}
        className="h-36"
        sizes="(min-width: 1024px) 33vw, 100vw"
      />
      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                featured
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-muted"
              }`}
            >
              {position}ª opção{featured ? " · Maior afinidade" : ""}
            </span>
            <h3 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
              {venue.name}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span>{venue.category}</span>
              <span aria-hidden="true">·</span>
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
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-2xl font-bold text-accent sm:text-3xl">{score}%</span>
            <span
              title="Compatibilidade calculada com base nas suas respostas"
              className="text-[11px] uppercase tracking-wide text-muted"
            >
              Match demonstrativo
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {venue.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted"
            >
              {humanizeSlug(tag)}
            </span>
          ))}
        </div>

        <ul className="flex flex-col gap-1.5">
          {venue.schedule.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted">
              <ClockIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>

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
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onSelect}
            className={`rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver experiência
          </button>
          <button
            type="button"
            onClick={onRestart}
            className={`text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline ${focusRing} rounded`}
          >
            Refazer escolha
          </button>
        </div>
      </div>
    </article>
  );
}
