import type { PriceRange, Venue } from "@/data/venues";

/**
 * Busca direta determinística ("Já sei o que procuro").
 *
 * Não há IA nem correspondência aleatória: a mesma consulta e os mesmos
 * filtros sempre produzem o mesmo resultado, na mesma ordem.
 */

export interface VenueFilters {
  category: string | null;
  neighborhood: string | null;
  priceRange: PriceRange | null;
  openNowOnly: boolean;
  liveMusicOnly: boolean;
}

export const EMPTY_VENUE_FILTERS: VenueFilters = {
  category: null,
  neighborhood: null,
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

function matchesFilters(venue: Venue, filters: VenueFilters): boolean {
  if (filters.category && venue.category !== filters.category) return false;
  if (filters.neighborhood && venue.neighborhood !== filters.neighborhood) return false;
  if (filters.priceRange && venue.priceRange !== filters.priceRange) return false;
  if (filters.openNowOnly && !venue.openNow) return false;
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
): Venue[] {
  const normalizedQuery = normalize(query);
  const filtered = candidateVenues.filter((venue) => matchesFilters(venue, filters));

  if (!normalizedQuery) {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  return filtered
    .map((venue) => ({ venue, score: scoreVenueForQuery(venue, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.venue.name.localeCompare(b.venue.name))
    .map((entry) => entry.venue);
}
