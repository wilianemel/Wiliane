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
  /**
   * "default" preserva exatamente o espaçamento/tipografia/tamanho de card
   * de sempre — usado por Explorar (exploration-page.tsx), que reaproveita
   * esta seção pras fileiras curadas e não deve mudar silenciosamente
   * aqui. "feed" é o novo visual mobile-first da Home (Etapa 2 do redesign
   * visual): título mais próximo dos cards, tipografia mais forte, menos
   * espaço entre seções no celular, cards maiores e deslizáveis (repassado
   * também pro card — ver HomeVenueRowCard). Só quem pedir "feed"
   * explicitamente ganha esse visual.
   */
  variant?: "default" | "feed";
}

/**
 * Fileira horizontal com scroll lateral (estilo feed de app, não grid de
 * site) — reaproveitada por "Perfeito para você", "Hoje na sua cidade" e
 * "Perto de você" (variant="feed") e pelas fileiras curadas do Explorar
 * (variant="default"/omitido). Nunca renderiza uma seção vazia: se
 * `venues` vier vazio, o componente inteiro some.
 */
export function HomeVenueRow({
  title,
  subtitle,
  badge,
  venues,
  hoursStatusByVenueId,
  variant = "default",
}: HomeVenueRowProps) {
  if (venues.length === 0) return null;

  const isFeed = variant === "feed";

  return (
    <section className="border-b border-border/60">
      <div
        className={
          isFeed
            ? "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
            : "mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className={
              isFeed
                ? "text-2xl font-extrabold tracking-tight text-foreground"
                : "text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            }
          >
            {title}
          </h2>
          {badge && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className={isFeed ? "mt-0.5 text-sm text-muted" : "mt-1 text-sm text-muted sm:text-base"}>
            {subtitle}
          </p>
        )}

        <div
          className={
            isFeed
              ? "-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden sm:mx-0 sm:gap-4 sm:px-0"
              : "-mx-4 mt-5 flex gap-3.5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:px-0"
          }
        >
          {venues.map((venue) => (
            <HomeVenueRowCard
              key={venue.id}
              venue={venue}
              hoursStatus={hoursStatusByVenueId?.[venue.venueId] ?? null}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
