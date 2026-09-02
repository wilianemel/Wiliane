import type { PriceRange, Venue } from "@/data/venues";
import { resolveVenueOpenNow, type VenueHoursStatus } from "@/lib/venues/venue-hours";
import { getCuisineDisplayLabel } from "@/lib/venues/venue-cuisine";

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

/**
 * Pratos/termos comuns que uma pessoa digita esperando encontrar uma
 * culinária específica, mas que não aparecem no texto da própria
 * culinária (ex.: quem procura "sushi" não vai encontrar a palavra
 * "japonesa" por substring). Lista curada, propositalmente pequena — cobre
 * os casos mais óbvios, não é um dicionário exaustivo de pratos do mundo.
 * Chaves e valores já normalizados (sem acento, minúsculo).
 */
const CUISINE_SEARCH_SYNONYMS: Record<string, string[]> = {
  sushi: ["japonesa"],
  sashimi: ["japonesa"],
  temaki: ["japonesa"],
  ramen: ["japonesa"],
};

/** Palavras curtas demais (artigos/preposições) nunca decidem sozinhas um match de culinária. */
const MIN_CUISINE_WORD_LENGTH = 3;

/**
 * Além do match de substring direto (frase inteira contida no texto de
 * culinária — cobre buscas de uma palavra só, ex. "japonesa"), também casa
 * palavra por palavra da busca (cobre frases como "comida chinesa" contra
 * a culinária "Chinesa") e por sinônimo curado (CUISINE_SEARCH_SYNONYMS,
 * cobre "sushi"/"ramen" contra "Japonesa").
 */
function cuisineMatchesQuery(cuisines: string, normalizedQuery: string): boolean {
  if (cuisines.includes(normalizedQuery)) return true;

  return normalizedQuery
    .split(" ")
    .filter((word) => word.length >= MIN_CUISINE_WORD_LENGTH)
    .some((word) => {
      if (cuisines.includes(word)) return true;
      return (CUISINE_SEARCH_SYNONYMS[word] ?? []).some((synonym) => cuisines.includes(synonym));
    });
}

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
  // getCuisineDisplayLabel troca o valor de "Outro" (custom:cuisine:...)
  // pelo texto digitado pelo dono — nunca o prefixo interno na busca.
  const cuisines = normalize(venue.cuisineTypes.map(getCuisineDisplayLabel).join(" "));
  const neighborhood = normalize(venue.neighborhood);
  const city = normalize(venue.city);

  if (
    category.includes(normalizedQuery) ||
    cuisineMatchesQuery(cuisines, normalizedQuery) ||
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

function matchesFilters(
  venue: Venue,
  filters: VenueFilters,
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>,
): boolean {
  if (filters.city && normalize(venue.city) !== normalize(filters.city)) return false;
  if (filters.category && venue.category !== filters.category) return false;
  if (filters.priceRange && venue.priceRange !== filters.priceRange) return false;
  if (filters.openNowOnly && !resolveVenueOpenNow(venue, hoursStatusByVenueId)) return false;
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
