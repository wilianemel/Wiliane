import type { Venue } from "@/data/venues";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";
import { HomeVenueRowCard } from "./home-venue-row-card";

interface HomeVenueRowProps {
  title: string;
  subtitle?: string;
  /** Selo pequeno ao lado do título (ex.: "Curadoria") — opcional. */
  badge?: string;
  venues: Venue[];
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
}

/**
 * Fileira horizontal com scroll lateral (estilo feed de app, não grid de
 * site) — reaproveitada por "Perfeito para você", "Hoje na sua cidade" e
 * "Perto de você". Nunca renderiza uma seção vazia: se `venues` vier vazio
 * (ex.: sem sinal de personalização), o componente inteiro some da Home em
 * vez de mostrar um bloco em branco.
 */
export function HomeVenueRow({ title, subtitle, badge, venues, hoursStatusByVenueId }: HomeVenueRowProps) {
  if (venues.length === 0) return null;

  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
          {badge && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}

        <div className="-mx-4 mt-5 flex gap-3.5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:px-0">
          {venues.map((venue) => (
            <HomeVenueRowCard
              key={venue.id}
              venue={venue}
              hoursStatus={hoursStatusByVenueId?.[venue.venueId] ?? null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
