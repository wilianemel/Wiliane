import type { PriceRange, Venue } from "@/data/venues";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

/**
 * Busca direta determinística ("Já sei o que procuro").
 *
 * Não há IA nem correspondência aleatória: a mesma consulta e os mesmos
 * filtros sempre produzem o mesmo resultado, na mesma ordem.
 */

export interface VenueFilters {
  city: string | null;
  category: string | null;
  priceRange: PriceRange | null;
  openNowOnly: boolean;
  liveMusicOnly: boolean;
}

export const EMPTY_VENUE_FILTERS: VenueFilters = {
  city: null,
  category: null,
  priceRange: null,
  openNowOnly: false,
  liveMusicOnly: false,
};

/** Remove acentos, normaliza caixa e colapsa espaços extras. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const MATCH_SCORE = {
  exactName: 100,
  partialName: 80,
  locationOrCategory: 60,
  secondary: 30,
} as const;

function collectSecondaryText(venue: Venue): string {
  return normalize(
    [
      ...venue.tags,
      ...venue.musicStyles,
      ...venue.schedule,
      ...venue.atmospheres,
      ...venue.menuHighlights,
      venue.description,
    ].join(" "),
  );
}

function scoreVenueForQuery(venue: Venue, normalizedQuery: string): number {
  const name = normalize(venue.name);

  if (name === normalizedQuery) return MATCH_SCORE.exactName;
  if (name.includes(normalizedQuery)) return MATCH_SCORE.partialName;

  const category = normalize(venue.category);
  const cuisines = normalize(venue.cuisineTypes.join(" "));
  const neighborhood = normalize(venue.neighborhood);
  const city = normalize(venue.city);

  if (
    category.includes(normalizedQuery) ||
    cuisines.includes(normalizedQuery) ||
    neighborhood.includes(normalizedQuery) ||
    city.includes(normalizedQuery)
  ) {
    return MATCH_SCORE.locationOrCategory;
  }

  if (collectSecondaryText(venue).includes(normalizedQuery)) {
    return MATCH_SCORE.secondary;
  }

  return 0;
}

/**
 * Status real (venue_business_hours) quando disponível no mapa calculado no
 * servidor; cai para venues.openNow quando o venue ainda não tem horário
 * estruturado. Nunca recalcula horário aqui — só lê o que já veio pronto.
 */
function isVenueOpenForFilter(
  venue: Venue,
  hoursStatusByVenueId: Record<string, VenueHoursStatus> | undefined,
): boolean {
  return hoursStatusByVenueId?.[venue.venueId]?.isOpen ?? venue.openNow;
}

function matchesFilters(
  venue: Venue,
  filters: VenueFilters,
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>,
): boolean {
  if (filters.city && normalize(venue.city) !== normalize(filters.city)) return false;
  if (filters.category && venue.category !== filters.category) return false;
  if (filters.priceRange && venue.priceRange !== filters.priceRange) return false;
  if (filters.openNowOnly && !isVenueOpenForFilter(venue, hoursStatusByVenueId)) return false;
  if (filters.liveMusicOnly && !venue.intentions.includes("musica-ao-vivo")) return false;
  return true;
}

/**
 * Filtra e ordena os estabelecimentos para a busca direta.
 *
 * Sem termo de busca, retorna os locais que passam nos filtros em ordem
 * alfabética. Com termo de busca, prioriza nome exato, depois nome
 * parcial, depois categoria/culinária/bairro/cidade, depois os demais
 * campos (tags, música, programação, ambiente, cardápio e descrição).
 */
export function searchVenues(
  query: string,
  filters: VenueFilters,
  candidateVenues: Venue[],
  /** venue.venueId -> status calculado no servidor a partir de venue_business_hours (ver venue-repository.ts). Opcional: sem isso, o filtro "Aberto agora" usa só venues.openNow, como antes. */
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>,
): Venue[] {
  const normalizedQuery = normalize(query);
  const filtered = candidateVenues.filter((venue) =>
    matchesFilters(venue, filters, hoursStatusByVenueId),
  );

  if (!normalizedQuery) {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  return filtered
    .map((venue) => ({ venue, score: scoreVenueForQuery(venue, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.venue.name.localeCompare(b.venue.name))
    .map((entry) => entry.venue);
}
