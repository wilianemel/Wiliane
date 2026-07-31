import Link from "next/link";
import type { Venue } from "@/data/venues";
import { humanizeSlug } from "@/lib/format/humanize-slug";

/** A Home mostra só uma vitrine, não o catálogo inteiro — o restante fica em /buscar. */
const MAX_FEATURED_VENUES = 6;

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

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background-elevated">
      <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${venue.gradient}`}>
        <div
          aria-hidden="true"
          className="absolute -left-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-black/30 blur-2xl"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur">
          Área reservada para imagem
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{venue.name}</h3>
          <p className="text-sm text-muted">
            {venue.category} · {venue.neighborhood} · {venue.priceRange}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-muted line-clamp-3">
          {venue.description}
        </p>

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

        <Link
          href={`/lugares/${venue.id}`}
          className="mt-auto rounded-full border border-accent py-2 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ver experiência
        </Link>
      </div>
    </article>
  );
}

export function FeaturedVenues({ venues }: { venues: Venue[] }) {
  // A consulta em getPublishedVenues() já ordena is_featured primeiro, então
  // um corte simples aqui preserva os destaques reais sem precisar reordenar.
  const displayedVenues = venues.slice(0, MAX_FEATURED_VENUES);

  return (
    <section id="experiencias" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Experiências em destaque
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Lugares publicados na base do MVP. Registros demonstrativos são
          identificados com transparência em seus perfis.
        </p>

        {venues.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-8 text-center text-sm text-muted">
            Nenhuma experiência publicada no momento. Volte em breve para descobrir novas opções.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
