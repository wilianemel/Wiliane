import Link from "next/link";
import type { Venue } from "@/data/venues";
import { humanizeSlug } from "@/lib/format/humanize-slug";

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

interface SearchResultCardProps {
  venue: Venue;
}

export function SearchResultCard({ venue }: SearchResultCardProps) {
  const highlightTags = (venue.cuisineTypes.length > 0 ? venue.cuisineTypes : venue.tags).slice(
    0,
    3,
  );

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-background-elevated p-6 sm:p-7">
      <div>
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">{venue.name}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span>{venue.category}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <PinIcon />
            {venue.neighborhood}
          </span>
          <span aria-hidden="true">·</span>
          <span>{venue.priceRange}</span>
        </p>
      </div>

      <p className="text-sm leading-relaxed text-muted line-clamp-2">{venue.description}</p>

      <div className="flex flex-wrap gap-2">
        {highlightTags.map((tag) => (
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

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              venue.openNow ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          {venue.openNow ? "Aberto agora" : "Fechado no momento"}
        </span>
        <Link
          href={`/lugares/${venue.id}`}
          className={`rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          Ver experiência
        </Link>
      </div>
    </article>
  );
}
